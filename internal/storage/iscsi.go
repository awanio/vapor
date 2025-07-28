package storage

import (
	"fmt"
	"strings"
)

// ISCSIService handles iSCSI operations
type ISCSIService struct {
	executor CommandExecutor
}

// NewISCSIService creates a new iSCSI service
func NewISCSIService(executor CommandExecutor) *ISCSIService {
	return &ISCSIService{executor: executor}
}

// DiscoverTargets discovers iSCSI targets on a portal
func (s *ISCSIService) DiscoverTargets(portal string) ([]ISCSITarget, error) {
	output, err := s.executor.Execute("iscsiadm", "-m", "discovery", "-t", "sendtargets", "-p", portal)
	if err != nil {
		return nil, fmt.Errorf("failed to discover targets: %w", err)
	}

	targets := make([]ISCSITarget, 0)
	lines := strings.Split(string(output), "\n")
	
	for _, line := range lines {
		if line == "" {
			continue
		}
		
		// Parse discovery output: "192.168.1.10:3260,1 iqn.2020-01.com.example:target1"
		parts := strings.Fields(line)
		if len(parts) >= 2 {
			portalInfo := strings.Split(parts[0], ",")
			if len(portalInfo) > 0 {
				target := ISCSITarget{
					Portal: portalInfo[0],
					IQN:    parts[1],
					Name:   parts[1],
				}
				
				// Check if already connected
				target.Connected = s.isTargetConnected(target.IQN)
				
				targets = append(targets, target)
			}
		}
	}

	return targets, nil
}

// GetSessions returns active iSCSI sessions
func (s *ISCSIService) GetSessions() ([]ISCSISession, error) {
	output, err := s.executor.Execute("iscsiadm", "-m", "session")
	if err != nil {
		// No sessions returns exit code 21
		if strings.Contains(err.Error(), "exit status 21") {
			return []ISCSISession{}, nil
		}
		return nil, fmt.Errorf("failed to get sessions: %w", err)
	}

	sessions := make([]ISCSISession, 0)
	lines := strings.Split(string(output), "\n")
	
	for _, line := range lines {
		if line == "" {
			continue
		}
		
		// Parse session output: "tcp: [1] 192.168.1.10:3260,1 iqn.2020-01.com.example:target1"
		if strings.HasPrefix(line, "tcp:") {
			parts := strings.Fields(line)
			if len(parts) >= 4 {
				sessionID := strings.Trim(parts[1], "[]")
				portal := strings.Split(parts[2], ",")[0]
				target := parts[3]
				
				session := ISCSISession{
					Target:    target,
					Portal:    portal,
					SessionID: sessionID,
					State:     "active",
				}
				
				sessions = append(sessions, session)
			}
		}
	}

	return sessions, nil
}

// Login logs into an iSCSI target
func (s *ISCSIService) Login(target, portal string, username, password string) error {
	// Set authentication if provided
	if username != "" && password != "" {
		// Set username
		if _, err := s.executor.Execute("iscsiadm", "-m", "node", "-T", target, "-p", portal,
			"--op=update", "--name", "node.session.auth.authmethod", "--value=CHAP"); err != nil {
			return fmt.Errorf("failed to set auth method: %w", err)
		}
		
		if _, err := s.executor.Execute("iscsiadm", "-m", "node", "-T", target, "-p", portal,
			"--op=update", "--name", "node.session.auth.username", "--value="+username); err != nil {
			return fmt.Errorf("failed to set username: %w", err)
		}
		
		if _, err := s.executor.Execute("iscsiadm", "-m", "node", "-T", target, "-p", portal,
			"--op=update", "--name", "node.session.auth.password", "--value="+password); err != nil {
			return fmt.Errorf("failed to set password: %w", err)
		}
	}

	// Login to target
	if _, err := s.executor.Execute("iscsiadm", "-m", "node", "-T", target, "-p", portal, "--login"); err != nil {
		return fmt.Errorf("failed to login to target: %w", err)
	}

	return nil
}

// Logout logs out from an iSCSI target
func (s *ISCSIService) Logout(target string) error {
	if _, err := s.executor.Execute("iscsiadm", "-m", "node", "-T", target, "--logout"); err != nil {
		return fmt.Errorf("failed to logout from target: %w", err)
	}

	return nil
}

// DeleteNode removes an iSCSI node configuration
func (s *ISCSIService) DeleteNode(target string) error {
	if _, err := s.executor.Execute("iscsiadm", "-m", "node", "-T", target, "--op", "delete"); err != nil {
		return fmt.Errorf("failed to delete node: %w", err)
	}

	return nil
}

// RescanSessions rescans all iSCSI sessions for new LUNs
func (s *ISCSIService) RescanSessions() error {
	if _, err := s.executor.Execute("iscsiadm", "-m", "session", "--rescan"); err != nil {
		return fmt.Errorf("failed to rescan sessions: %w", err)
	}

	return nil
}

// isTargetConnected checks if a target is already connected
func (s *ISCSIService) isTargetConnected(target string) bool {
	sessions, err := s.GetSessions()
	if err != nil {
		return false
	}

	for _, session := range sessions {
		if session.Target == target {
			return true
		}
	}

	return false
}
