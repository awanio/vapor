import { LitElement } from 'lit';
import { terminalValidator } from '../utils/terminal-validation';
export declare class TerminalConnectionTest extends LitElement {
    private validationResults;
    private isMonitoring;
    private monitorInterval;
    private leakCheckResults;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private runValidation;
    private startMonitoring;
    private stopMonitoring;
    private checkForLeaks;
    private cleanupConnections;
    private createTestSession;
    private closeRandomSession;
    private disconnectRandomSession;
    private getStatusColor;
    render(): import("lit-html").TemplateResult<1>;
}
export { terminalValidator };
//# sourceMappingURL=terminal-connection-test.d.ts.map