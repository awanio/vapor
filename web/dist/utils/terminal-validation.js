import { terminalSessions } from '../stores/shared/terminal';
const WS_READY_STATES = {
    0: 'CONNECTING',
    1: 'OPEN',
    2: 'CLOSING',
    3: 'CLOSED'
};
export class TerminalConnectionValidator {
    constructor() {
        this.validationHistory = [];
    }
    static getInstance() {
        if (!this.instance) {
            this.instance = new TerminalConnectionValidator();
        }
        return this.instance;
    }
    validateSession(session) {
        const now = Date.now();
        let wsReadyState;
        let wsReadyStateText;
        let isWebSocketConnected = false;
        if (session.wsManager) {
            const ws = session.wsManager.ws;
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
    validateAllSessions() {
        const sessions = terminalSessions.get();
        const results = [];
        const warnings = [];
        let activeConnections = 0;
        let orphanedConnections = 0;
        let properlyClosedSessions = 0;
        for (const [sessionId, session] of sessions) {
            const validation = this.validateSession(session);
            results.push(validation);
            if (validation.isWebSocketConnected) {
                activeConnections++;
            }
            if (validation.isWebSocketConnected && !validation.hasTerminalInstance) {
                orphanedConnections++;
                warnings.push(`Session ${sessionId} has open WebSocket but no terminal instance`);
            }
            if (!validation.isWebSocketConnected && validation.hasTerminalInstance &&
                session.connectionStatus === 'disconnected') {
                const inactiveTime = Date.now() - session.lastActiveAt;
                if (inactiveTime > 60000) {
                    warnings.push(`Session ${sessionId} has terminal instance but disconnected for ${Math.round(inactiveTime / 1000)}s`);
                }
            }
            if (!validation.isWebSocketConnected && !validation.hasTerminalInstance &&
                !validation.hasDOMElement && session.connectionStatus === 'disconnected') {
                properlyClosedSessions++;
            }
        }
        const summary = {
            totalSessions: sessions.size,
            activeConnections,
            orphanedConnections,
            properlyClosedSessions,
            sessions: results,
            warnings
        };
        this.validationHistory.push(summary);
        if (this.validationHistory.length > 100) {
            this.validationHistory.shift();
        }
        return summary;
    }
    startMonitoring(intervalMs = 5000, callback) {
        this.stopMonitoring();
        console.log('🔍 Starting terminal connection monitoring...');
        this.monitoringInterval = window.setInterval(() => {
            const summary = this.validateAllSessions();
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
            if (callback) {
                callback(summary);
            }
        }, intervalMs);
    }
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
            console.log('🛑 Stopped terminal connection monitoring');
        }
    }
    getHistory() {
        return [...this.validationHistory];
    }
    checkForLeaks() {
        const summary = this.validateAllSessions();
        const details = [];
        let hasLeaks = false;
        if (summary.orphanedConnections > 0) {
            hasLeaks = true;
            details.push(`Found ${summary.orphanedConnections} orphaned WebSocket connections`);
        }
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
                        if (inactiveTime > 300000) {
                            hasLeaks = true;
                            details.push(`Session ${session.sessionId} has been inactive for ${Math.round(inactiveTime / 60000)} minutes but resources not cleaned`);
                        }
                    }
                }
            }
        }
        return { hasLeaks, details };
    }
    cleanupOrphanedConnections() {
        const sessions = terminalSessions.get();
        let cleanedCount = 0;
        for (const [sessionId, session] of sessions) {
            const validation = this.validateSession(session);
            if (validation.isWebSocketConnected && !validation.hasTerminalInstance) {
                console.warn(`Cleaning up orphaned connection for session ${sessionId}`);
                if (session.wsManager) {
                    session.wsManager.disconnect();
                    session.wsManager = undefined;
                }
                cleanedCount++;
            }
            if (session.connectionStatus === 'disconnected') {
                const inactiveTime = Date.now() - session.lastActiveAt;
                if (inactiveTime > 600000) {
                    console.warn(`Removing long-inactive session ${sessionId}`);
                    if (window.terminalStore) {
                        window.terminalStore.closeSession(sessionId);
                    }
                    cleanedCount++;
                }
            }
        }
        return cleanedCount;
    }
}
export const terminalValidator = TerminalConnectionValidator.getInstance();
if (typeof window !== 'undefined') {
    window.terminalValidator = {
        validate: () => terminalValidator.validateAllSessions(),
        monitor: (interval) => terminalValidator.startMonitoring(interval),
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
//# sourceMappingURL=terminal-validation.js.map