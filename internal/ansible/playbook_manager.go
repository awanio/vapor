package ansible

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// PlaybookInfo represents information about a playbook
type PlaybookInfo struct {
	Name        string    `json:"name"`
	Path        string    `json:"path"`
	Description string    `json:"description"`
	Tags        []string  `json:"tags"`
	Source      string    `json:"source"` // "local", "git", "galaxy", "uploaded"
	Size        int64     `json:"size"`
	ModTime     time.Time `json:"modified_time"`
	IsValid     bool      `json:"is_valid"`
	Content     string    `json:"content,omitempty"` // Only when requested
}

// GitRepoRequest represents a request to sync playbooks from Git
type GitRepoRequest struct {
	URL        string `json:"url"`        // Git repository URL
	Branch     string `json:"branch"`     // Branch to checkout (default: main/master)
	Path       string `json:"path"`       // Path within repo to playbooks
	Token      string `json:"token"`      // Optional: GitHub/GitLab token for private repos
	SSHKey     string `json:"ssh_key"`    // Optional: SSH key for authentication
	AutoUpdate bool   `json:"auto_update"` // Auto-update on schedule
}

// GalaxyRequest represents a request to install from Ansible Galaxy
type GalaxyRequest struct {
	Name         string   `json:"name"`          // Role/collection name (e.g., "geerlingguy.nginx")
	Type         string   `json:"type"`          // "role" or "collection"
	Version      string   `json:"version"`       // Specific version (optional)
	Requirements string   `json:"requirements"`  // requirements.yml content
	Roles        []string `json:"roles"`         // List of roles to install
}

// PlaybookUploadRequest represents a playbook upload
type PlaybookUploadRequest struct {
	Name        string            `json:"name"`
	Content     string            `json:"content"`      // Base64 encoded if binary
	Description string            `json:"description"`
	Tags        []string          `json:"tags"`
	Variables   map[string]string `json:"variables"`    // Default variables
	IsBase64    bool              `json:"is_base64"`    // Whether content is base64 encoded
}

// PlaybookTemplate represents a playbook template
type PlaybookTemplate struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Category    string                 `json:"category"`
	Description string                 `json:"description"`
	Content     string                 `json:"content"`
	Variables   map[string]interface{} `json:"variables"`
	Tags        []string               `json:"tags"`
	Icon        string                 `json:"icon"`
}

// PlaybookManager handles playbook operations
type PlaybookManager struct {
	executor *Executor
}

// NewPlaybookManager creates a new playbook manager
func NewPlaybookManager(executor *Executor) *PlaybookManager {
	return &PlaybookManager{
		executor: executor,
	}
}

// ListPlaybooks returns all available playbooks
func (pm *PlaybookManager) ListPlaybooks() ([]*PlaybookInfo, error) {
	playbooks := []*PlaybookInfo{}
	
	// Read playbooks directory
	files, err := ioutil.ReadDir(pm.executor.playbookDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read playbooks directory: %w", err)
	}
	
	for _, file := range files {
		if file.IsDir() {
			// Handle directories (git repos, collections)
			subFiles, err := pm.listPlaybooksInDir(filepath.Join(pm.executor.playbookDir, file.Name()))
			if err == nil {
				playbooks = append(playbooks, subFiles...)
			}
		} else if strings.HasSuffix(file.Name(), ".yml") || strings.HasSuffix(file.Name(), ".yaml") {
			info := &PlaybookInfo{
				Name:    file.Name(),
				Path:    filepath.Join(pm.executor.playbookDir, file.Name()),
				Size:    file.Size(),
				ModTime: file.ModTime(),
				Source:  "local",
			}
			
			// Try to extract description from playbook
			if desc, tags := pm.extractPlaybookMetadata(info.Path); desc != "" || len(tags) > 0 {
				info.Description = desc
				info.Tags = tags
			}
			
			// Validate playbook syntax
			info.IsValid = pm.validatePlaybook(file.Name()) == nil
			
			playbooks = append(playbooks, info)
		}
	}
	
	return playbooks, nil
}

// GetPlaybook returns a specific playbook with content
func (pm *PlaybookManager) GetPlaybook(name string) (*PlaybookInfo, error) {
	playbookPath := filepath.Join(pm.executor.playbookDir, name)
	
	fileInfo, err := os.Stat(playbookPath)
	if err != nil {
		return nil, fmt.Errorf("playbook not found: %s", name)
	}
	
	content, err := ioutil.ReadFile(playbookPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read playbook: %w", err)
	}
	
	info := &PlaybookInfo{
		Name:    name,
		Path:    playbookPath,
		Size:    fileInfo.Size(),
		ModTime: fileInfo.ModTime(),
		Content: string(content),
		Source:  "local",
	}
	
	// Extract metadata
	if desc, tags := pm.extractPlaybookMetadata(playbookPath); desc != "" || len(tags) > 0 {
		info.Description = desc
		info.Tags = tags
	}
	
	// Validate
	info.IsValid = pm.validatePlaybook(name) == nil
	
	return info, nil
}

// UploadPlaybook uploads a new playbook
func (pm *PlaybookManager) UploadPlaybook(req *PlaybookUploadRequest) error {
	// Decode content if base64
	content := req.Content
	if req.IsBase64 {
		decoded, err := base64.StdEncoding.DecodeString(req.Content)
		if err != nil {
			return fmt.Errorf("failed to decode base64 content: %w", err)
		}
		content = string(decoded)
	}
	
	// Add metadata as comments if provided
	if req.Description != "" || len(req.Tags) > 0 {
		metadata := "---\n"
		metadata += fmt.Sprintf("# Description: %s\n", req.Description)
		if len(req.Tags) > 0 {
			metadata += fmt.Sprintf("# Tags: %s\n", strings.Join(req.Tags, ", "))
		}
		metadata += "# Source: uploaded\n"
		metadata += fmt.Sprintf("# Uploaded: %s\n", time.Now().Format(time.RFC3339))
		metadata += "\n"
		content = metadata + content
	}
	
	// Save playbook
	playbookPath := filepath.Join(pm.executor.playbookDir, req.Name)
	if err := ioutil.WriteFile(playbookPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to save playbook: %w", err)
	}
	
	// Validate the uploaded playbook
	if err := pm.validatePlaybook(req.Name); err != nil {
		// Remove invalid playbook
		os.Remove(playbookPath)
		return fmt.Errorf("playbook validation failed: %w", err)
	}
	
	return nil
}

// DeletePlaybook deletes a playbook
func (pm *PlaybookManager) DeletePlaybook(name string) error {
	playbookPath := filepath.Join(pm.executor.playbookDir, name)
	
	// Check if exists
	if _, err := os.Stat(playbookPath); err != nil {
		return fmt.Errorf("playbook not found: %s", name)
	}
	
	// Delete the file
	if err := os.Remove(playbookPath); err != nil {
		return fmt.Errorf("failed to delete playbook: %w", err)
	}
	
	return nil
}

// SyncFromGit syncs playbooks from a Git repository
func (pm *PlaybookManager) SyncFromGit(req *GitRepoRequest) error {
	// Create a subdirectory for the git repo
	repoName := pm.getRepoNameFromURL(req.URL)
	repoPath := filepath.Join(pm.executor.playbookDir, "git", repoName)
	
	// Check if repo already exists
	if _, err := os.Stat(filepath.Join(repoPath, ".git")); err == nil {
		// Pull latest changes
		cmd := exec.Command("git", "pull", "origin", req.Branch)
		cmd.Dir = repoPath
		
		if output, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("failed to pull git repository: %s", string(output))
		}
	} else {
		// Clone the repository
		os.MkdirAll(filepath.Dir(repoPath), 0755)
		
		args := []string{"clone"}
		
		// Add branch if specified
		if req.Branch != "" {
			args = append(args, "-b", req.Branch)
		}
		
		// Handle authentication
		cloneURL := req.URL
		if req.Token != "" && strings.Contains(req.URL, "github.com") {
			// Use token for GitHub
			cloneURL = strings.Replace(req.URL, "https://", fmt.Sprintf("https://%s@", req.Token), 1)
		}
		
		args = append(args, cloneURL, repoPath)
		
		cmd := exec.Command("git", args...)
		
		// Set up SSH key if provided
		if req.SSHKey != "" {
			// Write SSH key to temp file
			sshKeyFile, err := ioutil.TempFile("", "ssh-key-*")
			if err != nil {
				return fmt.Errorf("failed to create SSH key file: %w", err)
			}
			defer os.Remove(sshKeyFile.Name())
			
			if _, err := sshKeyFile.WriteString(req.SSHKey); err != nil {
				return fmt.Errorf("failed to write SSH key: %w", err)
			}
			sshKeyFile.Close()
			
			// Set GIT_SSH_COMMAND to use the key
			cmd.Env = append(os.Environ(), 
				fmt.Sprintf("GIT_SSH_COMMAND=ssh -i %s -o StrictHostKeyChecking=no", sshKeyFile.Name()))
		}
		
		if output, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("failed to clone git repository: %s", string(output))
		}
	}
	
	// Create symlinks for playbooks in the specified path
	if req.Path != "" {
		sourcePath := filepath.Join(repoPath, req.Path)
		if err := pm.createPlaybookSymlinks(sourcePath, pm.executor.playbookDir); err != nil {
			return fmt.Errorf("failed to create symlinks: %w", err)
		}
	}
	
	return nil
}

// InstallFromGalaxy installs roles/collections from Ansible Galaxy
func (pm *PlaybookManager) InstallFromGalaxy(req *GalaxyRequest) error {
	// Create Galaxy directory
	galaxyPath := filepath.Join(pm.executor.baseDir, "galaxy")
	os.MkdirAll(galaxyPath, 0755)
	
	if req.Requirements != "" {
		// Use requirements file
		reqFile := filepath.Join(galaxyPath, "requirements.yml")
		if err := ioutil.WriteFile(reqFile, []byte(req.Requirements), 0644); err != nil {
			return fmt.Errorf("failed to write requirements file: %w", err)
		}
		
		// Install from requirements
		cmd := exec.Command("ansible-galaxy", "install", "-r", reqFile, "-p", galaxyPath)
		if output, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("failed to install from requirements: %s", string(output))
		}
	} else if req.Name != "" {
		// Install specific role/collection
		installCmd := "role"
		if req.Type == "collection" {
			installCmd = "collection"
		}
		
		args := []string{installCmd, "install", req.Name}
		if req.Version != "" {
			args = append(args, fmt.Sprintf(":%s", req.Version))
		}
		args = append(args, "-p", galaxyPath)
		
		cmd := exec.Command("ansible-galaxy", args...)
		if output, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("failed to install from galaxy: %s", string(output))
		}
	} else if len(req.Roles) > 0 {
		// Install multiple roles
		for _, role := range req.Roles {
			cmd := exec.Command("ansible-galaxy", "role", "install", role, "-p", galaxyPath)
			if output, err := cmd.CombinedOutput(); err != nil {
				return fmt.Errorf("failed to install role %s: %s", role, string(output))
			}
		}
	}
	
	return nil
}

// GetTemplates returns available playbook templates
func (pm *PlaybookManager) GetTemplates() ([]*PlaybookTemplate, error) {
	templates := []*PlaybookTemplate{
		{
			ID:          "system-update",
			Name:        "System Update",
			Category:    "Maintenance",
			Description: "Update all packages on target systems",
			Icon:        "update",
			Tags:        []string{"update", "maintenance", "security"},
			Variables: map[string]interface{}{
				"reboot_if_required": false,
			},
		},
		{
			ID:          "docker-deploy",
			Name:        "Docker Application Deployment",
			Category:    "Deployment",
			Description: "Deploy containerized application using Docker",
			Icon:        "docker",
			Tags:        []string{"docker", "container", "deployment"},
			Variables: map[string]interface{}{
				"app_name":  "myapp",
				"app_image": "nginx:latest",
				"app_port":  8080,
			},
		},
		{
			ID:          "user-setup",
			Name:        "User Account Setup",
			Category:    "Security",
			Description: "Create user accounts with SSH keys",
			Icon:        "users",
			Tags:        []string{"users", "security", "ssh"},
			Variables: map[string]interface{}{
				"username": "newuser",
				"groups":   []string{"sudo"},
			},
		},
		{
			ID:          "backup-setup",
			Name:        "Backup Configuration",
			Category:    "Backup",
			Description: "Configure automated backups",
			Icon:        "backup",
			Tags:        []string{"backup", "disaster-recovery"},
			Variables: map[string]interface{}{
				"backup_path": "/backup",
				"retention_days": 30,
			},
		},
		{
			ID:          "monitoring-setup",
			Name:        "Monitoring Stack Setup",
			Category:    "Monitoring",
			Description: "Install Prometheus, Grafana, and exporters",
			Icon:        "monitoring",
			Tags:        []string{"monitoring", "prometheus", "grafana"},
			Variables: map[string]interface{}{
				"prometheus_port": 9090,
				"grafana_port": 3000,
			},
		},
		{
			ID:          "security-hardening",
			Name:        "Security Hardening",
			Category:    "Security",
			Description: "Apply security best practices",
			Icon:        "security",
			Tags:        []string{"security", "hardening", "compliance"},
			Variables: map[string]interface{}{
				"enable_firewall": true,
				"ssh_port": 22,
			},
		},
	}
	
	// Load actual template content from embedded files or generate
	for _, template := range templates {
		template.Content = pm.generateTemplateContent(template)
	}
	
	return templates, nil
}

// CreateFromTemplate creates a new playbook from a template
func (pm *PlaybookManager) CreateFromTemplate(templateID string, name string, variables map[string]interface{}) error {
	templates, err := pm.GetTemplates()
	if err != nil {
		return err
	}
	
	var template *PlaybookTemplate
	for _, t := range templates {
		if t.ID == templateID {
			template = t
			break
		}
	}
	
	if template == nil {
		return fmt.Errorf("template not found: %s", templateID)
	}
	
	// Merge variables
	for k, v := range variables {
		template.Variables[k] = v
	}
	
	// Generate playbook content with variables
	content := pm.renderTemplate(template.Content, template.Variables)
	
	// Save playbook
	playbookPath := filepath.Join(pm.executor.playbookDir, name)
	if err := ioutil.WriteFile(playbookPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to save playbook from template: %w", err)
	}
	
	return nil
}

// Helper functions

func (pm *PlaybookManager) listPlaybooksInDir(dir string) ([]*PlaybookInfo, error) {
	var playbooks []*PlaybookInfo
	
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip errors
		}
		
		if !info.IsDir() && (strings.HasSuffix(info.Name(), ".yml") || strings.HasSuffix(info.Name(), ".yaml")) {
			relPath, _ := filepath.Rel(pm.executor.playbookDir, path)
			playbook := &PlaybookInfo{
				Name:    relPath,
				Path:    path,
				Size:    info.Size(),
				ModTime: info.ModTime(),
				Source:  "git",
			}
			
			if desc, tags := pm.extractPlaybookMetadata(path); desc != "" || len(tags) > 0 {
				playbook.Description = desc
				playbook.Tags = tags
			}
			
			playbooks = append(playbooks, playbook)
		}
		
		return nil
	})
	
	return playbooks, err
}

func (pm *PlaybookManager) extractPlaybookMetadata(path string) (string, []string) {
	content, err := ioutil.ReadFile(path)
	if err != nil {
		return "", nil
	}
	
	lines := strings.Split(string(content), "\n")
	var description string
	var tags []string
	
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "# Description:") {
			description = strings.TrimSpace(strings.TrimPrefix(line, "# Description:"))
		} else if strings.HasPrefix(line, "# Tags:") {
			tagStr := strings.TrimSpace(strings.TrimPrefix(line, "# Tags:"))
			tags = strings.Split(tagStr, ",")
			for i := range tags {
				tags[i] = strings.TrimSpace(tags[i])
			}
		} else if strings.HasPrefix(line, "- name:") {
			// Try to use the first play name as description if no description found
			if description == "" {
				description = strings.TrimSpace(strings.TrimPrefix(line, "- name:"))
				description = strings.Trim(description, "\"'")
			}
			break // Stop after finding first play
		}
	}
	
	return description, tags
}

func (pm *PlaybookManager) validatePlaybook(name string) error {
	return pm.executor.ValidatePlaybook(name)
}

func (pm *PlaybookManager) getRepoNameFromURL(url string) string {
	// Extract repo name from URL
	parts := strings.Split(url, "/")
	repoName := parts[len(parts)-1]
	repoName = strings.TrimSuffix(repoName, ".git")
	return repoName
}

func (pm *PlaybookManager) createPlaybookSymlinks(sourceDir, targetDir string) error {
	return filepath.Walk(sourceDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		
		if !info.IsDir() && (strings.HasSuffix(info.Name(), ".yml") || strings.HasSuffix(info.Name(), ".yaml")) {
			relPath, _ := filepath.Rel(sourceDir, path)
			linkPath := filepath.Join(targetDir, "git_"+relPath)
			
			// Create parent directory if needed
			os.MkdirAll(filepath.Dir(linkPath), 0755)
			
			// Create symlink
			os.Symlink(path, linkPath)
		}
		
		return nil
	})
}

func (pm *PlaybookManager) generateTemplateContent(template *PlaybookTemplate) string {
	// Generate template content based on template ID
	// In production, these would be loaded from files or a database
	switch template.ID {
	case "system-update":
		return `---
- name: System Update
  hosts: all
  become: yes
  vars:
    reboot_if_required: {{ reboot_if_required }}
  tasks:
    - name: Update package cache (Debian/Ubuntu)
      apt:
        update_cache: yes
      when: ansible_os_family == "Debian"
    
    - name: Upgrade all packages (Debian/Ubuntu)
      apt:
        upgrade: dist
      when: ansible_os_family == "Debian"
    
    - name: Update all packages (RedHat/CentOS)
      yum:
        name: '*'
        state: latest
      when: ansible_os_family == "RedHat"`
		
	case "docker-deploy":
		return `---
- name: Docker Application Deployment
  hosts: all
  become: yes
  vars:
    app_name: "{{ app_name }}"
    app_image: "{{ app_image }}"
    app_port: {{ app_port }}
  tasks:
    - name: Pull Docker image
      docker_image:
        name: "{{ app_image }}"
        source: pull
    
    - name: Deploy container
      docker_container:
        name: "{{ app_name }}"
        image: "{{ app_image }}"
        ports:
          - "{{ app_port }}:80"
        state: started
        restart_policy: unless-stopped`
		
	default:
		return "---\n# Template: " + template.Name
	}
}

func (pm *PlaybookManager) renderTemplate(template string, variables map[string]interface{}) string {
	result := template
	for key, value := range variables {
		placeholder := fmt.Sprintf("{{ %s }}", key)
		result = strings.ReplaceAll(result, placeholder, fmt.Sprintf("%v", value))
	}
	return result
}

// DownloadFromURL downloads a playbook from a URL
func (pm *PlaybookManager) DownloadFromURL(url, name string) error {
	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("failed to download playbook: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to download playbook: status %d", resp.StatusCode)
	}
	
	content, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read playbook content: %w", err)
	}
	
	// Ensure it has .yml extension
	if !strings.HasSuffix(name, ".yml") && !strings.HasSuffix(name, ".yaml") {
		name += ".yml"
	}
	
	playbookPath := filepath.Join(pm.executor.playbookDir, name)
	if err := ioutil.WriteFile(playbookPath, content, 0644); err != nil {
		return fmt.Errorf("failed to save downloaded playbook: %w", err)
	}
	
	// Validate
	if err := pm.validatePlaybook(name); err != nil {
		os.Remove(playbookPath)
		return fmt.Errorf("downloaded playbook is invalid: %w", err)
	}
	
	return nil
}

// ExportPlaybook exports a playbook as JSON/YAML
func (pm *PlaybookManager) ExportPlaybook(name string) ([]byte, error) {
	playbook, err := pm.GetPlaybook(name)
	if err != nil {
		return nil, err
	}
	
	// Return as JSON with metadata
	return json.MarshalIndent(playbook, "", "  ")
}
