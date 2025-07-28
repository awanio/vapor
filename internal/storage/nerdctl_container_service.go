package storage

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// NerdctlContainerService implements ContainerService using nerdctl commands
type NerdctlContainerService struct {
	executor CommandExecutor
}

// NewNerdctlContainerService creates a new nerdctl-based container service
func NewNerdctlContainerService(executor CommandExecutor) *NerdctlContainerService {
	return &NerdctlContainerService{
		executor: executor,
	}
}

// ListContainers lists all containers using nerdctl
func (n *NerdctlContainerService) ListContainers() ([]Container, error) {
	output, err := n.executor.Execute("nerdctl", "ps", "-a", "--format", "json")
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	var containers []Container
	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	
	for _, line := range lines {
		if line == "" {
			continue
		}
		
		var nerdctlContainer struct {
			Command   string            `json:"Command"`
			CreatedAt string            `json:"CreatedAt"`
			ID        string            `json:"ID"`
			Image     string            `json:"Image"`
			Labels    map[string]string `json:"Labels"`
			Names     string            `json:"Names"`
			Networks  string            `json:"Networks"`
			Ports     string            `json:"Ports"`
			State     string            `json:"State"`
			Status    string            `json:"Status"`
		}
		
		if err := json.Unmarshal([]byte(line), &nerdctlContainer); err != nil {
			continue
		}
		
		// Parse ports
		var ports []ContainerPort
		if nerdctlContainer.Ports != "" {
			// Parse port mappings like "0.0.0.0:8080->80/tcp"
			portPairs := strings.Split(nerdctlContainer.Ports, ", ")
			for _, pair := range portPairs {
				parts := strings.Split(pair, "->")
				if len(parts) == 2 {
					hostParts := strings.Split(parts[0], ":")
					containerParts := strings.Split(parts[1], "/")
					if len(hostParts) >= 2 && len(containerParts) >= 1 {
						hostPort, _ := strconv.Atoi(hostParts[len(hostParts)-1])
						containerPort, _ := strconv.Atoi(containerParts[0])
						protocol := "tcp"
						if len(containerParts) > 1 {
							protocol = containerParts[1]
						}
						ports = append(ports, ContainerPort{
							HostPort:      hostPort,
							ContainerPort: containerPort,
							Protocol:      protocol,
							HostIP:        hostParts[0],
						})
					}
				}
			}
		}
		
		container := Container{
			ID:        nerdctlContainer.ID,
			Name:      strings.TrimPrefix(nerdctlContainer.Names, "/"),
			Image:     nerdctlContainer.Image,
			State:     strings.ToLower(nerdctlContainer.State),
			Status:    nerdctlContainer.Status,
			CreatedAt: nerdctlContainer.CreatedAt,
			Labels:    nerdctlContainer.Labels,
			Ports:     ports,
		}
		
		containers = append(containers, container)
	}

	return containers, nil
}

// GetContainerDetails gets detailed information about a container
func (n *NerdctlContainerService) GetContainerDetails(containerID string) (*ContainerDetails, error) {
	output, err := n.executor.Execute("nerdctl", "inspect", containerID)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect container: %w", err)
	}

	var inspectResults []struct {
		ID      string `json:"Id"`
		Created string `json:"Created"`
		Path    string `json:"Path"`
		Args    []string `json:"Args"`
		State   struct {
			Status     string    `json:"Status"`
			Running    bool      `json:"Running"`
			Paused     bool      `json:"Paused"`
			Restarting bool      `json:"Restarting"`
			OOMKilled  bool      `json:"OOMKilled"`
			Dead       bool      `json:"Dead"`
			Pid        int       `json:"Pid"`
			ExitCode   int       `json:"ExitCode"`
			Error      string    `json:"Error"`
			StartedAt  string    `json:"StartedAt"`
			FinishedAt string    `json:"FinishedAt"`
		} `json:"State"`
		Image string `json:"Image"`
		Name  string `json:"Name"`
		Config struct {
			Hostname     string              `json:"Hostname"`
			User         string              `json:"User"`
			Env          []string            `json:"Env"`
			Cmd          []string            `json:"Cmd"`
			WorkingDir   string              `json:"WorkingDir"`
			Labels       map[string]string   `json:"Labels"`
		} `json:"Config"`
		Mounts []struct {
			Type        string `json:"Type"`
			Source      string `json:"Source"`
			Destination string `json:"Destination"`
			Mode        string `json:"Mode"`
			RW          bool   `json:"RW"`
		} `json:"Mounts"`
		NetworkSettings struct {
			Networks map[string]struct {
				IPAddress   string `json:"IPAddress"`
				Gateway     string `json:"Gateway"`
				MacAddress  string `json:"MacAddress"`
			} `json:"Networks"`
		} `json:"NetworkSettings"`
	}

	if err := json.Unmarshal([]byte(output), &inspectResults); err != nil {
		return nil, fmt.Errorf("failed to parse container details: %w", err)
	}

	if len(inspectResults) == 0 {
		return nil, fmt.Errorf("no container found with ID: %s", containerID)
	}

	result := inspectResults[0]

	// Convert mounts
	mounts := make([]ContainerMount, len(result.Mounts))
	for i, m := range result.Mounts {
		mounts[i] = ContainerMount{
			Source:      m.Source,
			Destination: m.Destination,
			Type:        m.Type,
			ReadOnly:    !m.RW,
		}
	}

	// Convert networks
	var networks []ContainerNetwork
	for name, net := range result.NetworkSettings.Networks {
		networks = append(networks, ContainerNetwork{
			Name:       name,
			IPAddress:  net.IPAddress,
			Gateway:    net.Gateway,
			MACAddress: net.MacAddress,
		})
	}

	// Determine state string
	state := "unknown"
	if result.State.Running {
		state = "running"
	} else if result.State.Paused {
		state = "paused"
	} else if result.State.Dead {
		state = "dead"
	} else {
		state = "exited"
	}

	// Build command array
	command := append([]string{result.Path}, result.Args...)

	details := &ContainerDetails{
		Container: Container{
			ID:        result.ID,
			Name:      strings.TrimPrefix(result.Name, "/"),
			Image:     result.Image,
			Command:   command,
			CreatedAt: result.Created,
			State:     state,
			PID:       result.State.Pid,
			ExitCode:  result.State.ExitCode,
			Labels:    result.Config.Labels,
			Mounts:    mounts,
			Runtime:   "containerd",
		},
		Env:        result.Config.Env,
		Hostname:   result.Config.Hostname,
		User:       result.Config.User,
		WorkingDir: result.Config.WorkingDir,
		Networks:   networks,
	}

	return details, nil
}

// CreateContainer creates a new container using nerdctl
func (n *NerdctlContainerService) CreateContainer(req ContainerCreateRequest) (*Container, error) {
	args := []string{"run", "-d", "--name", req.Name}

	// Add environment variables
	for _, env := range req.Env {
		args = append(args, "-e", env)
	}

	// Add port mappings
	for _, port := range req.Ports {
		portMapping := fmt.Sprintf("%s:%d:%d/%s", 
			port.HostIP, port.HostPort, port.ContainerPort, port.Protocol)
		args = append(args, "-p", portMapping)
	}

	// Add volume mounts
	for _, mount := range req.Mounts {
		mountStr := fmt.Sprintf("%s:%s", mount.Source, mount.Destination)
		if mount.ReadOnly {
			mountStr += ":ro"
		}
		args = append(args, "-v", mountStr)
	}

	// Add labels
	for key, value := range req.Labels {
		args = append(args, "--label", fmt.Sprintf("%s=%s", key, value))
	}

	// Add hostname
	if req.Hostname != "" {
		args = append(args, "--hostname", req.Hostname)
	}

	// Add user
	if req.User != "" {
		args = append(args, "--user", req.User)
	}

	// Add working directory
	if req.WorkingDir != "" {
		args = append(args, "--workdir", req.WorkingDir)
	}

	// Add privileged flag
	if req.Privileged {
		args = append(args, "--privileged")
	}

	// Add network mode
	if req.NetworkMode != "" {
		args = append(args, "--network", req.NetworkMode)
	}

	// Add resource limits
	if req.Resources.CPUShares > 0 {
		args = append(args, "--cpu-shares", fmt.Sprintf("%d", req.Resources.CPUShares))
	}
	if req.Resources.MemoryLimit > 0 {
		args = append(args, "--memory", fmt.Sprintf("%d", req.Resources.MemoryLimit))
	}

	// Add image
	args = append(args, req.Image)

	// Add command
	if len(req.Command) > 0 {
		args = append(args, req.Command...)
	}

	output, err := n.executor.Execute("nerdctl", args...)
	if err != nil {
		return nil, fmt.Errorf("failed to create container: %w", err)
	}

	containerID := strings.TrimSpace(string(output))

	// Get container details
	containers, err := n.ListContainers()
	if err != nil {
		return nil, err
	}

	for _, container := range containers {
		if container.ID == containerID || strings.HasPrefix(containerID, container.ID) {
			return &container, nil
		}
	}

	return &Container{ID: containerID, Name: req.Name}, nil
}

// StartContainer starts a container
func (n *NerdctlContainerService) StartContainer(containerID string) error {
	_, err := n.executor.Execute("nerdctl", "start", containerID)
	if err != nil {
		return fmt.Errorf("failed to start container: %w", err)
	}
	return nil
}

// StopContainer stops a container
func (n *NerdctlContainerService) StopContainer(containerID string, timeout int) error {
	args := []string{"stop"}
	if timeout > 0 {
		args = append(args, "-t", fmt.Sprintf("%d", timeout))
	}
	args = append(args, containerID)
	
	_, err := n.executor.Execute("nerdctl", args...)
	if err != nil {
		return fmt.Errorf("failed to stop container: %w", err)
	}
	return nil
}

// RestartContainer restarts a container
func (n *NerdctlContainerService) RestartContainer(containerID string) error {
	_, err := n.executor.Execute("nerdctl", "restart", containerID)
	if err != nil {
		return fmt.Errorf("failed to restart container: %w", err)
	}
	return nil
}

// RemoveContainer removes a container
func (n *NerdctlContainerService) RemoveContainer(containerID string) error {
	_, err := n.executor.Execute("nerdctl", "rm", "-f", containerID)
	if err != nil {
		return fmt.Errorf("failed to remove container: %w", err)
	}
	return nil
}

// GetContainerLogs fetches logs for a container
func (n *NerdctlContainerService) GetContainerLogs(containerID string, options ContainerLogsRequest) (string, error) {
	args := []string{"logs"}
	if options.Follow {
		args = append(args, "-f")
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
		args = append(args, "-t")
	}
	args = append(args, containerID)

	output, err := n.executor.Execute("nerdctl", args...)
	if err != nil {
		return "", fmt.Errorf("failed to get container logs: %w", err)
	}

	return string(output), nil
}

// ListImages lists all container images
func (n *NerdctlContainerService) ListImages() ([]ContainerImage, error) {
	output, err := n.executor.Execute("nerdctl", "images", "--format", "json")
	if err != nil {
		return nil, fmt.Errorf("failed to list images: %w", err)
	}

	var images []ContainerImage
	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	
	for _, line := range lines {
		if line == "" {
			continue
		}
		
		var nerdctlImage struct {
			Repository string `json:"Repository"`
			Tag        string `json:"Tag"`
			Digest     string `json:"Digest"`
			ID         string `json:"ID"`
			CreatedAt  string `json:"CreatedAt"`
			Size       string `json:"Size"`
		}
		
		if err := json.Unmarshal([]byte(line), &nerdctlImage); err != nil {
			continue
		}
		
		// Parse size
		var size int64
		if nerdctlImage.Size != "" {
			// Parse size like "71.5MB" to bytes
			size = parseSize(nerdctlImage.Size)
		}
		
		repoTag := nerdctlImage.Repository
		if nerdctlImage.Tag != "" && nerdctlImage.Tag != "<none>" {
			repoTag = fmt.Sprintf("%s:%s", nerdctlImage.Repository, nerdctlImage.Tag)
		}
		
		image := ContainerImage{
			ID:        nerdctlImage.ID,
			RepoTags:  []string{repoTag},
			Size:      size,
			CreatedAt: nerdctlImage.CreatedAt,
		}
		
		if nerdctlImage.Digest != "" {
			image.RepoDigests = []string{fmt.Sprintf("%s@%s", nerdctlImage.Repository, nerdctlImage.Digest)}
		}
		
		images = append(images, image)
	}

	return images, nil
}

// GetImageDetails gets detailed information about an image
func (n *NerdctlContainerService) GetImageDetails(imageID string) (*ContainerImage, error) {
	output, err := n.executor.Execute("nerdctl", "inspect", "--type", "image", imageID)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect image: %w", err)
	}

	var inspectResults []struct {
		ID          string    `json:"Id"`
		RepoTags    []string  `json:"RepoTags"`
		RepoDigests []string  `json:"RepoDigests"`
		Created     time.Time `json:"Created"`
		Size        int64     `json:"Size"`
		Architecture string   `json:"Architecture"`
		OS          string    `json:"Os"`
		Config      struct {
			Labels map[string]string `json:"Labels"`
		} `json:"Config"`
	}

	if err := json.Unmarshal([]byte(output), &inspectResults); err != nil {
		return nil, fmt.Errorf("failed to parse image details: %w", err)
	}

	if len(inspectResults) == 0 {
		return nil, fmt.Errorf("no image found with ID: %s", imageID)
	}

	result := inspectResults[0]

	image := &ContainerImage{
		ID:           result.ID,
		RepoTags:     result.RepoTags,
		RepoDigests:  result.RepoDigests,
		Size:         result.Size,
		CreatedAt:    result.Created.Format(time.RFC3339),
		Labels:       result.Config.Labels,
		Architecture: result.Architecture,
		OS:           result.OS,
	}

	return image, nil
}

// RemoveImage removes a container image
func (n *NerdctlContainerService) RemoveImage(imageID string) error {
	_, err := n.executor.Execute("nerdctl", "rmi", imageID)
	if err != nil {
		return fmt.Errorf("failed to remove image: %w", err)
	}
	return nil
}

// PullImage pulls a container image
func (n *NerdctlContainerService) PullImage(imageName string) error {
	_, err := n.executor.Execute("nerdctl", "pull", imageName)
	if err != nil {
		return fmt.Errorf("failed to pull image: %w", err)
	}
	return nil
}

// parseSize converts size strings like "71.5MB" to bytes
func parseSize(sizeStr string) int64 {
	sizeStr = strings.TrimSpace(sizeStr)
	if sizeStr == "" {
		return 0
	}

	// Remove any spaces
	sizeStr = strings.ReplaceAll(sizeStr, " ", "")

	// Define unit multipliers
	units := map[string]int64{
		"B":   1,
		"KB":  1024,
		"MB":  1024 * 1024,
		"GB":  1024 * 1024 * 1024,
		"TB":  1024 * 1024 * 1024 * 1024,
		"KiB": 1024,
		"MiB": 1024 * 1024,
		"GiB": 1024 * 1024 * 1024,
		"TiB": 1024 * 1024 * 1024 * 1024,
	}

	for unit, multiplier := range units {
		if strings.HasSuffix(strings.ToUpper(sizeStr), unit) {
			numStr := strings.TrimSuffix(strings.ToUpper(sizeStr), unit)
			if val, err := strconv.ParseFloat(numStr, 64); err == nil {
				return int64(val * float64(multiplier))
			}
		}
	}

	// Try to parse as raw number
	if val, err := strconv.ParseInt(sizeStr, 10, 64); err == nil {
		return val
	}

	return 0
}
