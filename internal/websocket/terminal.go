package websocket

import (
	"io"
	"log"
	"os"
	"os/exec"
	"runtime"
	"sync"

	"github.com/creack/pty"
)

// PseudoTerminal represents a pseudo-terminal session
type PseudoTerminal struct {
	cmd    *exec.Cmd
	pty    *os.File
	client *Client
	mu     sync.Mutex
}

// startTerminal starts a new terminal session for the client
func startTerminal(client *Client) *PseudoTerminal {
	// Get the shell to use
	shell := os.Getenv("SHELL")
	if shell == "" {
		if runtime.GOOS == "windows" {
			shell = "cmd.exe"
		} else {
			shell = "/bin/bash"
		}
	}

	// Create command
	cmd := exec.Command(shell)
	cmd.Env = append(os.Environ(), "TERM=xterm-256color")

	// Start the command with a pty
	ptmx, err := pty.Start(cmd)
	if err != nil {
		log.Printf("Failed to start pty: %v", err)
		return nil
	}

	pt := &PseudoTerminal{
		cmd:    cmd,
		pty:    ptmx,
		client: client,
	}

	// Start reading from pty
	go pt.readLoop()

	return pt
}

// Write writes data to the terminal
func (pt *PseudoTerminal) Write(data []byte) error {
	pt.mu.Lock()
	defer pt.mu.Unlock()

	_, err := pt.pty.Write(data)
	return err
}

// SetSize sets the terminal size
func (pt *PseudoTerminal) SetSize(rows, cols int) error {
	return pty.Setsize(pt.pty, &pty.Winsize{
		Rows: uint16(rows),
		Cols: uint16(cols),
	})
}

// Close closes the terminal session
func (pt *PseudoTerminal) Close() error {
	pt.mu.Lock()
	defer pt.mu.Unlock()

	if pt.pty != nil {
		pt.pty.Close()
	}
	if pt.cmd != nil && pt.cmd.Process != nil {
		pt.cmd.Process.Kill()
	}
	return nil
}

// readLoop continuously reads from the pty and sends to the client
func (pt *PseudoTerminal) readLoop() {
	buf := make([]byte, 4096)
	for {
		n, err := pt.pty.Read(buf)
		if err != nil {
			if err != io.EOF {
				log.Printf("Error reading from pty: %v", err)
			}
			pt.client.sendMessage(Message{
				Type: MessageTypeData,
				Payload: TerminalOutput{
					Data: "\r\nTerminal session ended.\r\n",
				},
			})
			break
		}

		if n > 0 {
			pt.client.sendMessage(Message{
				Type: MessageTypeData,
				Payload: TerminalOutput{
					Data: string(buf[:n]),
				},
			})
		}
	}
}
