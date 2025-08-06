package kubernetes

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/awanio/vapor/internal/common"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"sigs.k8s.io/yaml"
)

// ApplyDeploymentGin handles deployment creation/update using apply
func (h *Handler) ApplyDeploymentGin(c *gin.Context) {
	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}
	
	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid Deployment specification")
		return
	}
	
	var deployment appsv1.Deployment
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &deployment)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML deployment specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &deployment)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON deployment specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	if deployment.Name == "" && deployment.ObjectMeta.Name == "" {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Invalid deployment specification", 
			"Deployment name is required in metadata.name")
		return
	}
	
	appliedDeployment, err := h.service.ApplyDeployment(c.Request.Context(), &deployment)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to apply deployment", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"deployment_detail": appliedDeployment})
}

// UpdateDeploymentGin handles deployment updates
func (h *Handler) UpdateDeploymentGin(c *gin.Context) {
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
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid Deployment specification")
		return
	}
	
	var deployment appsv1.Deployment
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &deployment)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML deployment specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &deployment)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON deployment specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	updatedDeployment, err := h.service.UpdateDeployment(c.Request.Context(), namespace, name, &deployment)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Deployment not found", err.Error())
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to update deployment", err.Error())
		}
		return
	}
	common.SendSuccess(c, gin.H{"deployment_detail": updatedDeployment})
}

// DeleteDeploymentGin handles deployment deletion
func (h *Handler) DeleteDeploymentGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	
	err := h.service.DeleteDeployment(c.Request.Context(), namespace, name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to delete deployment", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"message": "Deployment deleted successfully"})
}

// ApplyServiceGin handles service creation/update using apply
func (h *Handler) ApplyServiceGin(c *gin.Context) {
	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}
	
	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid Service specification")
		return
	}
	
	var service corev1.Service
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &service)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML service specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &service)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON service specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	if service.Name == "" && service.ObjectMeta.Name == "" {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Invalid service specification", 
			"Service name is required in metadata.name")
		return
	}
	
	appliedService, err := h.service.ApplyService(c.Request.Context(), &service)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to apply service", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"service_detail": appliedService})
}

// UpdateServiceGin handles service updates
func (h *Handler) UpdateServiceGin(c *gin.Context) {
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
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid Service specification")
		return
	}
	
	var service corev1.Service
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &service)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML service specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &service)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON service specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	updatedService, err := h.service.UpdateService(c.Request.Context(), namespace, name, &service)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Service not found", err.Error())
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to update service", err.Error())
		}
		return
	}
	common.SendSuccess(c, gin.H{"service_detail": updatedService})
}

// DeleteServiceGin handles service deletion
func (h *Handler) DeleteServiceGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	
	err := h.service.DeleteService(c.Request.Context(), namespace, name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to delete service", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"message": "Service deleted successfully"})
}

// Continue with similar patterns for other resources...
// Due to space constraints, I'll add a few more examples and you can follow the pattern

// ApplyIngressGin handles ingress creation/update using apply
func (h *Handler) ApplyIngressGin(c *gin.Context) {
	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}
	
	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid Ingress specification")
		return
	}
	
	var ingress networkingv1.Ingress
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &ingress)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML ingress specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &ingress)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON ingress specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	if ingress.Name == "" && ingress.ObjectMeta.Name == "" {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Invalid ingress specification", 
			"Ingress name is required in metadata.name")
		return
	}
	
	appliedIngress, err := h.service.ApplyIngress(c.Request.Context(), &ingress)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to apply ingress", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"ingress_detail": appliedIngress})
}

// UpdateIngressGin handles ingress updates
func (h *Handler) UpdateIngressGin(c *gin.Context) {
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
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid Ingress specification")
		return
	}
	
	var ingress networkingv1.Ingress
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &ingress)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML ingress specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &ingress)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON ingress specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	updatedIngress, err := h.service.UpdateIngress(c.Request.Context(), namespace, name, &ingress)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Ingress not found", err.Error())
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to update ingress", err.Error())
		}
		return
	}
	common.SendSuccess(c, gin.H{"ingress_detail": updatedIngress})
}

// DeleteIngressGin handles ingress deletion
func (h *Handler) DeleteIngressGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	
	err := h.service.DeleteIngress(c.Request.Context(), namespace, name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to delete ingress", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"message": "Ingress deleted successfully"})
}

// ApplyPVCGin handles PVC creation/update using apply
func (h *Handler) ApplyPVCGin(c *gin.Context) {
	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}
	
	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid PVC specification")
		return
	}
	
	var pvc corev1.PersistentVolumeClaim
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &pvc)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML PVC specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &pvc)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON PVC specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	if pvc.Name == "" && pvc.ObjectMeta.Name == "" {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Invalid PVC specification", 
			"PVC name is required in metadata.name")
		return
	}
	
	appliedPVC, err := h.service.ApplyPVC(c.Request.Context(), &pvc)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to apply PVC", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"pvc_detail": appliedPVC})
}

// UpdatePVCGin handles PVC updates
func (h *Handler) UpdatePVCGin(c *gin.Context) {
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
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid PVC specification")
		return
	}
	
	var pvc corev1.PersistentVolumeClaim
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &pvc)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML PVC specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &pvc)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON PVC specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	updatedPVC, err := h.service.UpdatePVC(c.Request.Context(), namespace, name, &pvc)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "PVC not found", err.Error())
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to update PVC", err.Error())
		}
		return
	}
	common.SendSuccess(c, gin.H{"pvc_detail": updatedPVC})
}

// DeletePVCGin handles PVC deletion
func (h *Handler) DeletePVCGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	
	err := h.service.DeletePVC(c.Request.Context(), namespace, name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to delete PVC", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"message": "PVC deleted successfully"})
}

// ApplyPVGin handles PV creation/update using apply
func (h *Handler) ApplyPVGin(c *gin.Context) {
	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}
	
	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid PV specification")
		return
	}
	
	var pv corev1.PersistentVolume
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &pv)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML PV specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &pv)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON PV specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	if pv.Name == "" && pv.ObjectMeta.Name == "" {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Invalid PV specification", 
			"PV name is required in metadata.name")
		return
	}
	
	appliedPV, err := h.service.ApplyPV(c.Request.Context(), &pv)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to apply PV", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"pv_detail": appliedPV})
}

// UpdatePVGin handles PV updates
func (h *Handler) UpdatePVGin(c *gin.Context) {
	name := c.Param("name")
	
	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}
	
	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid PV specification")
		return
	}
	
	var pv corev1.PersistentVolume
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &pv)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML PV specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &pv)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON PV specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	updatedPV, err := h.service.UpdatePV(c.Request.Context(), name, &pv)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "PV not found", err.Error())
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to update PV", err.Error())
		}
		return
	}
	common.SendSuccess(c, gin.H{"pv_detail": updatedPV})
}

// DeletePVGin handles PV deletion
func (h *Handler) DeletePVGin(c *gin.Context) {
	name := c.Param("name")
	
	err := h.service.DeletePV(c.Request.Context(), name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to delete PV", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"message": "PV deleted successfully"})
}

// ApplySecretGin handles secret creation/update using apply
func (h *Handler) ApplySecretGin(c *gin.Context) {
	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}
	
	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid Secret specification")
		return
	}
	
	var secret corev1.Secret
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &secret)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML secret specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &secret)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON secret specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	if secret.Name == "" && secret.ObjectMeta.Name == "" {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Invalid secret specification", 
			"Secret name is required in metadata.name")
		return
	}
	
	appliedSecret, err := h.service.ApplySecret(c.Request.Context(), &secret)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to apply secret", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"secret_detail": appliedSecret})
}

// UpdateSecretGin handles secret updates
func (h *Handler) UpdateSecretGin(c *gin.Context) {
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
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid Secret specification")
		return
	}
	
	var secret corev1.Secret
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &secret)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML secret specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &secret)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON secret specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	updatedSecret, err := h.service.UpdateSecret(c.Request.Context(), namespace, name, &secret)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Secret not found", err.Error())
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to update secret", err.Error())
		}
		return
	}
	common.SendSuccess(c, gin.H{"secret_detail": updatedSecret})
}

// DeleteSecretGin handles secret deletion
func (h *Handler) DeleteSecretGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	
	err := h.service.DeleteSecret(c.Request.Context(), namespace, name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to delete secret", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"message": "Secret deleted successfully"})
}

// ApplyConfigMapGin handles configmap creation/update using apply
func (h *Handler) ApplyConfigMapGin(c *gin.Context) {
	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}
	
	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid ConfigMap specification")
		return
	}
	
	var configmap corev1.ConfigMap
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &configmap)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML configmap specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &configmap)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON configmap specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	if configmap.Name == "" && configmap.ObjectMeta.Name == "" {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Invalid configmap specification", 
			"ConfigMap name is required in metadata.name")
		return
	}
	
	appliedConfigMap, err := h.service.ApplyConfigMap(c.Request.Context(), &configmap)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to apply configmap", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"configmap_detail": appliedConfigMap})
}

// UpdateConfigMapGin handles configmap updates
func (h *Handler) UpdateConfigMapGin(c *gin.Context) {
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
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid ConfigMap specification")
		return
	}
	
	var configmap corev1.ConfigMap
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &configmap)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML configmap specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &configmap)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON configmap specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	updatedConfigMap, err := h.service.UpdateConfigMap(c.Request.Context(), namespace, name, &configmap)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "ConfigMap not found", err.Error())
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to update configmap", err.Error())
		}
		return
	}
	common.SendSuccess(c, gin.H{"configmap_detail": updatedConfigMap})
}

// DeleteConfigMapGin handles configmap deletion
func (h *Handler) DeleteConfigMapGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	
	err := h.service.DeleteConfigMap(c.Request.Context(), namespace, name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to delete configmap", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"message": "ConfigMap deleted successfully"})
}

// ApplyNamespaceGin handles namespace creation/update using apply
func (h *Handler) ApplyNamespaceGin(c *gin.Context) {
	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}
	
	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid Namespace specification")
		return
	}
	
	var namespace corev1.Namespace
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &namespace)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML namespace specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &namespace)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON namespace specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	if namespace.Name == "" && namespace.ObjectMeta.Name == "" {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Invalid namespace specification", 
			"Namespace name is required in metadata.name")
		return
	}
	
	appliedNamespace, err := h.service.ApplyNamespace(c.Request.Context(), &namespace)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to apply namespace", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"namespace_detail": appliedNamespace})
}

// UpdateNamespaceGin handles namespace updates
func (h *Handler) UpdateNamespaceGin(c *gin.Context) {
	name := c.Param("name")
	
	contentType := c.GetHeader("Content-Type")
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Failed to read request body", err.Error())
		return
	}
	
	if len(body) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Request body is empty", "Please provide a valid Namespace specification")
		return
	}
	
	var namespace corev1.Namespace
	
	switch {
	case strings.Contains(contentType, "application/yaml") || strings.Contains(contentType, "text/yaml"):
		err = yaml.Unmarshal(body, &namespace)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid YAML namespace specification", err.Error())
			return
		}
	case strings.Contains(contentType, "application/json"), contentType == "":
		err = json.Unmarshal(body, &namespace)
		if err != nil {
			common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid JSON namespace specification", err.Error())
			return
		}
	default:
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
			"Unsupported content type", 
			"Content-Type must be 'application/json', 'application/yaml', or 'text/yaml'")
		return
	}
	
	updatedNamespace, err := h.service.UpdateNamespace(c.Request.Context(), name, &namespace)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Namespace not found", err.Error())
		} else {
			common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to update namespace", err.Error())
		}
		return
	}
	common.SendSuccess(c, gin.H{"namespace_detail": updatedNamespace})
}

// DeleteNamespaceGin handles namespace deletion
func (h *Handler) DeleteNamespaceGin(c *gin.Context) {
	name := c.Param("name")
	
	err := h.service.DeleteNamespace(c.Request.Context(), name)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to delete namespace", err.Error())
		return
	}
	common.SendSuccess(c, gin.H{"message": "Namespace deleted successfully"})
}
