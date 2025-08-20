var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { vmActions } from '../../stores/virtualization';
import { virtualizationAPI } from '../../services/virtualization-api';
let VMActions = class VMActions extends LitElement {
    constructor() {
        super(...arguments);
        this.compact = false;
        this.showLabels = true;
        this.isPerformingAction = false;
        this.currentAction = null;
    }
    getActionIcon(action) {
        const icons = {
            start: '▶️',
            stop: '⏹️',
            pause: '⏸️',
            resume: '▶️',
            restart: '🔄',
            reset: '⚡',
            console: '💻',
            snapshot: '📸',
            clone: '📋',
            migrate: '🚀',
            delete: '🗑️',
        };
        return icons[action] || '⚙️';
    }
    canPerformAction(action) {
        if (this.isPerformingAction)
            return false;
        const state = this.vm.state;
        switch (action) {
            case 'start':
                return state === 'stopped' || state === 'suspended';
            case 'stop':
                return state === 'running' || state === 'paused';
            case 'pause':
                return state === 'running';
            case 'resume':
                return state === 'paused' || state === 'suspended';
            case 'restart':
                return state === 'running';
            case 'reset':
                return state === 'running';
            case 'console':
                return state === 'running';
            case 'snapshot':
                return true;
            case 'clone':
                return state === 'stopped';
            default:
                return false;
        }
    }
    async performAction(action) {
        if (!this.canPerformAction(action))
            return;
        this.isPerformingAction = true;
        this.currentAction = action;
        try {
            switch (action) {
                case 'start':
                    await vmActions.start(this.vm.id);
                    this.showNotification(`Starting VM: ${this.vm.name}`, 'success');
                    break;
                case 'stop':
                    const confirmStop = await this.confirmAction(`Stop VM "${this.vm.name}"?`, 'This will gracefully shut down the VM.');
                    if (confirmStop) {
                        await vmActions.stop(this.vm.id);
                        this.showNotification(`Stopping VM: ${this.vm.name}`, 'success');
                    }
                    break;
                case 'pause':
                    await vmActions.pause(this.vm.id);
                    this.showNotification(`Pausing VM: ${this.vm.name}`, 'success');
                    break;
                case 'resume':
                    await vmActions.resume(this.vm.id);
                    this.showNotification(`Resuming VM: ${this.vm.name}`, 'success');
                    break;
                case 'restart':
                    const confirmRestart = await this.confirmAction(`Restart VM "${this.vm.name}"?`, 'This will restart the VM.');
                    if (confirmRestart) {
                        await vmActions.restart(this.vm.id);
                        this.showNotification(`Restarting VM: ${this.vm.name}`, 'success');
                    }
                    break;
                case 'reset':
                    const confirmReset = await this.confirmAction(`Reset VM "${this.vm.name}"?`, 'This will forcefully reset the VM (like pressing the reset button).');
                    if (confirmReset) {
                        await virtualizationAPI.resetVM(this.vm.id);
                        this.showNotification(`Resetting VM: ${this.vm.name}`, 'success');
                    }
                    break;
                case 'console':
                    await this.openConsole();
                    break;
                case 'snapshot':
                    this.dispatchEvent(new CustomEvent('snapshot', {
                        detail: { vm: this.vm },
                        bubbles: true,
                        composed: true,
                    }));
                    break;
                case 'clone':
                    this.dispatchEvent(new CustomEvent('clone', {
                        detail: { vm: this.vm },
                        bubbles: true,
                        composed: true,
                    }));
                    break;
            }
        }
        catch (error) {
            console.error(`Failed to ${action} VM:`, error);
            this.showNotification(`Failed to ${action} VM: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
        finally {
            this.isPerformingAction = false;
            this.currentAction = null;
        }
    }
    async openConsole() {
        try {
            const consoleInfo = await vmActions.getConsoleInfo(this.vm.id);
            const consoleUrl = this.buildConsoleUrl(consoleInfo);
            const consoleWindow = window.open(consoleUrl, `vm-console-${this.vm.id}`, 'width=1024,height=768,resizable=yes,scrollbars=no,toolbar=no,menubar=no');
            if (!consoleWindow) {
                throw new Error('Failed to open console window. Please check your popup blocker settings.');
            }
            this.showNotification(`Console opened for VM: ${this.vm.name}`, 'success');
        }
        catch (error) {
            console.error('Failed to open console:', error);
            this.showNotification(`Failed to open console: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }
    buildConsoleUrl(consoleInfo) {
        const params = new URLSearchParams({
            vm: this.vm.id,
            token: consoleInfo.token,
            type: consoleInfo.type,
        });
        if (consoleInfo.host) {
            params.append('host', consoleInfo.host);
        }
        if (consoleInfo.port) {
            params.append('port', consoleInfo.port.toString());
        }
        return `/console?${params.toString()}`;
    }
    async confirmAction(title, message) {
        return new Promise((resolve) => {
            const event = new CustomEvent('confirm-action', {
                detail: {
                    title,
                    message,
                    callback: (confirmed) => resolve(confirmed),
                },
                bubbles: true,
                composed: true,
            });
            this.dispatchEvent(event);
        });
    }
    showNotification(message, type = 'info') {
        this.dispatchEvent(new CustomEvent('show-notification', {
            detail: { message, type },
            bubbles: true,
            composed: true,
        }));
    }
    renderActionButton(action, label, variant = 'secondary') {
        const isDisabled = !this.canPerformAction(action) || this.isPerformingAction;
        const isLoading = this.currentAction === action;
        const button = html `
      <button
        class="action-button ${variant} ${this.compact ? 'compact' : ''}"
        ?disabled=${isDisabled}
        @click=${() => this.performAction(action)}
      >
        ${isLoading ? html `
          <span class="spinner"></span>
        ` : html `
          <span class="action-icon">${this.getActionIcon(action)}</span>
        `}
        ${this.showLabels ? html `
          <span class="action-label">${label}</span>
        ` : ''}
      </button>
    `;
        if (!this.showLabels) {
            return html `
        <div class="tooltip-wrapper">
          ${button}
          <div class="tooltip">${label}</div>
        </div>
      `;
        }
        return button;
    }
    renderStatusIndicator() {
        const stateLabels = {
            running: 'Running',
            stopped: 'Stopped',
            paused: 'Paused',
            suspended: 'Suspended',
            unknown: 'Unknown',
        };
        return html `
      <div class="status-indicator">
        <span class="status-dot ${this.vm.state}"></span>
        <span>${stateLabels[this.vm.state] || 'Unknown'}</span>
      </div>
    `;
    }
    render() {
        const state = this.vm.state;
        return html `
      <div class="actions-container ${this.compact ? 'compact' : ''}">
        ${this.compact ? '' : this.renderStatusIndicator()}
        
        <div class="action-group">
          ${state === 'stopped' || state === 'suspended' ?
            this.renderActionButton('start', 'Start', 'success') : ''}
          
          ${state === 'running' ? html `
            ${this.renderActionButton('stop', 'Stop', 'danger')}
            ${this.renderActionButton('restart', 'Restart', 'secondary')}
            ${this.renderActionButton('pause', 'Pause', 'secondary')}
          ` : ''}
          
          ${state === 'paused' ? html `
            ${this.renderActionButton('resume', 'Resume', 'success')}
            ${this.renderActionButton('stop', 'Stop', 'danger')}
          ` : ''}
        </div>
        
        ${state === 'running' ? html `
          <div class="divider"></div>
          <div class="action-group">
            ${this.renderActionButton('console', 'Console', 'primary')}
          </div>
        ` : ''}
        
        <div class="divider"></div>
        
        <div class="action-group">
          ${this.renderActionButton('snapshot', 'Snapshot', 'secondary')}
          ${state === 'stopped' ?
            this.renderActionButton('clone', 'Clone', 'secondary') : ''}
        </div>
      </div>
    `;
    }
};
VMActions.styles = css `
    :host {
      display: block;
    }

    .actions-container {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }

    .actions-container.compact {
      gap: 4px;
    }

    .action-button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border);
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .action-button:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .action-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-button.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-button-background);
    }

    .action-button.primary:hover:not(:disabled) {
      background: var(--vscode-button-hoverBackground);
    }

    .action-button.danger {
      background: var(--vscode-inputValidation-errorBackground);
      color: var(--vscode-inputValidation-errorForeground);
      border-color: var(--vscode-inputValidation-errorBorder);
    }

    .action-button.danger:hover:not(:disabled) {
      opacity: 0.9;
    }

    .action-button.success {
      background: var(--vscode-testing-runAction);
      color: white;
      border-color: var(--vscode-testing-runAction);
    }

    .action-button.success:hover:not(:disabled) {
      opacity: 0.9;
    }

    .action-button.compact {
      padding: 4px 8px;
      font-size: 12px;
    }

    .action-icon {
      font-size: 14px;
      line-height: 1;
    }

    .action-label {
      font-weight: 500;
    }

    .spinner {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .divider {
      width: 1px;
      height: 20px;
      background: var(--vscode-editorWidget-border);
      margin: 0 4px;
    }

    .action-group {
      display: flex;
      gap: 4px;
      align-items: center;
    }

    /* Tooltip */
    .tooltip-wrapper {
      position: relative;
      display: inline-flex;
    }

    .tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 8px;
      padding: 4px 8px;
      background: var(--vscode-editorWidget-background);
      color: var(--vscode-editorWidget-foreground);
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 1000;
    }

    .tooltip-wrapper:hover .tooltip {
      opacity: 1;
    }

    /* Status indicator */
    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 4px;
      font-size: 12px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    .status-dot.running {
      background: var(--vscode-charts-green);
    }

    .status-dot.stopped {
      background: var(--vscode-charts-red);
    }

    .status-dot.paused {
      background: var(--vscode-charts-yellow);
    }

    .status-dot.suspended {
      background: var(--vscode-charts-orange);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;
__decorate([
    property({ type: Object })
], VMActions.prototype, "vm", void 0);
__decorate([
    property({ type: Boolean })
], VMActions.prototype, "compact", void 0);
__decorate([
    property({ type: Boolean })
], VMActions.prototype, "showLabels", void 0);
__decorate([
    state()
], VMActions.prototype, "isPerformingAction", void 0);
__decorate([
    state()
], VMActions.prototype, "currentAction", void 0);
VMActions = __decorate([
    customElement('vm-actions')
], VMActions);
export { VMActions };
//# sourceMappingURL=vm-actions.js.map