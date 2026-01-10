package websocket

import (
	"fmt"
	"io"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	v1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/remotecommand"
)

// PodExecTerminal handles remote command execution in a pod
type PodExecTerminal struct {
	client    *Client
	podName   string
	namespace string
	container string
	sizeChan  chan remotecommand.TerminalSize
	doneChan  chan struct{}
	tty       bool
	inWriter  *io.PipeWriter
	mu        sync.Mutex
}

// Next implements TerminalSizeQueue
func (t *PodExecTerminal) Next() *remotecommand.TerminalSize {
	select {
	case size := <-t.sizeChan:
		return &size
	case <-t.doneChan:
		return nil
	}
}

// ServePodExecWebSocket handles WebSocket requests for pod exec
func ServePodExecWebSocket(hub *Hub, jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		podName := c.Query("pod")
		namespace := c.Query("namespace")
		container := c.Query("container")

		if podName == "" || namespace == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "pod and namespace are required"})
			return
		}

		w := c.Writer
		r := c.Request

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		client := &Client{
			hub:         hub,
			conn:        conn,
			send:        make(chan []byte, 256),
			jwtSecret:   jwtSecret,
			handlerType: "pod-exec",
		}

		// Initialize PodExecTerminal
		client.podExecTerminal = &PodExecTerminal{
			client:    client,
			podName:   podName,
			namespace: namespace,
			container: container,
			sizeChan:  make(chan remotecommand.TerminalSize, 1),
			doneChan:  make(chan struct{}),
			tty:       true,
		}

		client.hub.register <- client

		go client.writePump()
		go client.readPump()
	}
}

// Start initiates the remote command
func (t *PodExecTerminal) Start() {
	c := t.client

	// Get K8s config
	config, err := clientcmd.BuildConfigFromFlags("", clientcmd.RecommendedHomeFile)
	if err != nil {
		config, err = rest.InClusterConfig()
		if err != nil {
			c.sendError("Failed to get k8s config: " + err.Error())
			return
		}
	}

	// Get K8s client
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		c.sendError("Failed to create k8s client: " + err.Error())
		return
	}

	req := clientset.CoreV1().RESTClient().Post().
		Resource("pods").
		Name(t.podName).
		Namespace(t.namespace).
		SubResource("exec")

	req.VersionedParams(&v1.PodExecOptions{
		Container: t.container,
		Command:   []string{"/bin/sh", "-c", "TERM=xterm-256color /bin/bash || /bin/sh"},
		Stdin:     true,
		Stdout:    true,
		Stderr:    true,
		TTY:       t.tty,
	}, scheme.ParameterCodec)

	exec, err := remotecommand.NewSPDYExecutor(config, "POST", req.URL())
	if err != nil {
		c.sendError("Failed to initialize executor: " + err.Error())
		return
	}

	// Bridge streams
	inReader, inWriter := io.Pipe()
	t.inWriter = inWriter

	outWriter := &wsWriter{client: c}

	go func() {
		defer func() {
			close(t.doneChan)
			c.hub.unregister <- c
		}()

		err = exec.Stream(remotecommand.StreamOptions{
			Stdin:             inReader,
			Stdout:            outWriter,
			Stderr:            outWriter,
			TerminalSizeQueue: t,
			Tty:               t.tty,
		})

		if err != nil {
			c.sendError("Stream error: " + err.Error())
		}
	}()

	// Send initial message to indicate connected
	c.sendMessage(Message{
		Type: MessageTypeOutput,
		Payload: TerminalOutput{
			Data: fmt.Sprintf("Connected to pod %s/%s\r\n", t.namespace, t.podName),
		},
	})
}

// WriteInput writes input to the terminal
func (t *PodExecTerminal) WriteInput(data string) error {
	if t.inWriter == nil {
		return fmt.Errorf("terminal not started")
	}
	_, err := t.inWriter.Write([]byte(data))
	return err
}

// Resize resizes the terminal
func (t *PodExecTerminal) Resize(rows, cols uint16) {
	select {
	case t.sizeChan <- remotecommand.TerminalSize{Width: cols, Height: rows}:
	default:
		// Drop if full
	}
}

type wsWriter struct {
	client *Client
}

func (w *wsWriter) Write(p []byte) (n int, err error) {
	data := make([]byte, len(p))
	copy(data, p)

	payload := TerminalOutput{
		Data: string(data),
	}

	msg := Message{
		Type:    MessageTypeOutput,
		Payload: payload,
	}

	w.client.sendMessage(msg)
	return len(p), nil
}
