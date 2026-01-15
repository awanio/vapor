package websocket

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/creack/pty"
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/gin-gonic/gin"
)

// ContainerExecTerminal handles remote command execution in a container
// Supports Docker and CRI runtimes (best-effort for CRI via crictl)
type ContainerExecTerminal struct {
	client        *Client
	containerID   string
	runtime       string
	activeRuntime string

	dockerClient *client.Client
	dockerExecID string
	dockerConn   net.Conn
	dockerResp   types.HijackedResponse

	criCmd *exec.Cmd
	criPty *os.File

	mu sync.Mutex
}

// ServeContainerExecWebSocket handles WebSocket requests for container exec
func ServeContainerExecWebSocket(hub *Hub, jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		containerID := c.Query("container")
		runtime := c.Query("runtime")

		if containerID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "container is required"})
			return
		}

		w := c.Writer
		r := c.Request

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		client := &Client{
			hub:           hub,
			conn:          conn,
			send:          make(chan []byte, 256),
			jwtSecret:     jwtSecret,
			handlerType:   "container-exec",
			subscriptions: make(map[string]bool),
		}

		client.containerExecTerminal = &ContainerExecTerminal{
			client:      client,
			containerID: containerID,
			runtime:     runtime,
		}

		client.hub.register <- client

		go client.writePump()
		go client.readPump()
	}
}

// Start initiates the exec session
func (t *ContainerExecTerminal) Start() {
	runtime := strings.ToLower(strings.TrimSpace(t.runtime))
	var err error

	switch runtime {
	case "docker":
		err = t.startDockerExec()
	case "cri", "containerd", "cri-o":
		err = t.startCRIExec()
	default:
		// Auto-detect: try Docker first, then CRI
		err = t.startDockerExec()
		if err != nil {
			err = t.startCRIExec()
		}
	}

	if err != nil {
		t.client.sendError(err.Error())
	}
}

func (t *ContainerExecTerminal) startDockerExec() error {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return fmt.Errorf("failed to create Docker client: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if _, err := cli.Ping(ctx); err != nil {
		_ = cli.Close()
		return fmt.Errorf("failed to ping Docker daemon: %w", err)
	}

	cmd := []string{"/bin/sh", "-c", "TERM=xterm-256color /bin/bash || /bin/sh"}
	execConfig := types.ExecConfig{
		AttachStdout: true,
		AttachStderr: true,
		AttachStdin:  true,
		Tty:          true,
		Cmd:          cmd,
	}
	resp, err := cli.ContainerExecCreate(ctx, t.containerID, execConfig)
	if err != nil {
		_ = cli.Close()
		return fmt.Errorf("failed to create Docker exec: %w", err)
	}

	attach, err := cli.ContainerExecAttach(ctx, resp.ID, types.ExecStartCheck{Tty: true})
	if err != nil {
		_ = cli.Close()
		return fmt.Errorf("failed to attach Docker exec: %w", err)
	}

	t.mu.Lock()
	t.dockerClient = cli
	t.dockerExecID = resp.ID
	t.dockerResp = attach
	t.dockerConn = attach.Conn
	t.activeRuntime = "docker"
	t.mu.Unlock()

	// Start streaming output
	go func() {
		defer func() {
			t.Close()
			t.client.hub.unregister <- t.client
		}()
		_, copyErr := io.Copy(&wsWriter{client: t.client}, attach.Reader)
		if copyErr != nil {
			t.client.sendError("Stream error: " + copyErr.Error())
		}
	}()

	t.client.sendMessage(Message{
		Type: MessageTypeOutput,
		Payload: TerminalOutput{
			Data: fmt.Sprintf("Connected to container %s\r\n", t.containerID),
		},
	})

	return nil
}

func (t *ContainerExecTerminal) startCRIExec() error {
	if _, err := exec.LookPath("crictl"); err != nil {
		return fmt.Errorf("crictl not found in PATH: %w", err)
	}

	cmd := exec.Command("crictl", "exec", "-it", t.containerID, "/bin/sh", "-c", "TERM=xterm-256color /bin/bash || /bin/sh")
	ptmx, err := pty.Start(cmd)
	if err != nil {
		return fmt.Errorf("failed to start crictl exec: %w", err)
	}

	t.mu.Lock()
	t.criCmd = cmd
	t.criPty = ptmx
	t.activeRuntime = "cri"
	t.mu.Unlock()

	go func() {
		defer func() {
			t.Close()
			t.client.hub.unregister <- t.client
		}()

		buf := make([]byte, 4096)
		for {
			n, readErr := ptmx.Read(buf)
			if readErr != nil {
				if readErr != io.EOF {
					t.client.sendError("Stream error: " + readErr.Error())
				}
				break
			}
			if n > 0 {
				_, _ = (&wsWriter{client: t.client}).Write(buf[:n])
			}
		}
	}()

	t.client.sendMessage(Message{
		Type: MessageTypeOutput,
		Payload: TerminalOutput{
			Data: fmt.Sprintf("Connected to container %s\r\n", t.containerID),
		},
	})

	return nil
}

// WriteInput writes input to the exec session
func (t *ContainerExecTerminal) WriteInput(data string) error {
	t.mu.Lock()
	defer t.mu.Unlock()

	switch t.activeRuntime {
	case "docker":
		if t.dockerConn == nil {
			return fmt.Errorf("terminal not started")
		}
		_, err := t.dockerConn.Write([]byte(data))
		return err
	case "cri":
		if t.criPty == nil {
			return fmt.Errorf("terminal not started")
		}
		_, err := t.criPty.Write([]byte(data))
		return err
	default:
		return fmt.Errorf("terminal not started")
	}
}

// Resize resizes the exec terminal
func (t *ContainerExecTerminal) Resize(rows, cols uint16) {
	t.mu.Lock()
	defer t.mu.Unlock()

	switch t.activeRuntime {
	case "docker":
		if t.dockerClient == nil || t.dockerExecID == "" {
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = t.dockerClient.ContainerExecResize(ctx, t.dockerExecID, container.ResizeOptions{Height: uint(rows), Width: uint(cols)})
	case "cri":
		if t.criPty == nil {
			return
		}
		_ = pty.Setsize(t.criPty, &pty.Winsize{Rows: rows, Cols: cols})
	}
}

// Close closes the exec session resources
func (t *ContainerExecTerminal) Close() {
	t.mu.Lock()
	defer t.mu.Unlock()

	if t.dockerClient != nil {
		_ = t.dockerClient.Close()
		t.dockerClient = nil
	}

	if t.dockerConn != nil {
		_ = t.dockerConn.Close()
		t.dockerConn = nil
	}

	if t.criPty != nil {
		_ = t.criPty.Close()
		t.criPty = nil
	}

	if t.criCmd != nil && t.criCmd.Process != nil {
		_ = t.criCmd.Process.Kill()
		t.criCmd = nil
	}
}
