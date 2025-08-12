package websocket

import (
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
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
func startTerminal(client *Client, username string) *PseudoTerminal {
	log.Printf("Starting terminal session for user: %s", username)

	// Get the shell to use
	shell := os.Getenv("SHELL")
	if shell == "" {
		shell = "/bin/bash"
	}

	// First check if the user exists
	if _, err := exec.Command("id", username).Output(); err != nil {
		log.Printf("ERROR: User '%s' does not exist on the system: %v", username, err)
		client.sendError(fmt.Sprintf("User '%s' does not exist", username))
		return nil
	}
	
	// Use su to switch to the target user
	// -l: login shell, -c: command to execute
	cmd := exec.Command("su", "-l", username, "-c", shell)
	
	// Log terminal session start for audit purposes
	log.Printf("AUDIT: Starting terminal session for user '%s' (authenticated as '%s') from client %s", 
		username, client.username, client.id)
	
	// Set terminal environment
	cmd.Env = append(os.Environ(), "TERM=xterm-256color")

	// Start the command with a pty
	ptmx, err := pty.Start(cmd)
	if err != nil {
		log.Printf("Failed to start pty: %v", err)
		return nil
	}

	log.Println("Starting terminal session...")
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

	// Log terminal session end for audit purposes
	if pt.client != nil {
		log.Printf("AUDIT: Ending terminal session for client %s (user: %s)", pt.client.id, pt.client.username)
	}

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
				Type: MessageTypeOutput,
				Payload: map[string]interface{}{
					"data": "\r\nTerminal session ended.\r\n",
				},
			})
			break
		}

		if n > 0 {
			log.Printf("Sending terminal output: %d bytes", n)
			pt.client.sendMessage(Message{
				Type: MessageTypeOutput,
				Payload: map[string]interface{}{
					"data": string(buf[:n]),
				},
			})
		}
	}
}
