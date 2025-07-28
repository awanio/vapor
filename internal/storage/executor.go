package storage

import (
	"bytes"
	"os/exec"
)

// CommandExecutor interface for executing system commands
type CommandExecutor interface {
	Execute(name string, args ...string) ([]byte, error)
	ExecuteWithInput(input string, name string, args ...string) ([]byte, error)
}

// RealCommandExecutor executes real system commands
type RealCommandExecutor struct{}

// Execute runs a command and returns its output
func (r *RealCommandExecutor) Execute(name string, args ...string) ([]byte, error) {
	cmd := exec.Command(name, args...)
	return cmd.Output()
}

// ExecuteWithInput runs a command with stdin input and returns its output
func (r *RealCommandExecutor) ExecuteWithInput(input string, name string, args ...string) ([]byte, error) {
	cmd := exec.Command(name, args...)
	cmd.Stdin = bytes.NewBufferString(input)
	return cmd.Output()
}

// MockCommandExecutor for testing
type MockCommandExecutor struct {
	// Map of command -> output
	outputs map[string]string
	// Map of command -> error
	errors  map[string]error
	// Track executed commands
	executed []string
}

// NewMockCommandExecutor creates a new mock executor
func NewMockCommandExecutor() *MockCommandExecutor {
	return &MockCommandExecutor{
		outputs:  make(map[string]string),
		errors:   make(map[string]error),
		executed: make([]string, 0),
	}
}

// SetOutput sets the expected output for a command
func (m *MockCommandExecutor) SetOutput(command string, output string) {
	m.outputs[command] = output
}

// SetError sets the expected error for a command
func (m *MockCommandExecutor) SetError(command string, err error) {
	m.errors[command] = err
}

// Execute mocks command execution
func (m *MockCommandExecutor) Execute(name string, args ...string) ([]byte, error) {
	command := name
	if len(args) > 0 {
		command = name + " " + args[0] // Simple key for mocking
	}
	m.executed = append(m.executed, command)
	
	if err, ok := m.errors[command]; ok && err != nil {
		return nil, err
	}
	
	if output, ok := m.outputs[command]; ok {
		return []byte(output), nil
	}
	
	return []byte(""), nil
}

// ExecuteWithInput mocks command execution with input
func (m *MockCommandExecutor) ExecuteWithInput(input string, name string, args ...string) ([]byte, error) {
	return m.Execute(name, args...)
}

// GetExecutedCommands returns the list of executed commands
func (m *MockCommandExecutor) GetExecutedCommands() []string {
	return m.executed
}
