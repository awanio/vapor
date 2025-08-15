package routes

import (
"context"
"fmt"
"net/http"
"os"
"path/filepath"
"time"

"github.com/gin-gonic/gin"
"github.com/gorilla/websocket"
"github.com/awanio/vapor/internal/ansible"
"github.com/robfig/cron/v3"
)

// ScheduledTask represents a scheduled Ansible task
type ScheduledTask struct {
ID          string                  `json:"id"`
Name        string                  `json:"name"`
Schedule    string                  `json:"schedule"`
Playbook    ansible.PlaybookRequest `json:"playbook"`
CreatedAt   time.Time              `json:"created_at"`
LastRun     *time.Time             `json:"last_run,omitempty"`
NextRun     *time.Time             `json:"next_run,omitempty"`
EntryID     cron.EntryID           `json:"-"`
}

var (
scheduler     *cron.Cron
scheduledTasks = make(map[string]*ScheduledTask)
)

func init() {
// Initialize the cron scheduler
scheduler = cron.New(cron.WithSeconds())
scheduler.Start()
}

// AnsibleRoutes sets up Ansible-related routes
func AnsibleRoutes(r *gin.RouterGroup, ansibleExec *ansible.Executor) {
playbookMgr := ansible.NewPlaybookManager(ansibleExec)

ansibleGroup := r.Group("/ansible")
{
// Playbook operations
ansibleGroup.GET("/playbooks", listPlaybooks(playbookMgr))
ansibleGroup.POST("/playbooks/run", runPlaybook(ansibleExec))
ansibleGroup.POST("/playbooks/validate", validatePlaybook(ansibleExec))
ansibleGroup.POST("/playbooks/upload", uploadPlaybook(playbookMgr))
ansibleGroup.GET("/playbooks/templates", getTemplates(playbookMgr))
ansibleGroup.POST("/playbooks/from-template", createFromTemplate(playbookMgr))
ansibleGroup.POST("/playbooks/sync-git", syncFromGit(playbookMgr))
ansibleGroup.POST("/playbooks/from-galaxy", installFromGalaxy(playbookMgr))
ansibleGroup.POST("/playbooks/from-url", downloadFromURL(playbookMgr))
ansibleGroup.GET("/playbooks/:name", getPlaybookDetails(playbookMgr))
ansibleGroup.DELETE("/playbooks/:name", deletePlaybook(playbookMgr))

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

// Validate required fields
if req.Hosts == "" {
c.JSON(http.StatusBadRequest, gin.H{"error": "hosts field is required"})
return
}
if req.Module == "" {
c.JSON(http.StatusBadRequest, gin.H{"error": "module field is required"})
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
// In production, implement proper origin checking
origin := r.Header.Get("Origin")
// Allow same origin and configured allowed origins
return origin == "" || origin == r.Host
},
ReadBufferSize:  1024,
WriteBufferSize: 1024,
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
id := c.Param("id")

// Cancel the execution
if err := exec.CancelExecution(id); err != nil {
if err.Error() == "execution not found" {
c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}

c.JSON(http.StatusOK, gin.H{"message": "execution cancelled successfully"})
}
}

// generateDynamicInventory creates inventory from current system state
func generateDynamicInventory(exec *ansible.Executor) gin.HandlerFunc {
return func(c *gin.Context) {
hosts := []ansible.InventoryHost{}

// Add localhost
localhost := ansible.InventoryHost{
Hostname: "localhost",
IP:       "127.0.0.1",
Variables: map[string]interface{}{
"ansible_connection": "local",
},
Groups: []string{"localhost"},
}
hosts = append(hosts, localhost)

// TODO: Integrate with container, VM, and network services to add more hosts

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

if req.Name == "" {
c.JSON(http.StatusBadRequest, gin.H{"error": "inventory name is required"})
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
name := c.Param("name")

inventory, err := exec.GetInventory(name)
if err != nil {
if os.IsNotExist(err) {
c.JSON(http.StatusNotFound, gin.H{"error": "inventory not found"})
return
}
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}

c.JSON(http.StatusOK, inventory)
}
}

// validatePlaybook validates playbook syntax
func validatePlaybook(exec *ansible.Executor) gin.HandlerFunc {
return func(c *gin.Context) {
var req struct {
Name    string `json:"name,omitempty"`
Content string `json:"content,omitempty"`
}

if err := c.ShouldBindJSON(&req); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}

// Validate either by name or content
var err error
if req.Content != "" {
// Save temporary playbook and validate
tmpFile := filepath.Join("/tmp", fmt.Sprintf("validate_%d.yml", time.Now().Unix()))
if writeErr := os.WriteFile(tmpFile, []byte(req.Content), 0644); writeErr != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": writeErr.Error()})
return
}
defer os.Remove(tmpFile)
err = exec.ValidatePlaybook(tmpFile)
} else if req.Name != "" {
err = exec.ValidatePlaybook(req.Name)
} else {
c.JSON(http.StatusBadRequest, gin.H{"error": "either name or content is required"})
return
}

if err != nil {
c.JSON(http.StatusOK, gin.H{
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

// Schedule-related handlers
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

// Validate cron expression
_, err := cron.ParseStandard(req.Schedule)
if err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": "invalid cron expression: " + err.Error()})
return
}

// Create scheduled task
task := &ScheduledTask{
ID:        fmt.Sprintf("sched-%d", time.Now().Unix()),
Name:      req.Name,
Schedule:  req.Schedule,
Playbook:  req.Playbook,
CreatedAt: time.Now(),
}

// Add to scheduler
entryID, err := scheduler.AddFunc(req.Schedule, func() {
task.LastRun = &[]time.Time{time.Now()}[0]
ctx, cancel := context.WithTimeout(context.Background(), time.Duration(task.Playbook.Timeout)*time.Second)
defer cancel()
exec.RunPlaybook(ctx, &task.Playbook)
})

if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to schedule task: " + err.Error()})
return
}

task.EntryID = entryID
entry := scheduler.Entry(entryID)
nextRun := entry.Next
task.NextRun = &nextRun

scheduledTasks[task.ID] = task

c.JSON(http.StatusCreated, task)
}
}

func listSchedules(exec *ansible.Executor) gin.HandlerFunc {
return func(c *gin.Context) {
tasks := make([]*ScheduledTask, 0, len(scheduledTasks))
for _, task := range scheduledTasks {
// Update next run time
if entry := scheduler.Entry(task.EntryID); entry.ID != 0 {
nextRun := entry.Next
task.NextRun = &nextRun
}
tasks = append(tasks, task)
}
c.JSON(http.StatusOK, gin.H{"schedules": tasks})
}
}

func deleteSchedule(exec *ansible.Executor) gin.HandlerFunc {
return func(c *gin.Context) {
id := c.Param("id")

task, exists := scheduledTasks[id]
if !exists {
c.JSON(http.StatusNotFound, gin.H{"error": "schedule not found"})
return
}

// Remove from scheduler
scheduler.Remove(task.EntryID)

// Remove from map
delete(scheduledTasks, id)

c.JSON(http.StatusOK, gin.H{"message": "schedule deleted successfully"})
}
}

// Playbook management handlers

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

if req.Name == "" {
c.JSON(http.StatusBadRequest, gin.H{"error": "playbook name is required"})
return
}

if req.Content == "" {
c.JSON(http.StatusBadRequest, gin.H{"error": "playbook content is required"})
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
if os.IsNotExist(err) {
c.JSON(http.StatusNotFound, gin.H{"error": "playbook not found"})
return
}
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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

if req.TemplateID == "" {
c.JSON(http.StatusBadRequest, gin.H{"error": "template_id is required"})
return
}

if req.Name == "" {
c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
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

if req.URL == "" {
c.JSON(http.StatusBadRequest, gin.H{"error": "repository URL is required"})
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

if req.Name == "" && len(req.Roles) == 0 && req.Requirements == "" {
c.JSON(http.StatusBadRequest, gin.H{"error": "name, roles, or requirements must be specified"})
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

if req.URL == "" {
c.JSON(http.StatusBadRequest, gin.H{"error": "URL is required"})
return
}

if req.Name == "" {
c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
return
}

if err := mgr.DownloadFromURL(req.URL, req.Name); err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}

c.JSON(http.StatusOK, gin.H{"message": "playbook downloaded successfully"})
}
}
