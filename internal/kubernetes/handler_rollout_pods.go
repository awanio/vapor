package kubernetes

import (
"encoding/json"
"fmt"
"net/http"

"github.com/awanio/vapor/internal/common"
"github.com/gin-gonic/gin"
corev1 "k8s.io/api/core/v1"
metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
"k8s.io/apimachinery/pkg/types"
)

// ============================================================================
// Pod Rollout Handlers
// ============================================================================
// Note: Pods do not support rollout restart or undo operations since they are
// not managed by a controller. Only direct image updates are supported.

// RolloutSetImagePodGin handles updating container images in a Pod
// This directly modifies the Pod's container images, which will require the Pod
// to be deleted and recreated for the changes to take effect (Pods are immutable).
func (h *Handler) RolloutSetImagePodGin(c *gin.Context) {
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

// Get the current Pod to validate container names
pod, err := h.service.client.CoreV1().Pods(namespace).Get(c.Request.Context(), name, metav1.GetOptions{})
if err != nil {
common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Pod not found", err.Error())
return
}

// Check if the Pod is managed by a controller
if len(pod.OwnerReferences) > 0 {
ownerKind := ""
if len(pod.OwnerReferences) > 0 {
ownerKind = pod.OwnerReferences[0].Kind
}
common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
fmt.Sprintf("Cannot modify Pod managed by %s", ownerKind),
fmt.Sprintf("This Pod is managed by a %s. Please update the %s instead to modify container images.", ownerKind, ownerKind))
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

type patchPod struct {
Spec patchSpec `json:"spec"`
}

// Build the patch
patch := patchPod{}
patch.Spec.Containers = make([]patchContainer, 0)

// Process each image update
updatedContainers := make(map[string]string)
for _, update := range imageUpdates {
for containerName, newImage := range update {
// Validate that the container exists in the Pod
containerExists := false
for _, container := range pod.Spec.Containers {
if container.Name == containerName {
containerExists = true
break
}
}

if !containerExists {
// Check init containers as well
for _, container := range pod.Spec.InitContainers {
if container.Name == containerName {
containerExists = true
common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
fmt.Sprintf("Container '%s' is an init container", containerName),
"Updating init container images is not supported through this endpoint")
return
}
}

if !containerExists {
common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
fmt.Sprintf("Container '%s' not found in Pod", containerName),
"Please provide a valid container name that exists in the Pod")
return
}
}

patch.Spec.Containers = append(patch.Spec.Containers, patchContainer{
Name:  containerName,
Image: newImage,
})
updatedContainers[containerName] = newImage
}
}

// Convert patch to JSON
patchData, err := json.Marshal(patch)
if err != nil {
common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to create patch", err.Error())
return
}

// Apply the patch
// Note: This will fail for running Pods as container images are immutable
updatedPod, err := h.service.client.CoreV1().Pods(namespace).Patch(
c.Request.Context(),
name,
types.StrategicMergePatchType,
patchData,
metav1.PatchOptions{},
)
if err != nil {
// Check if the error is due to Pod immutability
if pod.Status.Phase == corev1.PodRunning || pod.Status.Phase == corev1.PodSucceeded || pod.Status.Phase == corev1.PodFailed {
common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
"Cannot update running Pod", 
fmt.Sprintf("Pod is in %s state. Container images cannot be updated for Pods that have already started. You must delete and recreate the Pod with the new images.", pod.Status.Phase))
return
}
common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to update Pod images", err.Error())
return
}

// Build response with updated container images
finalImages := make(map[string]string)
for _, container := range updatedPod.Spec.Containers {
finalImages[container.Name] = container.Image
}

response := gin.H{
"message":        fmt.Sprintf("Successfully updated images for Pod %s/%s", namespace, name),
"updated_images": updatedContainers,
"pod":           updatedPod,
}

// Add warning if Pod needs to be recreated
if pod.Status.Phase != corev1.PodPending {
response["warning"] = "Pod image update was applied to the specification, but the Pod must be deleted and recreated for changes to take effect."
}

common.SendSuccess(c, response)
}
