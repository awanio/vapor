package ansible

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
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
	URL        string `json:"url"`         // Git repository URL
	Branch     string `json:"branch"`      // Branch to checkout (default: main/master)
	Path       string `json:"path"`        // Path within repo to playbooks
	Token      string `json:"token"`       // Optional: GitHub/GitLab token for private repos
	SSHKey     string `json:"ssh_key"`     // Optional: SSH key for authentication
	AutoUpdate bool   `json:"auto_update"` // Auto-update on schedule
}

// GalaxyRequest represents a request to install from Ansible Galaxy
type GalaxyRequest struct {
	Name         string   `json:"name"`         // Role/collection name (e.g., "geerlingguy.nginx")
	Type         string   `json:"type"`         // "role" or "collection"
	Version      string   `json:"version"`      // Specific version (optional)
	Requirements string   `json:"requirements"` // requirements.yml content
	Roles        []string `json:"roles"`        // List of roles to install
}

// PlaybookUploadRequest represents a playbook upload
type PlaybookUploadRequest struct {
	Name        string            `json:"name"`
	Content     string            `json:"content"` // Base64 encoded if binary
	Description string            `json:"description"`
	Tags        []string          `json:"tags"`
	Variables   map[string]string `json:"variables"` // Default variables
	IsBase64    bool              `json:"is_base64"` // Whether content is base64 encoded
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

	// Ensure playbook directory exists
	if err := os.MkdirAll(pm.executor.playbookDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create playbooks directory: %w", err)
	}

	// Read playbooks directory
	entries, err := os.ReadDir(pm.executor.playbookDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read playbooks directory: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			// Handle directories (git repos, collections)
			subFiles, err := pm.listPlaybooksInDir(filepath.Join(pm.executor.playbookDir, entry.Name()))
			if err == nil {
				playbooks = append(playbooks, subFiles...)
			}
		} else if strings.HasSuffix(entry.Name(), ".yml") || strings.HasSuffix(entry.Name(), ".yaml") {
			fileInfo, _ := entry.Info()
			info := &PlaybookInfo{
				Name:    entry.Name(),
				Path:    filepath.Join(pm.executor.playbookDir, entry.Name()),
				Size:    fileInfo.Size(),
				ModTime: fileInfo.ModTime(),
				Source:  "local",
			}

			// Try to extract description from playbook
			if desc, tags := pm.extractPlaybookMetadata(info.Path); desc != "" || len(tags) > 0 {
				info.Description = desc
				info.Tags = tags
			}

			// Validate playbook syntax
			info.IsValid = pm.validatePlaybook(entry.Name()) == nil

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

	content, err := os.ReadFile(playbookPath)
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
	// Ensure playbook directory exists
	if err := os.MkdirAll(pm.executor.playbookDir, 0755); err != nil {
		return fmt.Errorf("failed to create playbooks directory: %w", err)
	}

	// Decode content if base64
	content := req.Content
	if req.IsBase64 {
		decoded, err := base64.StdEncoding.DecodeString(content)
		if err != nil {
			return fmt.Errorf("failed to decode base64 content: %w", err)
		}
		content = string(decoded)
	}

	// Save playbook
	playbookPath := filepath.Join(pm.executor.playbookDir, req.Name)
	if err := os.WriteFile(playbookPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to save playbook: %w", err)
	}

	// Save metadata if provided
	if req.Description != "" || len(req.Tags) > 0 || len(req.Variables) > 0 {
		metadata := map[string]interface{}{
			"description": req.Description,
			"tags":        req.Tags,
			"variables":   req.Variables,
			"uploaded_at": time.Now(),
		}

		metadataPath := playbookPath + ".meta.json"
		metadataBytes, _ := json.MarshalIndent(metadata, "", "  ")
		os.WriteFile(metadataPath, metadataBytes, 0644)
	}

	return nil
}

// DeletePlaybook deletes a playbook
func (pm *PlaybookManager) DeletePlaybook(name string) error {
	playbookPath := filepath.Join(pm.executor.playbookDir, name)

	// Check if playbook exists
	if _, err := os.Stat(playbookPath); err != nil {
		return err
	}

	// Delete playbook
	if err := os.Remove(playbookPath); err != nil {
		return fmt.Errorf("failed to delete playbook: %w", err)
	}

	// Delete metadata if exists
	metadataPath := playbookPath + ".meta.json"
	os.Remove(metadataPath)

	return nil
}

// GetTemplates returns available templates
func (pm *PlaybookManager) GetTemplates() ([]*PlaybookTemplate, error) {
	templates := []*PlaybookTemplate{
		{
			ID:          "system-update",
			Name:        "System Update",
			Category:    "maintenance",
			Description: "Update system packages",
			Content:     systemUpdateTemplate,
			Variables: map[string]interface{}{
				"update_cache": true,
				"upgrade":      "safe",
			},
			Tags: []string{"system", "update", "maintenance"},
			Icon: "system-update",
		},
		{
			ID:          "docker-deploy",
			Name:        "Docker Application Deploy",
			Category:    "deployment",
			Description: "Deploy Docker container application",
			Content:     dockerDeployTemplate,
			Variables: map[string]interface{}{
				"app_name": "myapp",
				"image":    "nginx:latest",
				"port":     80,
				"env_vars": map[string]string{},
			},
			Tags: []string{"docker", "deploy", "container"},
			Icon: "docker",
		},
		{
			ID:          "user-management",
			Name:        "User Management",
			Category:    "security",
			Description: "Create and manage system users",
			Content:     userManagementTemplate,
			Variables: map[string]interface{}{
				"username": "newuser",
				"groups":   []string{"sudo"},
				"shell":    "/bin/bash",
			},
			Tags: []string{"user", "security", "management"},
			Icon: "users",
		},
	}

	return templates, nil
}

// CreateFromTemplate creates a playbook from a template
func (pm *PlaybookManager) CreateFromTemplate(templateID, name string, variables map[string]interface{}) error {
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

	// TODO: Apply variables to template content
	// For now, just save the template content as-is

	playbookPath := filepath.Join(pm.executor.playbookDir, name)
	if err := os.WriteFile(playbookPath, []byte(template.Content), 0644); err != nil {
		return fmt.Errorf("failed to save playbook: %w", err)
	}

	return nil
}

// SyncFromGit syncs playbooks from a Git repository
func (pm *PlaybookManager) SyncFromGit(req *GitRepoRequest) error {
	// Create a temporary directory for cloning
	tempDir := filepath.Join("/tmp", fmt.Sprintf("ansible-git-%d", time.Now().Unix()))
	defer os.RemoveAll(tempDir)

	// Clone the repository
	cmd := exec.Command("git", "clone")

	if req.Branch != "" {
		cmd.Args = append(cmd.Args, "-b", req.Branch)
	}

	cmd.Args = append(cmd.Args, req.URL, tempDir)

	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to clone repository: %s", output)
	}

	// Copy playbooks to the playbook directory
	sourceDir := tempDir
	if req.Path != "" {
		sourceDir = filepath.Join(tempDir, req.Path)
	}

	// Create git subdirectory
	repoName := filepath.Base(strings.TrimSuffix(req.URL, ".git"))
	targetDir := filepath.Join(pm.executor.playbookDir, "git", repoName)

	if err := os.MkdirAll(filepath.Dir(targetDir), 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	// Copy files
	if err := copyDir(sourceDir, targetDir); err != nil {
		return fmt.Errorf("failed to copy playbooks: %w", err)
	}

	return nil
}

// InstallFromGalaxy installs roles/collections from Ansible Galaxy
func (pm *PlaybookManager) InstallFromGalaxy(req *GalaxyRequest) error {
	// Handle requirements file
	if req.Requirements != "" {
		reqFile := filepath.Join("/tmp", fmt.Sprintf("requirements-%d.yml", time.Now().Unix()))
		defer os.Remove(reqFile)

		if err := os.WriteFile(reqFile, []byte(req.Requirements), 0644); err != nil {
			return fmt.Errorf("failed to write requirements file: %w", err)
		}

		cmd := exec.Command("ansible-galaxy", "install", "-r", reqFile)
		if output, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("failed to install from requirements: %s", output)
		}

		return nil
	}

	// Handle individual roles
	if len(req.Roles) > 0 {
		for _, role := range req.Roles {
			cmd := exec.Command("ansible-galaxy", "role", "install", role)
			if output, err := cmd.CombinedOutput(); err != nil {
				return fmt.Errorf("failed to install role %s: %s", role, output)
			}
		}
		return nil
	}

	// Handle single role/collection
	if req.Name != "" {
		cmdType := "role"
		if req.Type == "collection" {
			cmdType = "collection"
		}

		args := []string{cmdType, "install", req.Name}
		if req.Version != "" {
			args = append(args, "--force", fmt.Sprintf("%s:%s", req.Name, req.Version))
		}

		cmd := exec.Command("ansible-galaxy", args...)
		if output, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("failed to install %s: %s", req.Name, output)
		}
	}

	return nil
}

// DownloadFromURL downloads a playbook from a URL
func (pm *PlaybookManager) DownloadFromURL(url, name string) error {
	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("failed to download: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download failed with status: %d", resp.StatusCode)
	}

	content, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	playbookPath := filepath.Join(pm.executor.playbookDir, name)
	if err := os.WriteFile(playbookPath, content, 0644); err != nil {
		return fmt.Errorf("failed to save playbook: %w", err)
	}

	return nil
}

// Helper functions

func (pm *PlaybookManager) listPlaybooksInDir(dir string) ([]*PlaybookInfo, error) {
	var playbooks []*PlaybookInfo

	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	for _, entry := range entries {
		if !entry.IsDir() && (strings.HasSuffix(entry.Name(), ".yml") || strings.HasSuffix(entry.Name(), ".yaml")) {
			fileInfo, _ := entry.Info()
			info := &PlaybookInfo{
				Name:    filepath.Join(filepath.Base(dir), entry.Name()),
				Path:    filepath.Join(dir, entry.Name()),
				Size:    fileInfo.Size(),
				ModTime: fileInfo.ModTime(),
				Source:  "git",
			}
			playbooks = append(playbooks, info)
		}
	}

	return playbooks, nil
}

func (pm *PlaybookManager) extractPlaybookMetadata(path string) (string, []string) {
	// Try to read metadata file first
	metadataPath := path + ".meta.json"
	if data, err := os.ReadFile(metadataPath); err == nil {
		var metadata map[string]interface{}
		if json.Unmarshal(data, &metadata) == nil {
			desc, _ := metadata["description"].(string)
			var tags []string
			if t, ok := metadata["tags"].([]interface{}); ok {
				for _, tag := range t {
					if s, ok := tag.(string); ok {
						tags = append(tags, s)
					}
				}
			}
			return desc, tags
		}
	}

	// TODO: Parse YAML file and extract description from comments

	return "", nil
}

func (pm *PlaybookManager) validatePlaybook(name string) error {
	playbookPath := filepath.Join(pm.executor.playbookDir, name)
	cmd := exec.Command("ansible-playbook", "--syntax-check", playbookPath)
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("validation failed: %s", output)
	}
	return nil
}

func copyDir(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}

		dstPath := filepath.Join(dst, relPath)

		if info.IsDir() {
			return os.MkdirAll(dstPath, info.Mode())
		}

		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}

		return os.WriteFile(dstPath, data, info.Mode())
	})
}

// Template contents
const systemUpdateTemplate = `---
- name: System Update Playbook
  hosts: "{{ target_hosts | default('all') }}"
  become: yes
  vars:
    update_cache: "{{ update_cache | default(true) }}"
    upgrade: "{{ upgrade | default('safe') }}"
  
  tasks:
    - name: Update apt cache
      apt:
        update_cache: "{{ update_cache }}"
        cache_valid_time: 3600
      when: ansible_os_family == "Debian"
    
    - name: Upgrade packages
      apt:
        upgrade: "{{ upgrade }}"
      when: ansible_os_family == "Debian"
    
    - name: Update yum cache
      yum:
        update_cache: "{{ update_cache }}"
      when: ansible_os_family == "RedHat"
    
    - name: Upgrade packages (RedHat)
      yum:
        name: '*'
        state: latest
      when: ansible_os_family == "RedHat" and upgrade != 'no'
`

const dockerDeployTemplate = `---
- name: Deploy Docker Application
  hosts: "{{ target_hosts | default('localhost') }}"
  become: yes
  vars:
    app_name: "{{ app_name }}"
    image: "{{ image }}"
    port: "{{ port | default(80) }}"
    env_vars: "{{ env_vars | default({}) }}"
  
  tasks:
    - name: Ensure Docker is installed
      package:
        name: docker.io
        state: present
    
    - name: Start Docker service
      service:
        name: docker
        state: started
        enabled: yes
    
    - name: Pull Docker image
      docker_image:
        name: "{{ image }}"
        source: pull
    
    - name: Run Docker container
      docker_container:
        name: "{{ app_name }}"
        image: "{{ image }}"
        state: started
        restart_policy: always
        ports:
          - "{{ port }}:{{ port }}"
        env: "{{ env_vars }}"
`

const userManagementTemplate = `---
- name: User Management Playbook
  hosts: "{{ target_hosts | default('all') }}"
  become: yes
  vars:
    username: "{{ username }}"
    groups: "{{ groups | default(['users']) }}"
    shell: "{{ shell | default('/bin/bash') }}"
    create_home: "{{ create_home | default(true) }}"
  
  tasks:
    - name: Create user
      user:
        name: "{{ username }}"
        groups: "{{ groups }}"
        shell: "{{ shell }}"
        create_home: "{{ create_home }}"
        state: present
    
    - name: Set up SSH key (if provided)
      authorized_key:
        user: "{{ username }}"
        key: "{{ ssh_key }}"
        state: present
      when: ssh_key is defined
    
    - name: Set password (if provided)
      user:
        name: "{{ username }}"
        password: "{{ password | password_hash('sha512') }}"
      when: password is defined
`
