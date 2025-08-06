package kubernetes

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/awanio/vapor/internal/common"
	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	"sigs.k8s.io/yaml"
)

// ApplyDaemonSetGin handles daemonset creation/update using apply
func (h *Handler) ApplyDaemonSetGin(c *gin.Context) {
	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}
	
	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid DaemonSet specification")
		return
	}
	
	var daemonset appsv1.DaemonSet
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &daemonset)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML daemonset specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &daemonset)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON daemonset specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	if daemonset.Name == "" && daemonset.ObjectMeta.Name == "" {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Invalid daemonset specification", 
			"DaemonSet name is required in metadata.name")
		return
	}
	
	appliedDaemonSet, err := h.service.ApplyDaemonSet(c.Request.Context(), &daemonset)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to apply daemonset", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"daemonset_detail": appliedDaemonSet})
}

// UpdateDaemonSetGin handles daemonset updates
func (h *Handler) UpdateDaemonSetGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	
	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}
	
	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid DaemonSet specification")
		return
	}
	
	var daemonset appsv1.DaemonSet
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &daemonset)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML daemonset specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &daemonset)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON daemonset specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	updatedDaemonSet, err := h.service.UpdateDaemonSet(c.Request.Context(), namespace, name, &daemonset)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "DaemonSet not found", err.Error())
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to update daemonset", err.Error())
		}
		return
	}
	common.SendSuccess(c, gin.H{"daemonset_detail": updatedDaemonSet})
}

// DeleteDaemonSetGin handles daemonset deletion
func (h *Handler) DeleteDaemonSetGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	
	err := h.service.DeleteDaemonSet(c.Request.Context(), namespace, name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to delete daemonset", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"message": "DaemonSet deleted successfully"})
}

// ApplyStatefulSetGin handles statefulset creation/update using apply
func (h *Handler) ApplyStatefulSetGin(c *gin.Context) {
	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}
	
	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid StatefulSet specification")
		return
	}
	
	var statefulset appsv1.StatefulSet
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &statefulset)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML statefulset specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &statefulset)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON statefulset specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	if statefulset.Name == "" && statefulset.ObjectMeta.Name == "" {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Invalid statefulset specification", 
			"StatefulSet name is required in metadata.name")
		return
	}
	
	appliedStatefulSet, err := h.service.ApplyStatefulSet(c.Request.Context(), &statefulset)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to apply statefulset", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"statefulset_detail": appliedStatefulSet})
}

// UpdateStatefulSetGin handles statefulset updates
func (h *Handler) UpdateStatefulSetGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	
	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}
	
	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid StatefulSet specification")
		return
	}
	
	var statefulset appsv1.StatefulSet
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &statefulset)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML statefulset specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &statefulset)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON statefulset specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	updatedStatefulSet, err := h.service.UpdateStatefulSet(c.Request.Context(), namespace, name, &statefulset)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "StatefulSet not found", err.Error())
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to update statefulset", err.Error())
		}
		return
	}
	common.SendSuccess(c, gin.H{"statefulset_detail": updatedStatefulSet})
}

// DeleteStatefulSetGin handles statefulset deletion
func (h *Handler) DeleteStatefulSetGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	
	err := h.service.DeleteStatefulSet(c.Request.Context(), namespace, name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to delete statefulset", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"message": "StatefulSet deleted successfully"})
}

// ApplyJobGin handles job creation/update using apply
func (h *Handler) ApplyJobGin(c *gin.Context) {
	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}
	
	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid Job specification")
		return
	}
	
	var job batchv1.Job
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &job)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML job specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &job)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON job specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	if job.Name == "" && job.ObjectMeta.Name == "" {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Invalid job specification", 
			"Job name is required in metadata.name")
		return
	}
	
	appliedJob, err := h.service.ApplyJob(c.Request.Context(), &job)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to apply job", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"job_detail": appliedJob})
}

// UpdateJobGin handles job updates
func (h *Handler) UpdateJobGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	
	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}
	
	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid Job specification")
		return
	}
	
	var job batchv1.Job
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &job)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML job specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &job)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON job specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	updatedJob, err := h.service.UpdateJob(c.Request.Context(), namespace, name, &job)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Job not found", err.Error())
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to update job", err.Error())
		}
		return
	}
	common.SendSuccess(c, gin.H{"job_detail": updatedJob})
}

// DeleteJobGin handles job deletion
func (h *Handler) DeleteJobGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	
	err := h.service.DeleteJob(c.Request.Context(), namespace, name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to delete job", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"message": "Job deleted successfully"})
}

// ApplyCronJobGin handles cronjob creation/update using apply
func (h *Handler) ApplyCronJobGin(c *gin.Context) {
	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}
	
	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid CronJob specification")
		return
	}
	
	var cronjob batchv1.CronJob
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &cronjob)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML cronjob specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &cronjob)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON cronjob specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	if cronjob.Name == "" && cronjob.ObjectMeta.Name == "" {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Invalid cronjob specification", 
			"CronJob name is required in metadata.name")
		return
	}
	
	appliedCronJob, err := h.service.ApplyCronJob(c.Request.Context(), &cronjob)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to apply cronjob", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"cronjob_detail": appliedCronJob})
}

// UpdateCronJobGin handles cronjob updates
func (h *Handler) UpdateCronJobGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	
	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}
	
	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid CronJob specification")
		return
	}
	
	var cronjob batchv1.CronJob
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &cronjob)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML cronjob specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &cronjob)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON cronjob specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	updatedCronJob, err := h.service.UpdateCronJob(c.Request.Context(), namespace, name, &cronjob)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "CronJob not found", err.Error())
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to update cronjob", err.Error())
		}
		return
	}
	common.SendSuccess(c, gin.H{"cronjob_detail": updatedCronJob})
}

// DeleteCronJobGin handles cronjob deletion
func (h *Handler) DeleteCronJobGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	
	err := h.service.DeleteCronJob(c.Request.Context(), namespace, name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to delete cronjob", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"message": "CronJob deleted successfully"})
}
