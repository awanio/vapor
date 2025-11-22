/**
 * Volume Clone Dialog
 * Right-side drawer for cloning an existing storage volume.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { StoragePool, Volume } from '../../types/virtualization';
import { virtualizationAPI, VirtualizationAPIError } from '../../services/virtualization-api';
import { notificationActions } from '../../stores/notifications';

@customElement('volume-clone-dialog')
export class VolumeCloneDialog extends LitElement {
  @property({ type: Boolean, reflect: true }) show = false;
  @property({ type: Object }) pool!: StoragePool;
  @property({ type: Object }) volume!: Volume;

  @state() private newName = '';
  @state() private targetPool = '';
  @state() private isCloning = false;
  @state() private errors: Map<string, string> = new Map();

  private handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.show && !this.isCloning) {
      this.handleClose();
    }
  };

  static override styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      right: 0;
      width: 500px;
      height: 100vh;
      z-index: 1000;
      pointer-events: none;
    }

    :host([show]) {
      pointer-events: auto;
    }

    .drawer {
      width: 100%;
      height: 100%;
      background: var(--vscode-editor-background, var(--vscode-bg-light));
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      border-left: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
    }

    :host([show]) .drawer {
      transform: translateX(0);
    }

    .drawer-header {
      padding: 20px;
      background: var(--vscode-sideBar-background, #252526);
      border-bottom: 1px solid var(--vscode-widget-border, #454545);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .header-title {
      font-size: 18px;
      font-weight: 500;
      color: var(--vscode-foreground, #cccccc);
    }

    .close-button {
      background: none;
      border: none;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 20px;
      transition: background 0.2s;
    }

    .close-button:hover {
      background: var(--vscode-toolbar-hoverBackground, rgba(255, 255, 255, 0.1));
    }

    .drawer-content {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
    }

    .drawer-footer {
      padding: 16px 20px;
      background: var(--vscode-sideBar-background, #252526);
      border-top: 1px solid var(--vscode-widget-border, #454545);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      flex-shrink: 0;
    }

    .form-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--vscode-foreground);
    }

    .form-label.required::after {
      content: ' *';
      color: var(--vscode-inputValidation-errorForeground);
    }

    .form-input {
      padding: 8px 12px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      font-size: 13px;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }

    .form-input.error {
      border-color: var(--vscode-inputValidation-errorBorder);
    }

    .form-input:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .form-hint {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: -4px;
    }

    .error-message {
      font-size: 12px;
      color: var(--vscode-inputValidation-errorForeground);
      margin-top: -4px;
    }

    .info-box {
      padding: 12px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 4px;
      font-size: 13px;
      color: var(--vscode-foreground);
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .info-label {
      color: var(--vscode-descriptionForeground);
    }

    .btn {
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--vscode-button-hoverBackground);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this.handleEscape);
  }

  override disconnectedCallback() {
    window.removeEventListener('keydown', this.handleEscape);
    super.disconnectedCallback();
  }

  override willUpdate(changed: Map<PropertyKey, unknown>) {
    if (changed.has('show') && this.show) {
      setTimeout(() => {
        const input = this.shadowRoot?.querySelector<HTMLInputElement>('#clone-name');
        if (input) input.focus();
      }, 100);
    }

    if (changed.has('volume') && this.volume) {
      // Default new name suggestion
      this.newName = `${this.volume.name}-clone`;
    }
  }

  private validate(): boolean {
    this.errors.clear();

    if (!this.newName) {
      this.errors.set('name', 'New volume name is required');
    } else if (!/^[a-zA-Z0-9-_]+$/.test(this.newName)) {
      this.errors.set('name', 'Name can only contain letters, numbers, hyphens, and underscores');
    }

    if (this.targetPool && !/^[a-zA-Z0-9-_]+$/.test(this.targetPool)) {
      this.errors.set('targetPool', 'Target pool name can only contain letters, numbers, hyphens, and underscores');
    }

    this.requestUpdate();
    return this.errors.size === 0;
  }

  private async handleClone() {
    if (!this.pool || !this.volume || !this.validate()) return;

    this.isCloning = true;

    try {
      const payload: { new_name: string; target_pool?: string } = { new_name: this.newName };
      const trimmedTarget = this.targetPool.trim();
      if (trimmedTarget && trimmedTarget !== this.pool.name) {
        payload.target_pool = trimmedTarget;
      }

      const cloned = await virtualizationAPI.cloneVolume(this.pool.name, this.volume.name, payload);

      this.dispatchEvent(new CustomEvent('volume-cloned', {
        detail: { poolName: cloned.pool_name, volume: cloned },
        bubbles: true,
        composed: true,
      }));

      this.handleClose();
    } catch (error) {
      let message = 'Unknown error';
      if (error instanceof VirtualizationAPIError) {
        switch (error.code) {
          case 'VOLUME_ALREADY_EXISTS':
            message = 'A volume with this name already exists in the target pool.';
            break;
          case 'INVALID_VOLUME_REQUEST':
            message = typeof error.details === 'string' ? error.details : error.message;
            break;
          case 'VOLUME_NOT_FOUND':
            message = 'Source volume not found. It may have been deleted.';
            break;
          default:
            message = error.message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }

      notificationActions.addNotification({
        type: 'error',
        title: 'Failed to clone volume',
        message,
      });
    } finally {
      this.isCloning = false;
    }
  }

  private handleClose() {
    this.dispatchEvent(new CustomEvent('close', {
      bubbles: true,
      composed: true,
    }));
  }

  override render() {
    if (!this.pool || !this.volume) {
      return html``;
    }

    return html`
      <div class="drawer">
        <div class="drawer-header">
          <h2 class="header-title">Clone Volume</h2>
          <button class="close-button" @click=${this.handleClose} ?disabled=${this.isCloning}>×</button>
        </div>

        <div class="drawer-content">
          <div class="form-container">
            <div class="info-box">
              <div class="info-row">
                <span class="info-label">Source volume</span>
                <span>${this.volume.name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Source pool</span>
                <span>${this.pool.name}</span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label required" for="clone-name">New volume name</label>
              <input
                id="clone-name"
                type="text"
                class="form-input ${this.errors.has('name') ? 'error' : ''}"
                .value=${this.newName}
                @input=${(e: Event) => {
                  this.newName = (e.target as HTMLInputElement).value;
                }}
                ?disabled=${this.isCloning}
              />
              ${this.errors.has('name') ? html`
                <div class="error-message">${this.errors.get('name')}</div>
              ` : html`
                <div class="form-hint">Name of the cloned volume in the target pool.</div>
              `}
            </div>

            <div class="form-group">
              <label class="form-label" for="target-pool">Target pool (optional)</label>
              <input
                id="target-pool"
                type="text"
                class="form-input ${this.errors.has('targetPool') ? 'error' : ''}"
                placeholder=${`Leave empty to clone into "${this.pool.name}"`}
                .value=${this.targetPool}
                @input=${(e: Event) => {
                  this.targetPool = (e.target as HTMLInputElement).value;
                }}
                ?disabled=${this.isCloning}
              />
              ${this.errors.has('targetPool') ? html`
                <div class="error-message">${this.errors.get('targetPool')}</div>
              ` : html`
                <div class="form-hint">Specify another pool name to clone into a different pool.</div>
              `}
            </div>
          </div>
        </div>

        <div class="drawer-footer">
          <button
            class="btn btn-secondary"
            @click=${this.handleClose}
            ?disabled=${this.isCloning}
          >
            Cancel
          </button>
          <button
            class="btn btn-primary"
            @click=${this.handleClone}
            ?disabled=${this.isCloning}
          >
            ${this.isCloning ? 'Cloning...' : 'Clone Volume'}
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'volume-clone-dialog': VolumeCloneDialog;
  }
}
