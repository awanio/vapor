package ansible

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

// PlaybookRequest represents a playbook execution request
type PlaybookRequest struct {
	Playbook    string                 `json:"playbook"`
	Inventory   string                 `json:"inventory"`
	Limit       string                 `json:"limit,omitempty"`
	Tags        []string               `json:"tags,omitempty"`
	SkipTags    []string               `json:"skip_tags,omitempty"`
	ExtraVars   map[string]interface{} `json:"extra_vars,omitempty"`
	Become      bool                   `json:"become,omitempty"`
	BecomeUser  string                 `json:"become_user,omitempty"`
	Forks       int                    `json:"forks,omitempty"`
	Verbosity   int                    `json:"verbosity,omitempty"`
	Check       bool                   `json:"check,omitempty"`
	Diff        bool                   `json:"diff,omitempty"`
	VaultPass   string                 `json:"vault_pass,omitempty"`
	PrivateKey  string                 `json:"private_key,omitempty"`
	Timeout     int                    `json:"timeout,omitempty"`
	CallbackURL string                 `json:"callback_url,omitempty"`
}

// AdHocRequest represents an ad-hoc command request
type AdHocRequest struct {
	Hosts      string                 `json:"hosts"`
	Module     string                 `json:"module"`
	Args       string                 `json:"args,omitempty"`
	Inventory  string                 `json:"inventory"`
	ExtraVars  map[string]interface{} `json:"extra_vars,omitempty"`
	Become     bool                   `json:"become,omitempty"`
	BecomeUser string                 `json:"become_user,omitempty"`
	Forks      int                    `json:"forks,omitempty"`
	Timeout    int                    `json:"timeout,omitempty"`
}

// ExecutionResult represents the result of an Ansible execution
type ExecutionResult struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"` // "playbook" or "adhoc"
	Status      string                 `json:"status"`
	StartTime   time.Time              `json:"start_time"`
	EndTime     *time.Time             `json:"end_time,omitempty"`
	Duration    float64                `json:"duration,omitempty"`
	Output      []string               `json:"output"`
	ExitCode    int                    `json:"exit_code"`
	Stats       map[string]interface{} `json:"stats,omitempty"`
	Changed     bool                   `json:"changed"`
	Unreachable []string               `json:"unreachable,omitempty"`
	Failed      []string               `json:"failed,omitempty"`
}

// InventoryHost represents a host in the dynamic inventory
type InventoryHost struct {
	Hostname  string                 `json:"hostname"`
	IP        string                 `json:"ansible_host"`
	Port      int                    `json:"ansible_port,omitempty"`
	User      string                 `json:"ansible_user,omitempty"`
	Variables map[string]interface{} `json:"vars,omitempty"`
	Groups    []string               `json:"groups,omitempty"`
}

// InventoryGroup represents a group in the inventory
type InventoryGroup struct {
	Hosts []string               `json:"hosts"`
	Vars  map[string]interface{} `json:"vars,omitempty"`
}

// DynamicInventory represents the structure for Ansible dynamic inventory
type DynamicInventory struct {
	All struct {
		Hosts    []string               `json:"hosts"`
		Vars     map[string]interface{} `json:"vars,omitempty"`
		Children []string               `json:"children,omitempty"`
	} `json:"all"`
	Meta struct {
		HostVars map[string]map[string]interface{} `json:"hostvars"`
	} `json:"_meta"`
	Groups map[string]InventoryGroup `json:"-"`
}

// Executor handles Ansible operations
type Executor struct {
	baseDir       string
	playbookDir   string
	inventoryDir  string
	logDir        string
	vaultPassFile string
	store         *ExecutionStore
	mu            sync.RWMutex
	outputStreams map[string]chan string
	results       map[string]*ExecutionResult
	cancelFuncs   map[string]context.CancelFunc
}

// NewExecutor creates a new Ansible executor
// ansibleDir is the directory for Ansible files (playbooks, inventory, logs)
func NewExecutor(ansibleDir string) (*Executor, error) {
	e := &Executor{
		baseDir:       ansibleDir,
		playbookDir:   filepath.Join(ansibleDir, "playbooks"),
		inventoryDir:  filepath.Join(ansibleDir, "inventory"),
		logDir:        filepath.Join(ansibleDir, "logs"),
		outputStreams: make(map[string]chan string),
		results:       make(map[string]*ExecutionResult),
		cancelFuncs:   make(map[string]context.CancelFunc),
	}

	// Create necessary directories
	dirs := []string{e.playbookDir, e.inventoryDir, e.logDir}
	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create directory %s: %w", dir, err)
		}
	}

	return e, nil
}

// SetStore sets the execution store for the executor
func (e *Executor) SetStore(store *ExecutionStore) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.store = store
}

// RunPlaybook executes an Ansible playbook
func (e *Executor) RunPlaybook(ctx context.Context, req *PlaybookRequest) (*ExecutionResult, error) {
	execID := uuid.New().String()
	result := &ExecutionResult{
		ID:        execID,
		Type:      "playbook",
		Status:    "running",
		StartTime: time.Now(),
		Output:    []string{},
	}

	// Save initial execution to store
	if err := e.store.SaveExecution(result, req); err != nil {
		return nil, fmt.Errorf("failed to save execution: %w", err)
	}

	e.mu.Lock()
	outputChan := make(chan string, 100)
	e.outputStreams[execID] = outputChan
	e.mu.Unlock()

	// Build ansible-playbook command
	args := []string{}
	
	// Add playbook path
	playbookPath := filepath.Join(e.playbookDir, req.Playbook)
	if _, err := os.Stat(playbookPath); err != nil {
		return nil, fmt.Errorf("playbook not found: %s", req.Playbook)
	}
	args = append(args, playbookPath)

	// Add inventory
	if req.Inventory != "" {
		args = append(args, "-i", filepath.Join(e.inventoryDir, req.Inventory))
	}

	// Add limit
	if req.Limit != "" {
		args = append(args, "--limit", req.Limit)
	}

	// Add tags
	if len(req.Tags) > 0 {
		args = append(args, "--tags", strings.Join(req.Tags, ","))
	}

	// Add skip tags
	if len(req.SkipTags) > 0 {
		args = append(args, "--skip-tags", strings.Join(req.SkipTags, ","))
	}

	// Add extra vars
	if len(req.ExtraVars) > 0 {
		varsJSON, err := json.Marshal(req.ExtraVars)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal extra vars: %w", err)
		}
		args = append(args, "--extra-vars", string(varsJSON))
	}

	// Add become options
	if req.Become {
		args = append(args, "--become")
		if req.BecomeUser != "" {
			args = append(args, "--become-user", req.BecomeUser)
		}
	}

	// Add forks
	if req.Forks > 0 {
		args = append(args, "--forks", fmt.Sprintf("%d", req.Forks))
	}

	// Add verbosity
	if req.Verbosity > 0 {
		verbosity := strings.Repeat("v", req.Verbosity)
		args = append(args, fmt.Sprintf("-%s", verbosity))
	}

	// Add check mode
	if req.Check {
		args = append(args, "--check")
	}

	// Add diff mode
	if req.Diff {
		args = append(args, "--diff")
	}

	// Add vault password file
	if req.VaultPass != "" {
		vaultFile, err := e.createTempVaultPass(req.VaultPass)
		if err != nil {
			return nil, fmt.Errorf("failed to create vault password file: %w", err)
		}
		defer os.Remove(vaultFile)
		args = append(args, "--vault-password-file", vaultFile)
	}

	// Add private key
	if req.PrivateKey != "" {
		args = append(args, "--private-key", req.PrivateKey)
	}

	// Execute in goroutine
	go e.executeCommand(ctx, "ansible-playbook", args, result, outputChan, req.Timeout)

	return result, nil
}

// RunAdHoc executes an Ansible ad-hoc command
func (e *Executor) RunAdHoc(ctx context.Context, req *AdHocRequest) (*ExecutionResult, error) {
	execID := uuid.New().String()
	result := &ExecutionResult{
		ID:        execID,
		Type:      "adhoc",
		Status:    "running",
		StartTime: time.Now(),
		Output:    []string{},
	}

	// Save initial execution to store
	adhocReq := &PlaybookRequest{
		Inventory:  req.Inventory,
		ExtraVars:  req.ExtraVars,
		Become:     req.Become,
		BecomeUser: req.BecomeUser,
		Forks:      req.Forks,
		Timeout:    req.Timeout,
	}
	if err := e.store.SaveExecution(result, adhocReq); err != nil {
		return nil, fmt.Errorf("failed to save execution: %w", err)
	}

	e.mu.Lock()
	outputChan := make(chan string, 100)
	e.outputStreams[execID] = outputChan
	e.mu.Unlock()

	// Build ansible command
	args := []string{req.Hosts}

	// Add inventory
	if req.Inventory != "" {
		args = append(args, "-i", filepath.Join(e.inventoryDir, req.Inventory))
	}

	// Add module
	args = append(args, "-m", req.Module)

	// Add module arguments
	if req.Args != "" {
		args = append(args, "-a", req.Args)
	}

	// Add extra vars
	if len(req.ExtraVars) > 0 {
		varsJSON, err := json.Marshal(req.ExtraVars)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal extra vars: %w", err)
		}
		args = append(args, "--extra-vars", string(varsJSON))
	}

	// Add become options
	if req.Become {
		args = append(args, "--become")
		if req.BecomeUser != "" {
			args = append(args, "--become-user", req.BecomeUser)
		}
	}

	// Add forks
	if req.Forks > 0 {
		args = append(args, "--forks", fmt.Sprintf("%d", req.Forks))
	}

	// Execute in goroutine
	go e.executeCommand(ctx, "ansible", args, result, outputChan, req.Timeout)

	return result, nil
}

// executeCommand runs the actual Ansible command
func (e *Executor) executeCommand(ctx context.Context, command string, args []string, result *ExecutionResult, outputChan chan string, timeout int) {
	defer close(outputChan)

	// Set timeout
	if timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, time.Duration(timeout)*time.Second)
		defer cancel()
	}

	// Create command
	cmd := exec.CommandContext(ctx, command, args...)
	
	// Set environment variables
	cmd.Env = append(os.Environ(),
		"ANSIBLE_HOST_KEY_CHECKING=False",
		"ANSIBLE_RETRY_FILES_ENABLED=False",
		fmt.Sprintf("ANSIBLE_LOG_PATH=%s/%s.log", e.logDir, result.ID),
	)

	// Create pipes for stdout and stderr
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		result.Status = "failed"
		result.Output = append(result.Output, fmt.Sprintf("Error creating stdout pipe: %v", err))
		return
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		result.Status = "failed"
		result.Output = append(result.Output, fmt.Sprintf("Error creating stderr pipe: %v", err))
		return
	}

	// Start command
	if err := cmd.Start(); err != nil {
		result.Status = "failed"
		result.Output = append(result.Output, fmt.Sprintf("Error starting command: %v", err))
		return
	}

	// Read output
	var wg sync.WaitGroup
	wg.Add(2)

	// Read stdout
	go func() {
		defer wg.Done()
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			line := scanner.Text()
			result.Output = append(result.Output, line)
			outputChan <- line
		}
	}()

	// Read stderr
	go func() {
		defer wg.Done()
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			line := scanner.Text()
			result.Output = append(result.Output, line)
			outputChan <- line
		}
	}()

	// Wait for output to be read
	wg.Wait()

	// Wait for command to finish
	err = cmd.Wait()
	
	endTime := time.Now()
	result.EndTime = &endTime
	result.Duration = endTime.Sub(result.StartTime).Seconds()

	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitError.ExitCode()
		} else {
			result.ExitCode = -1
		}
		result.Status = "failed"
	} else {
		result.ExitCode = 0
		result.Status = "success"
	}

	// Parse output for statistics if playbook
	if result.Type == "playbook" {
		e.parsePlaybookStats(result)
	}

	// Update final execution status in store
	if err := e.store.SaveExecution(result, nil); err != nil {
		// Log error but don't fail the execution
		fmt.Printf("Failed to update execution in store: %v\n", err)
	}

	// Clean up output stream after a delay
	go func() {
		time.Sleep(5 * time.Minute)
		e.mu.Lock()
		delete(e.outputStreams, result.ID)
		e.mu.Unlock()
	}()
}

// parsePlaybookStats extracts statistics from playbook output
func (e *Executor) parsePlaybookStats(result *ExecutionResult) {
	stats := make(map[string]interface{})
	
	for _, line := range result.Output {
		// Look for PLAY RECAP
		if strings.Contains(line, "ok=") && strings.Contains(line, "changed=") {
			parts := strings.Fields(line)
			if len(parts) > 0 {
				host := strings.TrimSuffix(parts[0], ":")
				hostStats := make(map[string]int)
				
				for _, part := range parts[1:] {
					if strings.Contains(part, "=") {
						kv := strings.Split(part, "=")
						if len(kv) == 2 {
							var value int
							fmt.Sscanf(kv[1], "%d", &value)
							hostStats[kv[0]] = value
							
							if kv[0] == "changed" && value > 0 {
								result.Changed = true
							}
							if kv[0] == "unreachable" && value > 0 {
								result.Unreachable = append(result.Unreachable, host)
							}
							if kv[0] == "failed" && value > 0 {
								result.Failed = append(result.Failed, host)
							}
						}
					}
				}
				stats[host] = hostStats
			}
		}
	}
	
	if len(stats) > 0 {
		result.Stats = stats
	}
}

// GetExecution retrieves an execution result by ID
func (e *Executor) GetExecution(id string) (*ExecutionResult, bool) {
	// Try to get from store
	result, err := e.store.GetExecution(id)
	if err != nil || result == nil {
		return nil, false
	}
	return result, true
}

// GetOutputStream gets the output stream for an execution
func (e *Executor) GetOutputStream(id string) (chan string, bool) {
	e.mu.RLock()
	defer e.mu.RUnlock()
	
	stream, ok := e.outputStreams[id]
	return stream, ok
}

// ListExecutions returns all execution results
func (e *Executor) ListExecutions() []*ExecutionResult {
	// Get from store with default filters
	filters := ExecutionFilters{
		Limit: 100, // Default to last 100 executions
	}
	results, err := e.store.ListExecutions(filters)
	if err != nil {
		// Log error and return empty list
		fmt.Printf("Failed to list executions from store: %v\n", err)
		return []*ExecutionResult{}
	}
	return results
}

// GenerateDynamicInventory creates a dynamic inventory from current system state
func (e *Executor) GenerateDynamicInventory(hosts []InventoryHost) (*DynamicInventory, error) {
	inventory := &DynamicInventory{
		Groups: make(map[string]InventoryGroup),
	}
	
	inventory.Meta.HostVars = make(map[string]map[string]interface{})
	inventory.All.Hosts = []string{}
	inventory.All.Vars = map[string]interface{}{
		"ansible_python_interpreter": "/usr/bin/python3",
	}
	
	// Process hosts
	for _, host := range hosts {
		// Add to all hosts
		inventory.All.Hosts = append(inventory.All.Hosts, host.Hostname)
		
		// Add host variables
		hostVars := make(map[string]interface{})
		hostVars["ansible_host"] = host.IP
		if host.Port > 0 {
			hostVars["ansible_port"] = host.Port
		}
		if host.User != "" {
			hostVars["ansible_user"] = host.User
		}
		for k, v := range host.Variables {
			hostVars[k] = v
		}
		inventory.Meta.HostVars[host.Hostname] = hostVars
		
		// Add to groups
		for _, group := range host.Groups {
			if g, exists := inventory.Groups[group]; exists {
				g.Hosts = append(g.Hosts, host.Hostname)
				inventory.Groups[group] = g
			} else {
				inventory.Groups[group] = InventoryGroup{
					Hosts: []string{host.Hostname},
					Vars:  make(map[string]interface{}),
				}
			}
		}
	}
	
	// Add groups as children
	inventory.All.Children = make([]string, 0, len(inventory.Groups))
	for group := range inventory.Groups {
		inventory.All.Children = append(inventory.All.Children, group)
	}
	
	return inventory, nil
}

// SaveInventory saves a dynamic inventory to a file
func (e *Executor) SaveInventory(name string, inventory *DynamicInventory) error {
	inventoryPath := filepath.Join(e.inventoryDir, name+".json")
	
	data, err := json.MarshalIndent(inventory, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal inventory: %w", err)
	}
	
	if err := os.WriteFile(inventoryPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write inventory file: %w", err)
	}
	
	// Make it executable for dynamic inventory
	if err := os.Chmod(inventoryPath, 0755); err != nil {
		return fmt.Errorf("failed to chmod inventory file: %w", err)
	}
	
	return nil
}

// SavePlaybook saves a playbook content to a file
func (e *Executor) SavePlaybook(name string, content string) error {
	playbookPath := filepath.Join(e.playbookDir, name)
	
	if err := os.WriteFile(playbookPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to write playbook file: %w", err)
	}
	
	return nil
}

// ValidatePlaybook validates a playbook syntax
func (e *Executor) ValidatePlaybook(name string) error {
	playbookPath := filepath.Join(e.playbookDir, name)
	
	cmd := exec.Command("ansible-playbook", "--syntax-check", playbookPath)
	output, err := cmd.CombinedOutput()
	
	if err != nil {
		return fmt.Errorf("playbook validation failed: %s", string(output))
	}
	
	return nil
}

// createTempVaultPass creates a temporary vault password file
func (e *Executor) createTempVaultPass(password string) (string, error) {
	tmpFile, err := os.CreateTemp("", "vault-pass-*")
	if err != nil {
		return "", err
	}
	
	if _, err := tmpFile.WriteString(password); err != nil {
		tmpFile.Close()
		os.Remove(tmpFile.Name())
		return "", err
	}
	
	tmpFile.Close()
	return tmpFile.Name(), nil
}

// StreamOutput streams execution output via WebSocket or SSE
func (e *Executor) StreamOutput(id string, writer io.Writer) error {
	outputChan, ok := e.GetOutputStream(id)
	if !ok {
		return fmt.Errorf("execution %s not found or stream closed", id)
	}
	
	for line := range outputChan {
		if _, err := fmt.Fprintf(writer, "%s\n", line); err != nil {
			return err
		}
		
		// Flush if the writer supports it
		if flusher, ok := writer.(interface{ Flush() }); ok {
			flusher.Flush()
		}
	}
	
	return nil
}

// Close closes the executor's resources
func (e *Executor) Close() error {
	e.mu.Lock()
	defer e.mu.Unlock()
	
	// Close all output streams
	for _, stream := range e.outputStreams {
		close(stream)
	}
	
	// Note: We don't close the store here as it uses a shared database connection
	return nil
}

// CancelExecution cancels a running execution
func (e *Executor) CancelExecution(id string) error {
e.mu.Lock()
defer e.mu.Unlock()

if cancel, exists := e.cancelFuncs[id]; exists {
cancel()
delete(e.cancelFuncs, id)

// Update execution status
if result, ok := e.results[id]; ok {
result.Status = "cancelled"
now := time.Now()
result.EndTime = &now
result.Duration = now.Sub(result.StartTime).Seconds()
}

return nil
}

return fmt.Errorf("execution not found")
}

// GetInventory retrieves a saved inventory by name
func (e *Executor) GetInventory(name string) (*DynamicInventory, error) {
inventoryPath := filepath.Join(e.inventoryDir, name+".json")

data, err := os.ReadFile(inventoryPath)
if err != nil {
return nil, err
}

var inventory DynamicInventory
if err := json.Unmarshal(data, &inventory); err != nil {
return nil, fmt.Errorf("failed to parse inventory: %w", err)
}

return &inventory, nil
}

// StoreExecution stores an execution result
func (e *Executor) StoreExecution(result *ExecutionResult) {
e.mu.Lock()
defer e.mu.Unlock()

e.results[result.ID] = result

// Also store in the persistent store if available
if e.store != nil {
e.store.StoreExecution(result)
}
}
