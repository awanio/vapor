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

// RolloutRestartDeploymentGin handles deployment rollout restart
// This triggers a rolling restart by updating the deployment's annotation
func (h *Handler) RolloutRestartDeploymentGin(c *gin.Context) {
namespace := c.Param("namespace")
name := c.Param("name")

// Get the existing deployment
deployment, err := h.service.client.AppsV1().Deployments(namespace).Get(c.Request.Context(), name, metav1.GetOptions{})
if err != nil {
common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Deployment not found", err.Error())
return
}

// Add/update restart annotation to trigger rollout
if deployment.Spec.Template.ObjectMeta.Annotations == nil {
deployment.Spec.Template.ObjectMeta.Annotations = make(map[string]string)
}
deployment.Spec.Template.ObjectMeta.Annotations["kubectl.kubernetes.io/restartedAt"] = time.Now().Format(time.RFC3339)

// Update the deployment
updatedDeployment, err := h.service.client.AppsV1().Deployments(namespace).Update(c.Request.Context(), deployment, metav1.UpdateOptions{})
if err != nil {
common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to restart deployment", err.Error())
return
}

common.SendSuccess(c, gin.H{
"message": fmt.Sprintf("Deployment %s/%s has been restarted", namespace, name),
"deployment": updatedDeployment,
})
}

// RolloutUndoDeploymentGin handles deployment rollout undo
// This reverts the deployment to the previous revision
func (h *Handler) RolloutUndoDeploymentGin(c *gin.Context) {
namespace := c.Param("namespace")
name := c.Param("name")

// Get the current deployment
deployment, err := h.service.client.AppsV1().Deployments(namespace).Get(c.Request.Context(), name, metav1.GetOptions{})
if err != nil {
common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Deployment not found", err.Error())
return
}

// Get the ReplicaSet list for this deployment
replicaSets, err := h.service.client.AppsV1().ReplicaSets(namespace).List(c.Request.Context(), metav1.ListOptions{
LabelSelector: metav1.FormatLabelSelector(deployment.Spec.Selector),
})
if err != nil {
common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to get replica sets", err.Error())
return
}

if len(replicaSets.Items) < 2 {
common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "No previous revision available", "The deployment has no previous revision to rollback to")
return
}

// Find the previous revision
var previousRS *appsv1.ReplicaSet
var currentRevision int64

// Get current revision from deployment
if deployment.Annotations != nil {
if revStr, ok := deployment.Annotations["deployment.kubernetes.io/revision"]; ok {
fmt.Sscanf(revStr, "%d", &currentRevision)
}
}

// Find the replica set with revision = current - 1
targetRevision := currentRevision - 1
if targetRevision < 1 {
targetRevision = 1
}

for i := range replicaSets.Items {
rs := &replicaSets.Items[i]
if rs.Annotations != nil {
if revStr, ok := rs.Annotations["deployment.kubernetes.io/revision"]; ok {
var revision int64
fmt.Sscanf(revStr, "%d", &revision)
if revision == targetRevision {
previousRS = rs
break
}
}
}
}

if previousRS == nil {
// If we couldn't find the exact previous revision, just get the second most recent
// This is a simplified approach - in production you might want more sophisticated logic
common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, "Could not find previous revision", "Unable to determine the previous revision to rollback to")
return
}

// Update the deployment with the previous replica set's template
deployment.Spec.Template = previousRS.Spec.Template

// Update the deployment
updatedDeployment, err := h.service.client.AppsV1().Deployments(namespace).Update(c.Request.Context(), deployment, metav1.UpdateOptions{})
if err != nil {
common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to rollback deployment", err.Error())
return
}

common.SendSuccess(c, gin.H{
"message": fmt.Sprintf("Deployment %s/%s has been rolled back to revision %d", namespace, name, targetRevision),
"deployment": updatedDeployment,
})
}

// SetDeploymentImagesRequest represents the request body for setting deployment images
type SetDeploymentImagesRequest []map[string]string

// RolloutSetImageDeploymentGin handles updating container images in a deployment
func (h *Handler) RolloutSetImageDeploymentGin(c *gin.Context) {
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
// We'll use a strategic merge patch to update specific containers
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

type patchDeployment struct {
Spec struct {
Template patchTemplate `json:"template"`
} `json:"spec"`
}

// Get the current deployment to validate container names
deployment, err := h.service.client.AppsV1().Deployments(namespace).Get(c.Request.Context(), name, metav1.GetOptions{})
if err != nil {
common.SendError(c, http.StatusNotFound, common.ErrCodeNotFound, "Deployment not found", err.Error())
return
}

// Build the patch
patch := patchDeployment{}
patch.Spec.Template.Spec.Containers = make([]patchContainer, 0)

// Process each image update
for _, update := range imageUpdates {
for containerName, newImage := range update {
// Validate that the container exists in the deployment
containerExists := false
for _, container := range deployment.Spec.Template.Spec.Containers {
if container.Name == containerName {
containerExists = true
break
}
}

if !containerExists {
common.SendError(c, http.StatusBadRequest, common.ErrCodeBadRequest, 
fmt.Sprintf("Container '%s' not found in deployment", containerName),
"Please provide a valid container name that exists in the deployment")
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
updatedDeployment, err := h.service.client.AppsV1().Deployments(namespace).Patch(
c.Request.Context(),
name,
types.StrategicMergePatchType,
patchData,
metav1.PatchOptions{},
)
if err != nil {
common.SendError(c, http.StatusInternalServerError, common.ErrCodeInternal, "Failed to update deployment images", err.Error())
return
}

// Build response with updated container images
updatedImages := make(map[string]string)
for _, container := range updatedDeployment.Spec.Template.Spec.Containers {
updatedImages[container.Name] = container.Image
}

common.SendSuccess(c, gin.H{
"message": fmt.Sprintf("Successfully updated images for deployment %s/%s", namespace, name),
"updated_images": updatedImages,
"deployment": updatedDeployment,
})
}
