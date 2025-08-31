package kubernetes

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/awanio/vapor/internal/common"
	"github.com/gin-gonic/gin"
	appsv1 "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
)

// ============================================================================
// DaemonSet Rollout Handlers
// ============================================================================

// RolloutRestartDaemonSetGin handles DaemonSet rollout restart
// This triggers a rolling restart by updating the DaemonSet's annotation
func (h *Handler) RolloutRestartDaemonSetGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	// Get the existing DaemonSet
	daemonSet, err := h.service.client.AppsV1().DaemonSets(namespace).Get(c.Request.Context(), name, metav1.GetOptions{})
	if err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "DaemonSet not found", err.Error())
		return
	}

	// Add/update restart annotation to trigger rollout
	if daemonSet.Spec.Template.ObjectMeta.Annotations == nil {
		daemonSet.Spec.Template.ObjectMeta.Annotations = make(map[string]string)
	}
	daemonSet.Spec.Template.ObjectMeta.Annotations["kubectl.kubernetes.io/restartedAt"] = time.Now().Format(time.RFC3339)

	// Update the DaemonSet
	updatedDaemonSet, err := h.service.client.AppsV1().DaemonSets(namespace).Update(c.Request.Context(), daemonSet, metav1.UpdateOptions{})
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to restart DaemonSet", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"message":   fmt.Sprintf("DaemonSet %s/%s has been restarted", namespace, name),
		"daemonset": updatedDaemonSet,
	})
}

// RolloutUndoDaemonSetGin handles DaemonSet rollout undo
// This reverts the DaemonSet to the previous revision
func (h *Handler) RolloutUndoDaemonSetGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	// Get the current DaemonSet
	daemonSet, err := h.service.client.AppsV1().DaemonSets(namespace).Get(c.Request.Context(), name, metav1.GetOptions{})
	if err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "DaemonSet not found", err.Error())
		return
	}

	// Get the ControllerRevision list for this DaemonSet
	controllerRevisions, err := h.service.client.AppsV1().ControllerRevisions(namespace).List(c.Request.Context(), metav1.ListOptions{
		LabelSelector: metav1.FormatLabelSelector(daemonSet.Spec.Selector),
	})
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get controller revisions", err.Error())
		return
	}

	if len(controllerRevisions.Items) < 2 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "No previous revision available", "The DaemonSet has no previous revision to rollback to")
		return
	}

	// Find the previous revision
	var previousRevision *appsv1.ControllerRevision
	currentRevision := daemonSet.Status.ObservedGeneration

	// Sort by revision number and get the second-to-last
	for i := range controllerRevisions.Items {
		cr := &controllerRevisions.Items[i]
		if cr.Revision < currentRevision && (previousRevision == nil || cr.Revision > previousRevision.Revision) {
			previousRevision = cr
		}
	}

	if previousRevision == nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Could not find previous revision", "Unable to determine the previous revision to rollback to")
		return
	}

	// Parse the data from the previous revision
	var previousDaemonSet appsv1.DaemonSet
	if err := json.Unmarshal(previousRevision.Data.Raw, &previousDaemonSet); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to parse previous revision", err.Error())
		return
	}

	// Update the DaemonSet with the previous template
	daemonSet.Spec.Template = previousDaemonSet.Spec.Template

	// Update the DaemonSet
	updatedDaemonSet, err := h.service.client.AppsV1().DaemonSets(namespace).Update(c.Request.Context(), daemonSet, metav1.UpdateOptions{})
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to rollback DaemonSet", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"message":   fmt.Sprintf("DaemonSet %s/%s has been rolled back to revision %d", namespace, name, previousRevision.Revision),
		"daemonset": updatedDaemonSet,
	})
}

// RolloutSetImageDaemonSetGin handles updating container images in a DaemonSet
func (h *Handler) RolloutSetImageDaemonSetGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	// Parse request body
	var imageUpdates SetDeploymentImagesRequest
	if err := c.ShouldBindJSON(&imageUpdates); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid request body", err.Error())
		return
	}

	if len(imageUpdates) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "No image updates provided", "Please provide at least one container image to update")
		return
	}

	// Build the patch for updating container images
	type patchContainer struct {
		Name  string `json:"name"`
		Image string `json:"image"`
	}

	type patchSpec struct {
		Containers []patchContainer `json:"containers"`
	}

	type patchTemplate struct {
		Spec patchSpec `json:"spec"`
	}

	type patchDaemonSet struct {
		Spec struct {
			Template patchTemplate `json:"template"`
		} `json:"spec"`
	}

	// Get the current DaemonSet to validate container names
	daemonSet, err := h.service.client.AppsV1().DaemonSets(namespace).Get(c.Request.Context(), name, metav1.GetOptions{})
	if err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "DaemonSet not found", err.Error())
		return
	}

	// Build the patch
	patch := patchDaemonSet{}
	patch.Spec.Template.Spec.Containers = make([]patchContainer, 0)

	// Process each image update
	for _, update := range imageUpdates {
		for containerName, newImage := range update {
			// Validate that the container exists in the DaemonSet
			containerExists := false
			for _, container := range daemonSet.Spec.Template.Spec.Containers {
				if container.Name == containerName {
					containerExists = true
					break
				}
			}

			if !containerExists {
				common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest,
					fmt.Sprintf("Container '%s' not found in DaemonSet", containerName),
					"Please provide a valid container name that exists in the DaemonSet")
				return
			}

			patch.Spec.Template.Spec.Containers = append(patch.Spec.Template.Spec.Containers, patchContainer{
				Name:  containerName,
				Image: newImage,
			})
		}
	}

	// Convert patch to JSON
	patchData, err := json.Marshal(patch)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to create patch", err.Error())
		return
	}

	// Apply the patch
	updatedDaemonSet, err := h.service.client.AppsV1().DaemonSets(namespace).Patch(
		c.Request.Context(),
		name,
		types.StrategicMergePatchType,
		patchData,
		metav1.PatchOptions{},
	)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to update DaemonSet images", err.Error())
		return
	}

	// Build response with updated container images
	updatedImages := make(map[string]string)
	for _, container := range updatedDaemonSet.Spec.Template.Spec.Containers {
		updatedImages[container.Name] = container.Image
	}

	common.SendSuccess(c, gin.H{
		"message":        fmt.Sprintf("Successfully updated images for DaemonSet %s/%s", namespace, name),
		"updated_images": updatedImages,
		"daemonset":      updatedDaemonSet,
	})
}

// ============================================================================
// StatefulSet Rollout Handlers
// ============================================================================

// RolloutRestartStatefulSetGin handles StatefulSet rollout restart
// This triggers a rolling restart by updating the StatefulSet's annotation
func (h *Handler) RolloutRestartStatefulSetGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	// Get the existing StatefulSet
	statefulSet, err := h.service.client.AppsV1().StatefulSets(namespace).Get(c.Request.Context(), name, metav1.GetOptions{})
	if err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "StatefulSet not found", err.Error())
		return
	}

	// Add/update restart annotation to trigger rollout
	if statefulSet.Spec.Template.ObjectMeta.Annotations == nil {
		statefulSet.Spec.Template.ObjectMeta.Annotations = make(map[string]string)
	}
	statefulSet.Spec.Template.ObjectMeta.Annotations["kubectl.kubernetes.io/restartedAt"] = time.Now().Format(time.RFC3339)

	// Update the StatefulSet
	updatedStatefulSet, err := h.service.client.AppsV1().StatefulSets(namespace).Update(c.Request.Context(), statefulSet, metav1.UpdateOptions{})
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to restart StatefulSet", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"message":     fmt.Sprintf("StatefulSet %s/%s has been restarted", namespace, name),
		"statefulset": updatedStatefulSet,
	})
}

// RolloutUndoStatefulSetGin handles StatefulSet rollout undo
// This reverts the StatefulSet to the previous revision
func (h *Handler) RolloutUndoStatefulSetGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	// Get the current StatefulSet
	statefulSet, err := h.service.client.AppsV1().StatefulSets(namespace).Get(c.Request.Context(), name, metav1.GetOptions{})
	if err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "StatefulSet not found", err.Error())
		return
	}

	// Get the ControllerRevision list for this StatefulSet
	controllerRevisions, err := h.service.client.AppsV1().ControllerRevisions(namespace).List(c.Request.Context(), metav1.ListOptions{
		LabelSelector: metav1.FormatLabelSelector(statefulSet.Spec.Selector),
	})
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get controller revisions", err.Error())
		return
	}

	if len(controllerRevisions.Items) < 2 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "No previous revision available", "The StatefulSet has no previous revision to rollback to")
		return
	}

	// Find the previous revision
	var previousRevision *appsv1.ControllerRevision
	currentRevision := statefulSet.Status.CurrentRevision

	// Find the highest revision that's less than the current one
	for i := range controllerRevisions.Items {
		cr := &controllerRevisions.Items[i]
		// Compare revision names or use revision number
		if cr.Name != currentRevision && (previousRevision == nil || cr.Revision > previousRevision.Revision) {
			if cr.Revision < statefulSet.Status.ObservedGeneration {
				previousRevision = cr
			}
		}
	}

	if previousRevision == nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Could not find previous revision", "Unable to determine the previous revision to rollback to")
		return
	}

	// Parse the data from the previous revision
	var previousStatefulSet appsv1.StatefulSet
	if err := json.Unmarshal(previousRevision.Data.Raw, &previousStatefulSet); err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to parse previous revision", err.Error())
		return
	}

	// Update the StatefulSet with the previous template
	statefulSet.Spec.Template = previousStatefulSet.Spec.Template

	// Update the StatefulSet
	updatedStatefulSet, err := h.service.client.AppsV1().StatefulSets(namespace).Update(c.Request.Context(), statefulSet, metav1.UpdateOptions{})
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to rollback StatefulSet", err.Error())
		return
	}

	common.SendSuccess(c, gin.H{
		"message":     fmt.Sprintf("StatefulSet %s/%s has been rolled back to revision %d", namespace, name, previousRevision.Revision),
		"statefulset": updatedStatefulSet,
	})
}

// RolloutSetImageStatefulSetGin handles updating container images in a StatefulSet
func (h *Handler) RolloutSetImageStatefulSetGin(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	// Parse request body
	var imageUpdates SetDeploymentImagesRequest
	if err := c.ShouldBindJSON(&imageUpdates); err != nil {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Invalid request body", err.Error())
		return
	}

	if len(imageUpdates) == 0 {
		common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "No image updates provided", "Please provide at least one container image to update")
		return
	}

	// Build the patch for updating container images
	type patchContainer struct {
		Name  string `json:"name"`
		Image string `json:"image"`
	}

	type patchSpec struct {
		Containers []patchContainer `json:"containers"`
	}

	type patchTemplate struct {
		Spec patchSpec `json:"spec"`
	}

	type patchStatefulSet struct {
		Spec struct {
			Template patchTemplate `json:"template"`
		} `json:"spec"`
	}

	// Get the current StatefulSet to validate container names
	statefulSet, err := h.service.client.AppsV1().StatefulSets(namespace).Get(c.Request.Context(), name, metav1.GetOptions{})
	if err != nil {
		common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "StatefulSet not found", err.Error())
		return
	}

	// Build the patch
	patch := patchStatefulSet{}
	patch.Spec.Template.Spec.Containers = make([]patchContainer, 0)

	// Process each image update
	for _, update := range imageUpdates {
		for containerName, newImage := range update {
			// Validate that the container exists in the StatefulSet
			containerExists := false
			for _, container := range statefulSet.Spec.Template.Spec.Containers {
				if container.Name == containerName {
					containerExists = true
					break
				}
			}

			if !containerExists {
				common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest,
					fmt.Sprintf("Container '%s' not found in StatefulSet", containerName),
					"Please provide a valid container name that exists in the StatefulSet")
				return
			}

			patch.Spec.Template.Spec.Containers = append(patch.Spec.Template.Spec.Containers, patchContainer{
				Name:  containerName,
				Image: newImage,
			})
		}
	}

	// Convert patch to JSON
	patchData, err := json.Marshal(patch)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to create patch", err.Error())
		return
	}

	// Apply the patch
	updatedStatefulSet, err := h.service.client.AppsV1().StatefulSets(namespace).Patch(
		c.Request.Context(),
		name,
		types.StrategicMergePatchType,
		patchData,
		metav1.PatchOptions{},
	)
	if err != nil {
		common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to update StatefulSet images", err.Error())
		return
	}

	// Build response with updated container images
	updatedImages := make(map[string]string)
	for _, container := range updatedStatefulSet.Spec.Template.Spec.Containers {
		updatedImages[container.Name] = container.Image
	}

	common.SendSuccess(c, gin.H{
		"message":        fmt.Sprintf("Successfully updated images for StatefulSet %s/%s", namespace, name),
		"updated_images": updatedImages,
		"statefulset":    updatedStatefulSet,
	})
}
