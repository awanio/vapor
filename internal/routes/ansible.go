package routes

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/awanio/vapor/internal/ansible"
)

// AnsibleRoutes sets up Ansible-related routes
func AnsibleRoutes(r *gin.RouterGroup, ansibleExec *ansible.Executor) {
	playbookMgr := ansible.NewPlaybookManager(ansibleExec)
	
	ansibleGroup := r.Group("/ansible")
	{
		// Playbook operations
		ansibleGroup.GET("/playbooks", listPlaybooks(playbookMgr))              // List all playbooks
		ansibleGroup.POST("/playbooks/run", runPlaybook(ansibleExec))          // Execute playbook
		ansibleGroup.POST("/playbooks/validate", validatePlaybook(ansibleExec)) // Validate syntax
		ansibleGroup.POST("/playbooks/upload", uploadPlaybook(playbookMgr))    // Upload new playbook
		ansibleGroup.GET("/playbooks/templates", getTemplates(playbookMgr))    // Get templates
		ansibleGroup.POST("/playbooks/from-template", createFromTemplate(playbookMgr)) // Create from template
		ansibleGroup.POST("/playbooks/sync-git", syncFromGit(playbookMgr))    // Sync from Git
		ansibleGroup.POST("/playbooks/from-galaxy", installFromGalaxy(playbookMgr)) // Install from Galaxy
		ansibleGroup.POST("/playbooks/from-url", downloadFromURL(playbookMgr)) // Download from URL
		ansibleGroup.GET("/playbooks/:name", getPlaybookDetails(playbookMgr))  // Get specific playbook
		ansibleGroup.DELETE("/playbooks/:name", deletePlaybook(playbookMgr))   // Delete playbook
		
		// Ad-hoc commands
		ansibleGroup.POST("/adhoc", runAdHoc(ansibleExec))
		
		// Execution management
		ansibleGroup.GET("/executions", listExecutions(ansibleExec))
		ansibleGroup.GET("/executions/:id", getExecution(ansibleExec))
		ansibleGroup.GET("/executions/:id/stream", streamExecution(ansibleExec))
		ansibleGroup.DELETE("/executions/:id", cancelExecution(ansibleExec))
		
		// Inventory management
		ansibleGroup.GET("/inventory/dynamic", generateDynamicInventory(ansibleExec))
		ansibleGroup.POST("/inventory", saveInventory(ansibleExec))
		ansibleGroup.GET("/inventory/:name", getInventory(ansibleExec))
		
		// Scheduled tasks
		ansibleGroup.POST("/schedules", createSchedule(ansibleExec))
		ansibleGroup.GET("/schedules", listSchedules(ansibleExec))
		ansibleGroup.DELETE("/schedules/:id", deleteSchedule(ansibleExec))
	}
}

// runPlaybook handles playbook execution requests
func runPlaybook(exec *ansible.Executor) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ansible.PlaybookRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Set default timeout if not specified
		if req.Timeout == 0 {
			req.Timeout = 3600 // 1 hour default
		}

		result, err := exec.RunPlaybook(c.Request.Context(), &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusAccepted, result)
	}
}

// runAdHoc handles ad-hoc command execution requests
func runAdHoc(exec *ansible.Executor) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ansible.AdHocRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Set default timeout if not specified
		if req.Timeout == 0 {
			req.Timeout = 300 // 5 minutes default
		}

		result, err := exec.RunAdHoc(c.Request.Context(), &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusAccepted, result)
	}
}

// getExecution retrieves execution details
func getExecution(exec *ansible.Executor) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		
		result, ok := exec.GetExecution(id)
		if !ok {
			c.JSON(http.StatusNotFound, gin.H{"error": "execution not found"})
			return
		}

		c.JSON(http.StatusOK, result)
	}
}

// listExecutions returns all execution results
func listExecutions(exec *ansible.Executor) gin.HandlerFunc {
	return func(c *gin.Context) {
		results := exec.ListExecutions()
		c.JSON(http.StatusOK, gin.H{"executions": results})
	}
}

// streamExecution streams execution output via WebSocket
func streamExecution(exec *ansible.Executor) gin.HandlerFunc {
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all origins in development
		},
	}

	return func(c *gin.Context) {
		id := c.Param("id")
		
		// Check if execution exists
		_, ok := exec.GetExecution(id)
		if !ok {
			c.JSON(http.StatusNotFound, gin.H{"error": "execution not found"})
			return
		}

		// Upgrade to WebSocket
		ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upgrade connection"})
			return
		}
		defer ws.Close()

		// Get output stream
		outputChan, ok := exec.GetOutputStream(id)
		if !ok {
			ws.WriteJSON(gin.H{"error": "output stream not available"})
			return
		}

		// Stream output to WebSocket
		for line := range outputChan {
			if err := ws.WriteJSON(gin.H{
				"type":    "output",
				"content": line,
				"time":    time.Now().Unix(),
			}); err != nil {
				break
			}
		}

		// Send completion message
		result, _ := exec.GetExecution(id)
		ws.WriteJSON(gin.H{
			"type":   "complete",
			"result": result,
		})
	}
}

// cancelExecution cancels a running execution
func cancelExecution(exec *ansible.Executor) gin.HandlerFunc {
	return func(c *gin.Context) {
		// id := c.Param("id")
		// For now, we can't cancel running executions
		// This would require storing context cancel functions
		c.JSON(http.StatusNotImplemented, gin.H{"error": "cancellation not yet implemented"})
	}
}

// generateDynamicInventory creates inventory from current system state
func generateDynamicInventory(exec *ansible.Executor) gin.HandlerFunc {
	return func(c *gin.Context) {
		hosts := []ansible.InventoryHost{}
		
		// For now, just create a simple localhost inventory
		// In production, this would integrate with container, system, and network services
		localhost := ansible.InventoryHost{
			Hostname: "localhost",
			IP:       "127.0.0.1",
			Variables: map[string]interface{}{
				"ansible_connection": "local",
			},
			Groups: []string{"localhost"},
		}
		hosts = append(hosts, localhost)
		
		// Generate inventory
		inventory, err := exec.GenerateDynamicInventory(hosts)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		
		c.JSON(http.StatusOK, inventory)
	}
}

// saveInventory saves an inventory configuration
func saveInventory(exec *ansible.Executor) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Name      string                   `json:"name"`
			Inventory *ansible.DynamicInventory `json:"inventory"`
		}
		
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		
		if err := exec.SaveInventory(req.Name, req.Inventory); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		
		c.JSON(http.StatusOK, gin.H{"message": "inventory saved successfully"})
	}
}

// getInventory retrieves a saved inventory
func getInventory(exec *ansible.Executor) gin.HandlerFunc {
	return func(c *gin.Context) {
		// name := c.Param("name")
		// For now, just read the file
		// In production, you'd want to parse and return the inventory
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not yet implemented"})
	}
}

// savePlaybook saves a playbook
func savePlaybook(exec *ansible.Executor) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Name    string `json:"name"`
			Content string `json:"content"`
		}
		
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		
		if err := exec.SavePlaybook(req.Name, req.Content); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		
		c.JSON(http.StatusOK, gin.H{"message": "playbook saved successfully"})
	}
}

// getPlaybook retrieves a saved playbook
func getPlaybook(exec *ansible.Executor) gin.HandlerFunc {
	return func(c *gin.Context) {
		// name := c.Param("name")
		// For now, just return not implemented
		// In production, you'd read and return the playbook content
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not yet implemented"})
	}
}

// validatePlaybook validates playbook syntax
func validatePlaybook(exec *ansible.Executor) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Name string `json:"name"`
		}
		
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		
		if err := exec.ValidatePlaybook(req.Name); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"valid": false,
				"error": err.Error(),
			})
			return
		}
		
		c.JSON(http.StatusOK, gin.H{
			"valid":   true,
			"message": "playbook syntax is valid",
		})
	}
}

// Schedule-related handlers (placeholder for now)
func createSchedule(exec *ansible.Executor) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Name     string                  `json:"name"`
			Schedule string                  `json:"schedule"` // Cron expression
			Playbook ansible.PlaybookRequest `json:"playbook"`
		}
		
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		
		// TODO: Implement cron scheduler
		c.JSON(http.StatusNotImplemented, gin.H{"error": "scheduling not yet implemented"})
	}
}

func listSchedules(exec *ansible.Executor) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "scheduling not yet implemented"})
	}
}

func deleteSchedule(exec *ansible.Executor) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "scheduling not yet implemented"})
	}
}

// New playbook management handlers

// listPlaybooks returns all available playbooks
func listPlaybooks(mgr *ansible.PlaybookManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		playbooks, err := mgr.ListPlaybooks()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"playbooks": playbooks})
	}
}

// getPlaybookDetails returns detailed information about a specific playbook
func getPlaybookDetails(mgr *ansible.PlaybookManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")
		playbook, err := mgr.GetPlaybook(name)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, playbook)
	}
}

// uploadPlaybook handles playbook upload
func uploadPlaybook(mgr *ansible.PlaybookManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ansible.PlaybookUploadRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		
		if err := mgr.UploadPlaybook(&req); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		
		c.JSON(http.StatusCreated, gin.H{"message": "playbook uploaded successfully"})
	}
}

// deletePlaybook deletes a playbook
func deletePlaybook(mgr *ansible.PlaybookManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")
		if err := mgr.DeletePlaybook(name); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "playbook deleted successfully"})
	}
}

// getTemplates returns available playbook templates
func getTemplates(mgr *ansible.PlaybookManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		templates, err := mgr.GetTemplates()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"templates": templates})
	}
}

// createFromTemplate creates a playbook from a template
func createFromTemplate(mgr *ansible.PlaybookManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			TemplateID string                 `json:"template_id"`
			Name       string                 `json:"name"`
			Variables  map[string]interface{} `json:"variables"`
		}
		
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		
		if err := mgr.CreateFromTemplate(req.TemplateID, req.Name, req.Variables); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		
		c.JSON(http.StatusCreated, gin.H{"message": "playbook created from template"})
	}
}

// syncFromGit syncs playbooks from a Git repository
func syncFromGit(mgr *ansible.PlaybookManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ansible.GitRepoRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		
		if err := mgr.SyncFromGit(&req); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		
		c.JSON(http.StatusOK, gin.H{"message": "playbooks synced from git repository"})
	}
}

// installFromGalaxy installs roles/collections from Ansible Galaxy
func installFromGalaxy(mgr *ansible.PlaybookManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ansible.GalaxyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		
		if err := mgr.InstallFromGalaxy(&req); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		
		c.JSON(http.StatusOK, gin.H{"message": "roles/collections installed from galaxy"})
	}
}

// downloadFromURL downloads a playbook from a URL
func downloadFromURL(mgr *ansible.PlaybookManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			URL  string `json:"url"`
			Name string `json:"name"`
		}
		
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		
		if err := mgr.DownloadFromURL(req.URL, req.Name); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		
		c.JSON(http.StatusOK, gin.H{"message": "playbook downloaded successfully"})
	}
}
