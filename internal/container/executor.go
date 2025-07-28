package container

import (
	"os/exec"
)

// Executor implements CommandExecutor interface
type Executor struct{}

// NewExecutor creates a new command executor
func NewExecutor() *Executor {
	return &Executor{}
}

// Execute runs a command and returns the output
func (e *Executor) Execute(command string, args ...string) ([]byte, error) {
	cmd := exec.Command(command, args...)
	return cmd.CombinedOutput()
}
