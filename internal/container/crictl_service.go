package container

import (
	"encoding/json"
	"errors"
	"fmt"
)

// DefaultService implements Service using crictl commands
type DefaultService struct {
	executor CommandExecutor
}

// NewContainerService creates a new container service
func NewContainerService(executor CommandExecutor) *DefaultService {
	return &DefaultService{
		executor: executor,
	}
}

// ListContainers lists all containers
func (d *DefaultService) ListContainers() ([]Container, error) {
	output, err := d.executor.Execute("crictl", "ps", "-a", "-o", "json")
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	var result struct {
		Containers []struct {
			ID          string            `json:"id"`
			PodSandboxID string           `json:"podSandboxId"`
			Metadata    struct {
				Name string `json:"name"`
			} `json:"metadata"`
			Image       struct {
				Image string `json:"image"`
			} `json:"image"`
			ImageRef    string            `json:"imageRef"`
			State       string            `json:"state"`
			CreatedAt   string            `json:"createdAt"`
			Labels      map[string]string `json:"labels"`
			Annotations map[string]string `json:"annotations"`
		} `json:"containers"`
	}

	err = json.Unmarshal(output, &result)
	if err != nil {
		return nil, fmt.Errorf("failed to parse container list: %w", err)
	}

	containers := make([]Container, len(result.Containers))
	for i, c := range result.Containers {
		containers[i] = Container{
			ID:          c.ID,
			Name:        c.Metadata.Name,
			Image:       c.Image.Image,
			ImageID:     c.ImageRef,
			CreatedAt:   c.CreatedAt,
			State:       c.State,
			Labels:      c.Labels,
			Annotations: c.Annotations,
		}
	}

	return containers, nil
}

// GetContainerDetails gets detailed information about a container
func (d *DefaultService) GetContainerDetails(containerID string) (*ContainerDetails, error) {
	output, err := d.executor.Execute("crictl", "inspect", containerID)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect container: %w", err)
	}

	var result struct {
		Info struct {
			ID          string            `json:"id"`
			Metadata    struct {
				Name string `json:"name"`
			} `json:"metadata"`
			Image       struct {
				Image string `json:"image"`
			} `json:"image"`
			ImageRef    string            `json:"imageRef"`
			State       string            `json:"state"`
			CreatedAt   string            `json:"createdAt"`
			Labels      map[string]string `json:"labels"`
			Annotations map[string]string `json:"annotations"`
			Envs        []struct {
				Key   string `json:"key"`
				Value string `json:"value"`
			} `json:"envs"`
			Mounts      []struct {
				ContainerPath string `json:"containerPath"`
				HostPath      string `json:"hostPath"`
				Readonly      bool   `json:"readonly"`
			} `json:"mounts"`
		} `json:"info"`
	}

	err = json.Unmarshal(output, &result)
	if err != nil {
		return nil, fmt.Errorf("failed to parse container details: %w", err)
	}

	// Convert envs to string array
	env := make([]string, len(result.Info.Envs))
	for i, e := range result.Info.Envs {
		env[i] = fmt.Sprintf("%s=%s", e.Key, e.Value)
	}

	// Convert mounts
	mounts := make([]ContainerMount, len(result.Info.Mounts))
	for i, m := range result.Info.Mounts {
		mounts[i] = ContainerMount{
			Source:      m.HostPath,
			Destination: m.ContainerPath,
			ReadOnly:    m.Readonly,
		}
	}

	details := &ContainerDetails{
		Container: Container{
			ID:          result.Info.ID,
			Name:        result.Info.Metadata.Name,
			Image:       result.Info.Image.Image,
			ImageID:     result.Info.ImageRef,
			CreatedAt:   result.Info.CreatedAt,
			State:       result.Info.State,
			Labels:      result.Info.Labels,
			Annotations: result.Info.Annotations,
			Mounts:      mounts,
		},
		Env: env,
	}

	return details, nil
}

// CreateContainer creates a new container
func (d *DefaultService) CreateContainer(req ContainerCreateRequest) (*Container, error) {
	// Note: crictl doesn't support direct container creation like docker
	// Containers in CRI are created as part of pods
	// This is a simplified implementation that would need to be enhanced
	// for production use with proper pod sandbox creation
	return nil, errors.New("container creation requires pod sandbox creation - not implemented in this simplified version")
}

// StartContainer starts a container
func (d *DefaultService) StartContainer(containerID string) error {
	_, err := d.executor.Execute("crictl", "start", containerID)
	if err != nil {
		return fmt.Errorf("failed to start container: %w", err)
	}
	return nil
}

// StopContainer stops a container
func (d *DefaultService) StopContainer(containerID string, timeout int) error {
	args := []string{"stop"}
	if timeout > 0 {
		args = append(args, "--timeout", fmt.Sprintf("%d", timeout))
	}
	args = append(args, containerID)

	_, err := d.executor.Execute("crictl", args...)
	if err != nil {
		return fmt.Errorf("failed to stop container: %w", err)
	}
	return nil
}

// RestartContainer restarts a container
func (d *DefaultService) RestartContainer(containerID string) error {
	if err := d.StopContainer(containerID, 10); err != nil {
		return err
	}
	if err := d.StartContainer(containerID); err != nil {
		return err
	}
	return nil
}

// RemoveContainer removes a container
func (d *DefaultService) RemoveContainer(containerID string) error {
	_, err := d.executor.Execute("crictl", "rm", containerID)
	if err != nil {
		return fmt.Errorf("failed to remove container: %w", err)
	}
	return nil
}

// GetContainerLogs fetches logs for a container
func (d *DefaultService) GetContainerLogs(containerID string, options ContainerLogsRequest) (string, error) {
	args := []string{"logs"}
	if options.Follow {
		args = append(args, "--follow")
	}
	if options.Tail > 0 {
		args = append(args, "--tail", fmt.Sprintf("%d", options.Tail))
	}
	if options.Since != "" {
		args = append(args, "--since", options.Since)
	}
	if options.Until != "" {
		args = append(args, "--until", options.Until)
	}
	if options.Timestamps {
		args = append(args, "--timestamps")
	}
	args = append(args, containerID)

	output, err := d.executor.Execute("crictl", args...)
	if err != nil {
		return "", fmt.Errorf("failed to get container logs: %w", err)
	}

	return string(output), nil
}

// ListImages lists all container images
func (d *DefaultService) ListImages() ([]ContainerImage, error) {
	output, err := d.executor.Execute("crictl", "images", "-o", "json")
	if err != nil {
		return nil, fmt.Errorf("failed to list images: %w", err)
	}

	var result struct {
		Images []struct {
			ID          string   `json:"id"`
			RepoTags    []string `json:"repoTags"`
			RepoDigests []string `json:"repoDigests"`
			Size        string   `json:"size"`
			Uid         struct {
				Value string `json:"value"`
			} `json:"uid"`
		} `json:"images"`
	}

	err = json.Unmarshal(output, &result)
	if err != nil {
		return nil, fmt.Errorf("failed to parse image list: %w", err)
	}

	images := make([]ContainerImage, len(result.Images))
	for i, img := range result.Images {
		// Parse size from string (e.g., "71.5MB" -> bytes)
		var size int64
		if img.Size != "" {
			// Simple parsing, can be enhanced
			fmt.Sscanf(img.Size, "%d", &size)
		}

		images[i] = ContainerImage{
			ID:          img.ID,
			RepoTags:    img.RepoTags,
			RepoDigests: img.RepoDigests,
			Size:        size,
		}
	}

	return images, nil
}

// GetImageDetails gets detailed information about an image
func (d *DefaultService) GetImageDetails(imageID string) (*ContainerImage, error) {
	output, err := d.executor.Execute("crictl", "inspecti", imageID)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect image: %w", err)
	}

	var result struct {
		Info struct {
			ID          string   `json:"id"`
			RepoTags    []string `json:"repoTags"`
			RepoDigests []string `json:"repoDigests"`
			Size        string   `json:"size"`
			Username    string   `json:"username"`
		} `json:"info"`
	}

	err = json.Unmarshal(output, &result)
	if err != nil {
		return nil, fmt.Errorf("failed to parse image details: %w", err)
	}

	var size int64
	if result.Info.Size != "" {
		fmt.Sscanf(result.Info.Size, "%d", &size)
	}

	image := &ContainerImage{
		ID:          result.Info.ID,
		RepoTags:    result.Info.RepoTags,
		RepoDigests: result.Info.RepoDigests,
		Size:        size,
	}

	return image, nil
}

// RemoveImage removes a container image
func (d *DefaultService) RemoveImage(imageID string) error {
	_, err := d.executor.Execute("crictl", "rmi", imageID)
	if err != nil {
		return fmt.Errorf("failed to remove image: %w", err)
	}
	return nil
}

// PullImage pulls a container image
func (d *DefaultService) PullImage(imageName string) error {
	_, err := d.executor.Execute("crictl", "pull", imageName)
	if err != nil {
		return fmt.Errorf("failed to pull image: %w", err)
	}
	return nil
}
