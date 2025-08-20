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
export declare class TerminalConnectionValidator {
    private static instance;
    private validationHistory;
    private monitoringInterval?;
    static getInstance(): TerminalConnectionValidator;
    validateSession(session: TerminalSessionState): ConnectionValidationResult;
    validateAllSessions(): ValidationSummary;
    startMonitoring(intervalMs?: number, callback?: (summary: ValidationSummary) => void): void;
    stopMonitoring(): void;
    getHistory(): ValidationSummary[];
    checkForLeaks(): {
        hasLeaks: boolean;
        details: string[];
    };
    cleanupOrphanedConnections(): number;
}
export declare const terminalValidator: TerminalConnectionValidator;
//# sourceMappingURL=terminal-validation.d.ts.map