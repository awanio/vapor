/**
 * Terminal WebSocket Connection Validation Utilities
 * 
 * This module provides methods to validate and monitor WebSocket terminal connections
 * to ensure they are properly closed when terminal tabs are closed.
 */

import { terminalSessions } from '../stores/shared/terminal';
// Unused imports - TODO: Use these for session management in future
// import { activeSessionId, sessionList } from '../stores/shared/terminal';
import type { TerminalSessionState } from '../stores/shared/terminal';

export interface ConnectionValidationResult {
  sessionId: string;
  name: string;
  isWebSocketConnected: boolean;
  wsReadyState?: number;
  wsReadyStateText?: string;
  hasTerminalInstance: boolean;
  hasDOMElement: boolean;
  hasResizeObserver?: boolean;
  connectionStatus: string;
  lastActiveAt: number;
  validationTime: number;
}

export interface ValidationSummary {
  totalSessions: number;
  activeConnections: number;
  orphanedConnections: number;
  properlyClosedSessions: number;
  sessions: ConnectionValidationResult[];
  warnings: string[];
}

/**
 * Maps WebSocket ready states to human-readable text
 */
const WS_READY_STATES: Record<number, string> = {
  0: 'CONNECTING',
  1: 'OPEN',
  2: 'CLOSING',
  3: 'CLOSED'
};

/**
 * Terminal Connection Validator
 */
export class TerminalConnectionValidator {
  private static instance: TerminalConnectionValidator;
  private validationHistory: ValidationSummary[] = [];
  private monitoringInterval?: number;

  static getInstance(): TerminalConnectionValidator {
    if (!this.instance) {
      this.instance = new TerminalConnectionValidator();
    }
    return this.instance;
  }

  /**
   * Validate a single terminal session
   */
  validateSession(session: TerminalSessionState): ConnectionValidationResult {
    const now = Date.now();
    
    // Check WebSocket state
    let wsReadyState: number | undefined;
    let wsReadyStateText: string | undefined;
    let isWebSocketConnected = false;
    
    if (session.wsManager) {
      // Access the internal WebSocket if available
      const ws = (session.wsManager as any).ws;
      if (ws && ws.readyState !== undefined) {
        wsReadyState = ws.readyState;
        wsReadyStateText = wsReadyState !== undefined ? (WS_READY_STATES[wsReadyState] || 'UNKNOWN') : 'UNKNOWN';
        isWebSocketConnected = wsReadyState === WebSocket.OPEN;
      }
    }

    return {
      sessionId: session.id,
      name: session.name,
      isWebSocketConnected,
      wsReadyState,
      wsReadyStateText,
      hasTerminalInstance: !!session.terminal,
      hasDOMElement: !!session.element,
      connectionStatus: session.connectionStatus,
      lastActiveAt: session.lastActiveAt,
      validationTime: now
    };
  }

  /**
   * Validate all terminal sessions
   */
  validateAllSessions(): ValidationSummary {
    const sessions = terminalSessions.get();
    const results: ConnectionValidationResult[] = [];
    const warnings: string[] = [];
    
    let activeConnections = 0;
    let orphanedConnections = 0;
    let properlyClosedSessions = 0;

    for (const [sessionId, session] of sessions) {
      const validation = this.validateSession(session);
      results.push(validation);

      // Count active connections
      if (validation.isWebSocketConnected) {
        activeConnections++;
      }

      // Check for orphaned connections (WebSocket open but terminal disposed)
      if (validation.isWebSocketConnected && !validation.hasTerminalInstance) {
        orphanedConnections++;
        warnings.push(`Session ${sessionId} has open WebSocket but no terminal instance`);
      }

      // Check for memory leaks (terminal instance but no WebSocket and marked as disconnected)
      if (!validation.isWebSocketConnected && validation.hasTerminalInstance && 
          session.connectionStatus === 'disconnected') {
        const inactiveTime = Date.now() - session.lastActiveAt;
        if (inactiveTime > 60000) { // More than 1 minute inactive
          warnings.push(`Session ${sessionId} has terminal instance but disconnected for ${Math.round(inactiveTime / 1000)}s`);
        }
      }

      // Check properly closed sessions
      if (!validation.isWebSocketConnected && !validation.hasTerminalInstance && 
          !validation.hasDOMElement && session.connectionStatus === 'disconnected') {
        properlyClosedSessions++;
      }
    }

    const summary: ValidationSummary = {
      totalSessions: sessions.size,
      activeConnections,
      orphanedConnections,
      properlyClosedSessions,
      sessions: results,
      warnings
    };

    // Store in history
    this.validationHistory.push(summary);
    if (this.validationHistory.length > 100) {
      this.validationHistory.shift();
    }

    return summary;
  }

  /**
   * Start monitoring terminal connections
   */
  startMonitoring(intervalMs: number = 5000, callback?: (summary: ValidationSummary) => void): void {
    this.stopMonitoring();
    
    console.log('🔍 Starting terminal connection monitoring...');
    
    this.monitoringInterval = window.setInterval(() => {
      const summary = this.validateAllSessions();
      
      // Log to console
      console.group('📊 Terminal Connection Status');
      console.log(`Total Sessions: ${summary.totalSessions}`);
      console.log(`Active Connections: ${summary.activeConnections}`);
      console.log(`Orphaned Connections: ${summary.orphanedConnections}`);
      console.log(`Properly Closed: ${summary.properlyClosedSessions}`);
      
      if (summary.warnings.length > 0) {
        console.warn('⚠️ Warnings:', summary.warnings);
      }
      
      console.table(summary.sessions.map(s => ({
        ID: s.sessionId,
        Name: s.name,
        'WS State': s.wsReadyStateText || 'N/A',
        'Has Terminal': s.hasTerminalInstance ? '✓' : '✗',
        'Has DOM': s.hasDOMElement ? '✓' : '✗',
        Status: s.connectionStatus
      })));
      
      console.groupEnd();
      
      // Call callback if provided
      if (callback) {
        callback(summary);
      }
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      console.log('🛑 Stopped terminal connection monitoring');
    }
  }

  /**
   * Get validation history
   */
  getHistory(): ValidationSummary[] {
    return [...this.validationHistory];
  }

  /**
   * Check for leaks
   */
  checkForLeaks(): { hasLeaks: boolean; details: string[] } {
    const summary = this.validateAllSessions();
    const details: string[] = [];
    let hasLeaks = false;

    if (summary.orphanedConnections > 0) {
      hasLeaks = true;
      details.push(`Found ${summary.orphanedConnections} orphaned WebSocket connections`);
    }

    // Check for sessions that should have been cleaned up
    for (const session of summary.sessions) {
      if (session.connectionStatus === 'disconnected') {
        if (session.isWebSocketConnected) {
          hasLeaks = true;
          details.push(`Session ${session.sessionId} marked as disconnected but WebSocket is still open`);
        }
        if (session.hasTerminalInstance) {
          const sessions = terminalSessions.get();
          const sessionData = sessions.get(session.sessionId);
          if (sessionData) {
            const inactiveTime = Date.now() - sessionData.lastActiveAt;
            if (inactiveTime > 300000) { // 5 minutes
              hasLeaks = true;
              details.push(`Session ${session.sessionId} has been inactive for ${Math.round(inactiveTime / 60000)} minutes but resources not cleaned`);
            }
          }
        }
      }
    }

    return { hasLeaks, details };
  }

  /**
   * Force cleanup of orphaned connections
   */
  cleanupOrphanedConnections(): number {
    const sessions = terminalSessions.get();
    let cleanedCount = 0;

    for (const [sessionId, session] of sessions) {
      const validation = this.validateSession(session);
      
      // Clean up orphaned connections
      if (validation.isWebSocketConnected && !validation.hasTerminalInstance) {
        console.warn(`Cleaning up orphaned connection for session ${sessionId}`);
        if (session.wsManager) {
          session.wsManager.disconnect();
          session.wsManager = undefined;
        }
        cleanedCount++;
      }

      // Clean up long-inactive sessions
      if (session.connectionStatus === 'disconnected') {
        const inactiveTime = Date.now() - session.lastActiveAt;
        if (inactiveTime > 600000) { // 10 minutes
          console.warn(`Removing long-inactive session ${sessionId}`);
          // Use the terminal store's closeSession method if available
          // TODO: Access terminalStore when it's properly exposed on window
          if ((window as any).terminalStore) {
            (window as any).terminalStore.closeSession(sessionId);
          }
          cleanedCount++;
        }
      }
    }

    return cleanedCount;
  }
}

// Export singleton instance
export const terminalValidator = TerminalConnectionValidator.getInstance();

// Browser DevTools helper functions for easy access
if (typeof window !== 'undefined') {
  (window as any).terminalValidator = {
    validate: () => terminalValidator.validateAllSessions(),
    monitor: (interval?: number) => terminalValidator.startMonitoring(interval),
    stopMonitor: () => terminalValidator.stopMonitoring(),
    checkLeaks: () => terminalValidator.checkForLeaks(),
    cleanup: () => terminalValidator.cleanupOrphanedConnections(),
    history: () => terminalValidator.getHistory()
  };

  console.log(`
  🚀 Terminal Validator loaded! Available commands:
  - terminalValidator.validate() - Check all connections
  - terminalValidator.monitor() - Start monitoring (5s interval)
  - terminalValidator.stopMonitor() - Stop monitoring
  - terminalValidator.checkLeaks() - Check for resource leaks
  - terminalValidator.cleanup() - Clean up orphaned connections
  - terminalValidator.history() - View validation history
  `);
}
