var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { terminalValidator } from '../utils/terminal-validation';
import { terminalStore, terminalSessions } from '../stores/shared/terminal';
let TerminalConnectionTest = class TerminalConnectionTest extends LitElement {
    constructor() {
        super(...arguments);
        this.validationResults = null;
        this.isMonitoring = false;
        this.monitorInterval = 5000;
        this.leakCheckResults = null;
    }
    connectedCallback() {
        super.connectedCallback();
        this.runValidation();
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.isMonitoring) {
            this.stopMonitoring();
        }
    }
    runValidation() {
        this.validationResults = terminalValidator.validateAllSessions();
    }
    startMonitoring() {
        this.isMonitoring = true;
        terminalValidator.startMonitoring(this.monitorInterval, (summary) => {
            this.validationResults = summary;
        });
    }
    stopMonitoring() {
        this.isMonitoring = false;
        terminalValidator.stopMonitoring();
    }
    checkForLeaks() {
        this.leakCheckResults = terminalValidator.checkForLeaks();
    }
    cleanupConnections() {
        const cleaned = terminalValidator.cleanupOrphanedConnections();
        alert(`Cleaned up ${cleaned} orphaned connections`);
        this.runValidation();
    }
    async createTestSession() {
        const sessionId = await terminalStore.createSession(`Test ${Date.now()}`);
        console.log('Created test session:', sessionId);
        this.runValidation();
    }
    closeRandomSession() {
        const sessions = terminalSessions.get();
        const sessionIds = Array.from(sessions.keys());
        if (sessionIds.length > 0) {
            const randomId = sessionIds[Math.floor(Math.random() * sessionIds.length)];
            if (randomId) {
                terminalStore.closeSession(randomId);
            }
            console.log('Closed session:', randomId);
            this.runValidation();
        }
    }
    disconnectRandomSession() {
        const sessions = terminalSessions.get();
        const sessionIds = Array.from(sessions.keys());
        if (sessionIds.length > 0) {
            const randomId = sessionIds[Math.floor(Math.random() * sessionIds.length)];
            if (randomId) {
                terminalStore.disconnectSession(randomId);
            }
            console.log('Disconnected session:', randomId);
            this.runValidation();
        }
    }
    getStatusColor(value, thresholds) {
        if (value === 0)
            return 'good';
        if (value <= thresholds.good)
            return 'good';
        if (value <= thresholds.warning)
            return 'warning';
        return 'error';
    }
    render() {
        const results = this.validationResults;
        return html `
      <h2>
        Terminal Connection Validator
        ${this.isMonitoring ? html `
          <span class="monitor-status active">
            <span class="blink">●</span> Monitoring
          </span>
        ` : ''}
      </h2>

      <div class="controls">
        <button @click=${this.runValidation}>
          🔍 Validate Now
        </button>
        
        ${!this.isMonitoring ? html `
          <button @click=${this.startMonitoring}>
            ▶️ Start Monitor
          </button>
        ` : html `
          <button @click=${this.stopMonitoring}>
            ⏸️ Stop Monitor
          </button>
        `}
        
        <input
          type="number"
          .value=${this.monitorInterval}
          @change=${(e) => {
            this.monitorInterval = parseInt(e.target.value) || 5000;
        }}
          min="1000"
          step="1000"
        />
        <span>ms</span>
        
        <button @click=${this.checkForLeaks}>
          🔎 Check Leaks
        </button>
        
        <button class="danger" @click=${this.cleanupConnections}>
          🧹 Cleanup
        </button>
      </div>

      ${results ? html `
        <div class="status-grid">
          <div class="status-card">
            <h3>Total Sessions</h3>
            <div class="status-value">${results.totalSessions}</div>
          </div>
          
          <div class="status-card">
            <h3>Active Connections</h3>
            <div class="status-value ${this.getStatusColor(results.activeConnections, { good: 3, warning: 5 })}">
              ${results.activeConnections}
            </div>
          </div>
          
          <div class="status-card">
            <h3>Orphaned</h3>
            <div class="status-value ${results.orphanedConnections === 0 ? 'good' : 'error'}">
              ${results.orphanedConnections}
            </div>
          </div>
          
          <div class="status-card">
            <h3>Properly Closed</h3>
            <div class="status-value good">
              ${results.properlyClosedSessions}
            </div>
          </div>
        </div>

        ${results.warnings.length > 0 ? html `
          <div class="warnings">
            <h3>⚠️ Warnings</h3>
            <ul>
              ${results.warnings.map(warning => html `<li>${warning}</li>`)}
            </ul>
          </div>
        ` : ''}

        <div class="test-actions">
          <h3>Test Actions</h3>
          <div class="test-grid">
            <button @click=${this.createTestSession}>
              ➕ Create Session
            </button>
            <button @click=${this.closeRandomSession}>
              ❌ Close Random
            </button>
            <button @click=${this.disconnectRandomSession}>
              🔌 Disconnect Random
            </button>
          </div>
        </div>

        ${this.leakCheckResults ? html `
          <div class="leak-results ${this.leakCheckResults.hasLeaks ? 'has-leaks' : 'no-leaks'}">
            <h3>${this.leakCheckResults.hasLeaks ? '❌ Leaks Detected' : '✅ No Leaks'}</h3>
            ${this.leakCheckResults.details.length > 0 ? html `
              <ul>
                ${this.leakCheckResults.details.map(detail => html `<li>${detail}</li>`)}
              </ul>
            ` : html `<p>All connections are properly managed.</p>`}
          </div>
        ` : ''}

        <table class="sessions-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>WS State</th>
              <th>Terminal</th>
              <th>DOM</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${results.sessions.map(session => html `
              <tr>
                <td>${session.sessionId}</td>
                <td>${session.name}</td>
                <td>${session.wsReadyStateText || 'N/A'}</td>
                <td>
                  ${session.hasTerminalInstance
            ? html `<span class="check-mark">✓</span>`
            : html `<span class="cross-mark">✗</span>`}
                </td>
                <td>
                  ${session.hasDOMElement
            ? html `<span class="check-mark">✓</span>`
            : html `<span class="cross-mark">✗</span>`}
                </td>
                <td>${session.connectionStatus}</td>
              </tr>
            `)}
          </tbody>
        </table>
      ` : html `<p>Loading validation results...</p>`}
    `;
    }
};
TerminalConnectionTest.styles = css `
    :host {
      display: block;
      padding: 16px;
      font-family: 'Consolas', 'Monaco', monospace;
      background: var(--surface-color, #1e1e1e);
      color: var(--text-color, #e0e0e0);
      border-radius: 8px;
      max-width: 800px;
      margin: 0 auto;
    }

    h2 {
      margin-top: 0;
      color: var(--primary-color, #4CAF50);
      border-bottom: 2px solid var(--primary-color, #4CAF50);
      padding-bottom: 8px;
    }

    .controls {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    button {
      padding: 8px 16px;
      background: var(--primary-color, #4CAF50);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.3s;
    }

    button:hover {
      background: var(--primary-dark, #45a049);
    }

    button:disabled {
      background: #666;
      cursor: not-allowed;
    }

    button.danger {
      background: #f44336;
    }

    button.danger:hover {
      background: #da190b;
    }

    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .status-card {
      background: var(--card-bg, #2a2a2a);
      padding: 12px;
      border-radius: 4px;
      border: 1px solid var(--border-color, #3a3a3a);
    }

    .status-card h3 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: var(--secondary-color, #64B5F6);
    }

    .status-value {
      font-size: 24px;
      font-weight: bold;
    }

    .status-value.good {
      color: #4CAF50;
    }

    .status-value.warning {
      color: #FFC107;
    }

    .status-value.error {
      color: #f44336;
    }

    .sessions-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }

    .sessions-table th,
    .sessions-table td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid var(--border-color, #3a3a3a);
    }

    .sessions-table th {
      background: var(--header-bg, #2a2a2a);
      color: var(--secondary-color, #64B5F6);
      font-weight: bold;
    }

    .sessions-table tr:hover {
      background: var(--hover-bg, #333);
    }

    .check-mark {
      color: #4CAF50;
    }

    .cross-mark {
      color: #f44336;
    }

    .warnings {
      background: #FFC107;
      color: #000;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
    }

    .warnings h3 {
      margin: 0 0 8px 0;
    }

    .warnings ul {
      margin: 0;
      padding-left: 20px;
    }

    .leak-results {
      background: var(--card-bg, #2a2a2a);
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
    }

    .leak-results.has-leaks {
      border: 2px solid #f44336;
    }

    .leak-results.no-leaks {
      border: 2px solid #4CAF50;
    }

    .monitor-status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      background: var(--card-bg, #2a2a2a);
      border-radius: 4px;
      margin-left: 16px;
    }

    .monitor-status.active {
      background: #4CAF50;
      color: white;
    }

    .blink {
      animation: blink 1s infinite;
    }

    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0.3; }
    }

    input[type="number"] {
      padding: 4px 8px;
      background: var(--input-bg, #2a2a2a);
      color: var(--text-color, #e0e0e0);
      border: 1px solid var(--border-color, #3a3a3a);
      border-radius: 4px;
    }

    .test-actions {
      background: var(--card-bg, #2a2a2a);
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
    }

    .test-actions h3 {
      margin-top: 0;
      color: var(--secondary-color, #64B5F6);
    }

    .test-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 8px;
    }
  `;
__decorate([
    state()
], TerminalConnectionTest.prototype, "validationResults", void 0);
__decorate([
    state()
], TerminalConnectionTest.prototype, "isMonitoring", void 0);
__decorate([
    state()
], TerminalConnectionTest.prototype, "monitorInterval", void 0);
__decorate([
    state()
], TerminalConnectionTest.prototype, "leakCheckResults", void 0);
TerminalConnectionTest = __decorate([
    customElement('terminal-connection-test')
], TerminalConnectionTest);
export { TerminalConnectionTest };
export { terminalValidator };
//# sourceMappingURL=terminal-connection-test.js.map