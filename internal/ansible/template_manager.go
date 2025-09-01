package ansible

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
	"text/template"
	"time"
)

// TemplateManager manages user-defined and system templates
type TemplateManager struct {
	systemTemplatesDir string
	userTemplatesDir   string
	executor           *Executor
}

// NewTemplateManager creates a new template manager
func NewTemplateManager(exec *Executor) *TemplateManager {
	baseDir := exec.baseDir
	return &TemplateManager{
		systemTemplatesDir: filepath.Join(baseDir, "templates", "system"),
		userTemplatesDir:   filepath.Join(baseDir, "templates", "user"),
		executor:           exec,
	}
}

// Initialize creates necessary directories
func (tm *TemplateManager) Initialize() error {
	// Create template directories
	if err := os.MkdirAll(tm.systemTemplatesDir, 0755); err != nil {
		return fmt.Errorf("failed to create system templates dir: %w", err)
	}
	if err := os.MkdirAll(tm.userTemplatesDir, 0755); err != nil {
		return fmt.Errorf("failed to create user templates dir: %w", err)
	}

	// Initialize system templates if they don't exist
	return tm.initializeSystemTemplates()
}

// UserTemplate represents a user-created template
type UserTemplate struct {
	ID          string              `json:"id"`
	Name        string              `json:"name"`
	Category    string              `json:"category"`
	Description string              `json:"description"`
	Author      string              `json:"author"`
	Version     string              `json:"version"`
	Icon        string              `json:"icon,omitempty"`
	Tags        []string            `json:"tags"`
	Variables   map[string]Variable `json:"variables"`
	Content     string              `json:"content"`
	IsSystem    bool                `json:"is_system"`
	IsPublic    bool                `json:"is_public"`
	CreatedAt   time.Time           `json:"created_at"`
	UpdatedAt   time.Time           `json:"updated_at"`
}

// Variable represents a template variable with validation
type Variable struct {
	Name        string      `json:"name"`
	Type        string      `json:"type"` // string, number, boolean, array, object
	Default     interface{} `json:"default,omitempty"`
	Required    bool        `json:"required"`
	Description string      `json:"description,omitempty"`
	Validation  *Validation `json:"validation,omitempty"`
}

// Validation rules for variables
type Validation struct {
	MinLength *int     `json:"min_length,omitempty"`
	MaxLength *int     `json:"max_length,omitempty"`
	MinValue  *float64 `json:"min_value,omitempty"`
	MaxValue  *float64 `json:"max_value,omitempty"`
	Pattern   string   `json:"pattern,omitempty"` // regex pattern
	Enum      []string `json:"enum,omitempty"`    // allowed values
}

// ListTemplates returns all templates (system + user)
func (tm *TemplateManager) ListTemplates(filter *TemplateFilter) ([]*UserTemplate, error) {
	var templates []*UserTemplate

	// Load system templates
	systemTemplates, err := tm.loadTemplatesFromDir(tm.systemTemplatesDir, true)
	if err != nil {
		return nil, fmt.Errorf("failed to load system templates: %w", err)
	}
	templates = append(templates, systemTemplates...)

	// Load user templates
	userTemplates, err := tm.loadTemplatesFromDir(tm.userTemplatesDir, false)
	if err != nil {
		return nil, fmt.Errorf("failed to load user templates: %w", err)
	}
	templates = append(templates, userTemplates...)

	// Apply filters
	if filter != nil {
		templates = tm.applyFilters(templates, filter)
	}

	return templates, nil
}

// GetTemplate retrieves a specific template
func (tm *TemplateManager) GetTemplate(id string) (*UserTemplate, error) {
	// Check system templates first
	systemPath := filepath.Join(tm.systemTemplatesDir, id+".json")
	if _, err := os.Stat(systemPath); err == nil {
		return tm.loadTemplate(systemPath, true)
	}

	// Check user templates
	userPath := filepath.Join(tm.userTemplatesDir, id+".json")
	if _, err := os.Stat(userPath); err == nil {
		return tm.loadTemplate(userPath, false)
	}

	return nil, fmt.Errorf("template not found: %s", id)
}

// CreateTemplate creates a new user template
func (tm *TemplateManager) CreateTemplate(template *UserTemplate) error {
	// Validate template
	if err := tm.validateTemplate(template); err != nil {
		return fmt.Errorf("template validation failed: %w", err)
	}

	// Generate ID if not provided
	if template.ID == "" {
		template.ID = tm.generateTemplateID(template.Name)
	}

	// Set timestamps
	now := time.Now()
	template.CreatedAt = now
	template.UpdatedAt = now
	template.IsSystem = false

	// Save template
	templatePath := filepath.Join(tm.userTemplatesDir, template.ID+".json")
	return tm.saveTemplate(template, templatePath)
}

// UpdateTemplate updates an existing user template
func (tm *TemplateManager) UpdateTemplate(id string, template *UserTemplate) error {
	// Check if template exists and is not a system template
	existing, err := tm.GetTemplate(id)
	if err != nil {
		return err
	}

	if existing.IsSystem {
		return fmt.Errorf("cannot modify system template")
	}

	// Validate template
	if err := tm.validateTemplate(template); err != nil {
		return fmt.Errorf("template validation failed: %w", err)
	}

	// Preserve original creation time
	template.CreatedAt = existing.CreatedAt
	template.UpdatedAt = time.Now()
	template.ID = id
	template.IsSystem = false

	// Save updated template
	templatePath := filepath.Join(tm.userTemplatesDir, id+".json")
	return tm.saveTemplate(template, templatePath)
}

// DeleteTemplate deletes a user template
func (tm *TemplateManager) DeleteTemplate(id string) error {
	// Check if template exists
	template, err := tm.GetTemplate(id)
	if err != nil {
		return err
	}

	if template.IsSystem {
		return fmt.Errorf("cannot delete system template")
	}

	// Delete template file
	templatePath := filepath.Join(tm.userTemplatesDir, id+".json")
	return os.Remove(templatePath)
}

// RenderTemplate renders a template with variables
func (tm *TemplateManager) RenderTemplate(templateID string, variables map[string]interface{}) (string, error) {
	// Get template
	tmpl, err := tm.GetTemplate(templateID)
	if err != nil {
		return "", err
	}

	// Validate variables
	if err := tm.validateVariables(tmpl, variables); err != nil {
		return "", fmt.Errorf("variable validation failed: %w", err)
	}

	// Merge with defaults
	mergedVars := tm.mergeWithDefaults(tmpl, variables)

	// Use Go's text/template for advanced rendering
	t, err := template.New(templateID).Parse(tmpl.Content)
	if err != nil {
		return "", fmt.Errorf("failed to parse template: %w", err)
	}

	var buf bytes.Buffer
	if err := t.Execute(&buf, mergedVars); err != nil {
		return "", fmt.Errorf("failed to render template: %w", err)
	}

	return buf.String(), nil
}

// CloneTemplate creates a copy of an existing template
func (tm *TemplateManager) CloneTemplate(sourceID, newID, newName string) error {
	// Get source template
	source, err := tm.GetTemplate(sourceID)
	if err != nil {
		return err
	}

	// Create new template
	clone := *source
	clone.ID = newID
	clone.Name = newName
	clone.IsSystem = false
	clone.Author = "cloned"
	clone.Version = "1.0.0"

	return tm.CreateTemplate(&clone)
}

// ImportTemplate imports a template from YAML/JSON
func (tm *TemplateManager) ImportTemplate(data []byte, format string) error {
	var template UserTemplate

	switch format {
	case "json":
		if err := json.Unmarshal(data, &template); err != nil {
			return fmt.Errorf("failed to parse JSON: %w", err)
		}
	case "yaml":
		// Would need to import gopkg.in/yaml.v2
		// For now, we'll require JSON format
		return fmt.Errorf("YAML import not yet implemented")
	default:
		return fmt.Errorf("unsupported format: %s", format)
	}

	return tm.CreateTemplate(&template)
}

// ExportTemplate exports a template to JSON
func (tm *TemplateManager) ExportTemplate(id string) ([]byte, error) {
	template, err := tm.GetTemplate(id)
	if err != nil {
		return nil, err
	}

	return json.MarshalIndent(template, "", "  ")
}

// ShareTemplate shares a template to a repository or registry
func (tm *TemplateManager) ShareTemplate(id string, repository string) error {
	// This would integrate with Git, Ansible Galaxy, or custom registry
	// For now, just export the template
	data, err := tm.ExportTemplate(id)
	if err != nil {
		return err
	}

	// Save to shared directory
	sharedDir := filepath.Join(tm.executor.baseDir, "templates", "shared")
	os.MkdirAll(sharedDir, 0755)

	sharedPath := filepath.Join(sharedDir, id+".json")
	return ioutil.WriteFile(sharedPath, data, 0644)
}

// Helper functions

func (tm *TemplateManager) loadTemplatesFromDir(dir string, isSystem bool) ([]*UserTemplate, error) {
	var templates []*UserTemplate

	files, err := ioutil.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return templates, nil
		}
		return nil, err
	}

	for _, file := range files {
		if strings.HasSuffix(file.Name(), ".json") {
			path := filepath.Join(dir, file.Name())
			template, err := tm.loadTemplate(path, isSystem)
			if err != nil {
				continue // Skip invalid templates
			}
			templates = append(templates, template)
		}
	}

	return templates, nil
}

func (tm *TemplateManager) loadTemplate(path string, isSystem bool) (*UserTemplate, error) {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var template UserTemplate
	if err := json.Unmarshal(data, &template); err != nil {
		return nil, err
	}

	template.IsSystem = isSystem
	return &template, nil
}

func (tm *TemplateManager) saveTemplate(template *UserTemplate, path string) error {
	data, err := json.MarshalIndent(template, "", "  ")
	if err != nil {
		return err
	}

	return ioutil.WriteFile(path, data, 0644)
}

func (tm *TemplateManager) validateTemplate(userTemplate *UserTemplate) error {
	if userTemplate.Name == "" {
		return fmt.Errorf("template name is required")
	}

	if userTemplate.Content == "" {
		return fmt.Errorf("template content is required")
	}

	// Validate template syntax (basic check)
	tmpl := template.New("test")
	if _, err := tmpl.Parse(userTemplate.Content); err != nil {
		return fmt.Errorf("invalid template syntax: %w", err)
	}

	return nil
}

func (tm *TemplateManager) validateVariables(template *UserTemplate, variables map[string]interface{}) error {
	for name, varDef := range template.Variables {
		value, exists := variables[name]

		// Check required variables
		if varDef.Required && !exists {
			return fmt.Errorf("required variable missing: %s", name)
		}

		if !exists {
			continue
		}

		// Type validation
		if err := tm.validateVariableType(value, varDef.Type); err != nil {
			return fmt.Errorf("variable %s: %w", name, err)
		}

		// Additional validation rules
		if varDef.Validation != nil {
			if err := tm.applyValidationRules(value, varDef.Validation); err != nil {
				return fmt.Errorf("variable %s: %w", name, err)
			}
		}
	}

	return nil
}

func (tm *TemplateManager) validateVariableType(value interface{}, expectedType string) error {
	switch expectedType {
	case "string":
		if _, ok := value.(string); !ok {
			return fmt.Errorf("expected string, got %T", value)
		}
	case "number":
		switch value.(type) {
		case int, int32, int64, float32, float64:
			// Valid number types
		default:
			return fmt.Errorf("expected number, got %T", value)
		}
	case "boolean":
		if _, ok := value.(bool); !ok {
			return fmt.Errorf("expected boolean, got %T", value)
		}
	case "array":
		if _, ok := value.([]interface{}); !ok {
			return fmt.Errorf("expected array, got %T", value)
		}
	case "object":
		if _, ok := value.(map[string]interface{}); !ok {
			return fmt.Errorf("expected object, got %T", value)
		}
	}

	return nil
}

func (tm *TemplateManager) applyValidationRules(value interface{}, validation *Validation) error {
	// Implement validation rules based on type
	// This is a simplified version

	if str, ok := value.(string); ok {
		if validation.MinLength != nil && len(str) < *validation.MinLength {
			return fmt.Errorf("string too short (min: %d)", *validation.MinLength)
		}
		if validation.MaxLength != nil && len(str) > *validation.MaxLength {
			return fmt.Errorf("string too long (max: %d)", *validation.MaxLength)
		}
		if len(validation.Enum) > 0 {
			found := false
			for _, allowed := range validation.Enum {
				if str == allowed {
					found = true
					break
				}
			}
			if !found {
				return fmt.Errorf("value not in allowed list: %v", validation.Enum)
			}
		}
	}

	// Add more validation logic as needed

	return nil
}

func (tm *TemplateManager) mergeWithDefaults(template *UserTemplate, variables map[string]interface{}) map[string]interface{} {
	merged := make(map[string]interface{})

	// Start with defaults
	for name, varDef := range template.Variables {
		if varDef.Default != nil {
			merged[name] = varDef.Default
		}
	}

	// Override with provided values
	for name, value := range variables {
		merged[name] = value
	}

	return merged
}

func (tm *TemplateManager) generateTemplateID(name string) string {
	// Generate a URL-safe ID from the name
	id := strings.ToLower(name)
	id = strings.ReplaceAll(id, " ", "-")
	id = strings.ReplaceAll(id, "_", "-")

	// Remove non-alphanumeric characters except hyphens
	var result []rune
	for _, r := range id {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			result = append(result, r)
		}
	}

	return string(result)
}

func (tm *TemplateManager) applyFilters(templates []*UserTemplate, filter *TemplateFilter) []*UserTemplate {
	var filtered []*UserTemplate

	for _, template := range templates {
		// Apply category filter
		if filter.Category != "" && template.Category != filter.Category {
			continue
		}

		// Apply tag filter
		if len(filter.Tags) > 0 {
			hasTag := false
			for _, filterTag := range filter.Tags {
				for _, templateTag := range template.Tags {
					if filterTag == templateTag {
						hasTag = true
						break
					}
				}
				if hasTag {
					break
				}
			}
			if !hasTag {
				continue
			}
		}

		// Apply author filter
		if filter.Author != "" && template.Author != filter.Author {
			continue
		}

		// Apply system/user filter
		if filter.OnlySystem && !template.IsSystem {
			continue
		}
		if filter.OnlyUser && template.IsSystem {
			continue
		}

		filtered = append(filtered, template)
	}

	return filtered
}

// TemplateFilter for searching templates
type TemplateFilter struct {
	Category   string   `json:"category,omitempty"`
	Tags       []string `json:"tags,omitempty"`
	Author     string   `json:"author,omitempty"`
	OnlySystem bool     `json:"only_system,omitempty"`
	OnlyUser   bool     `json:"only_user,omitempty"`
}

// Initialize system templates
func (tm *TemplateManager) initializeSystemTemplates() error {
	// Create default system templates if they don't exist
	systemTemplates := tm.getDefaultSystemTemplates()

	for _, template := range systemTemplates {
		templatePath := filepath.Join(tm.systemTemplatesDir, template.ID+".json")

		// Skip if already exists
		if _, err := os.Stat(templatePath); err == nil {
			continue
		}

		// Save system template
		if err := tm.saveTemplate(template, templatePath); err != nil {
			return fmt.Errorf("failed to initialize system template %s: %w", template.ID, err)
		}
	}

	return nil
}

func (tm *TemplateManager) getDefaultSystemTemplates() []*UserTemplate {
	return []*UserTemplate{
		{
			ID:          "system-update",
			Name:        "System Update",
			Category:    "Maintenance",
			Description: "Update all packages on target systems",
			Author:      "Vapor Team",
			Version:     "1.0.0",
			Icon:        "update",
			Tags:        []string{"update", "maintenance", "security"},
			Variables: map[string]Variable{
				"reboot_if_required": {
					Name:        "reboot_if_required",
					Type:        "boolean",
					Default:     false,
					Required:    false,
					Description: "Automatically reboot if required after updates",
				},
				"update_cache_time": {
					Name:        "update_cache_time",
					Type:        "number",
					Default:     3600,
					Required:    false,
					Description: "Cache validity time in seconds",
				},
			},
			Content: `---
- name: System Update Playbook
  hosts: {{ .hosts | default "all" }}
  become: yes
  vars:
    reboot_if_required: {{ .reboot_if_required }}
    update_cache_time: {{ .update_cache_time }}
  
  tasks:
    - name: Update apt cache (Debian/Ubuntu)
      apt:
        update_cache: yes
        cache_valid_time: "{{ update_cache_time }}"
      when: ansible_os_family == "Debian"
    
    - name: Upgrade all packages (Debian/Ubuntu)
      apt:
        upgrade: dist
        autoremove: yes
        autoclean: yes
      when: ansible_os_family == "Debian"
      register: apt_result
    
    - name: Update all packages (RedHat/CentOS)
      yum:
        name: '*'
        state: latest
      when: ansible_os_family == "RedHat"
      register: yum_result
    
    - name: Check if reboot is required (Debian/Ubuntu)
      stat:
        path: /var/run/reboot-required
      register: reboot_required_file
      when: ansible_os_family == "Debian"
    
    - name: Reboot if required
      reboot:
        msg: "Reboot initiated by Ansible after system update"
        connect_timeout: 5
        reboot_timeout: 600
        pre_reboot_delay: 0
        post_reboot_delay: 30
        test_command: whoami
      when: 
        - reboot_if_required
        - (reboot_required_file.stat.exists is defined and reboot_required_file.stat.exists) or 
          (yum_result is defined and yum_result.changed)`,
			IsSystem:  true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:          "docker-deploy",
			Name:        "Docker Application Deployment",
			Category:    "Deployment",
			Description: "Deploy containerized application using Docker",
			Author:      "Vapor Team",
			Version:     "1.0.0",
			Icon:        "docker",
			Tags:        []string{"docker", "container", "deployment"},
			Variables: map[string]Variable{
				"app_name": {
					Name:        "app_name",
					Type:        "string",
					Default:     "myapp",
					Required:    true,
					Description: "Application name",
				},
				"app_image": {
					Name:        "app_image",
					Type:        "string",
					Default:     "nginx:latest",
					Required:    true,
					Description: "Docker image to deploy",
				},
				"app_port": {
					Name:        "app_port",
					Type:        "number",
					Default:     8080,
					Required:    true,
					Description: "Host port to expose",
					Validation: &Validation{
						MinValue: func(v float64) *float64 { return &v }(1),
						MaxValue: func(v float64) *float64 { return &v }(65535),
					},
				},
				"env_vars": {
					Name:        "env_vars",
					Type:        "object",
					Default:     map[string]interface{}{},
					Required:    false,
					Description: "Environment variables for the container",
				},
			},
			Content: `---
- name: Docker Application Deployment
  hosts: {{ .hosts | default "all" }}
  become: yes
  vars:
    app_name: "{{ .app_name }}"
    app_image: "{{ .app_image }}"
    app_port: {{ .app_port }}
    env_vars: {{ .env_vars | default "{}" }}
  
  tasks:
    - name: Install Docker prerequisites
      package:
        name:
          - docker.io
          - python3-docker
        state: present
    
    - name: Start Docker service
      service:
        name: docker
        state: started
        enabled: yes
    
    - name: Pull Docker image
      docker_image:
        name: "{{ app_image }}"
        source: pull
    
    - name: Stop existing container if present
      docker_container:
        name: "{{ app_name }}"
        state: absent
      ignore_errors: yes
    
    - name: Deploy container
      docker_container:
        name: "{{ app_name }}"
        image: "{{ app_image }}"
        ports:
          - "{{ app_port }}:80"
        env: "{{ env_vars }}"
        state: started
        restart_policy: unless-stopped
        log_driver: json-file
        log_options:
          max-size: "10m"
          max-file: "3"`,
			IsSystem:  true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}
}

// SaveUserTemplate saves a user template
func (tm *TemplateManager) SaveUserTemplate(template *UserTemplate) error {
	// Ensure directory exists
	if err := os.MkdirAll(tm.userTemplatesDir, 0755); err != nil {
		return fmt.Errorf("failed to create user templates directory: %w", err)
	}

	// Save template as JSON
	templatePath := filepath.Join(tm.userTemplatesDir, template.ID+".json")
	data, err := json.MarshalIndent(template, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal template: %w", err)
	}

	if err := os.WriteFile(templatePath, data, 0644); err != nil {
		return fmt.Errorf("failed to save template: %w", err)
	}

	return nil
}

// ListUserTemplates lists all user templates
func (tm *TemplateManager) ListUserTemplates() ([]*UserTemplate, error) {
	templates := []*UserTemplate{}

	// Read user templates directory
	entries, err := os.ReadDir(tm.userTemplatesDir)
	if err != nil {
		if os.IsNotExist(err) {
			return templates, nil
		}
		return nil, fmt.Errorf("failed to read user templates: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".json") {
			templatePath := filepath.Join(tm.userTemplatesDir, entry.Name())
			data, err := os.ReadFile(templatePath)
			if err != nil {
				continue
			}

			var template UserTemplate
			if err := json.Unmarshal(data, &template); err != nil {
				continue
			}

			templates = append(templates, &template)
		}
	}

	return templates, nil
}
