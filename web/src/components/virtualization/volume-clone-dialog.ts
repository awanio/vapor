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

  @property({ type: Array }) poolNames: string[] = [];

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
      min-width: 0;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      margin-bottom: 6px;
      font-size: 13px;
      font-weight: 500;
      color: var(--vscode-foreground, #cccccc);
    }

    .form-label.required::after {
      content: ' *';
      color: var(--vscode-inputValidation-errorForeground, #f48771);
    }

    .form-input,
    .form-select {
      width: 100%;
      padding: 8px 12px;
      background: var(--vscode-input-background, #3c3c3c);
      border: 1px solid var(--vscode-input-border, #5a5a5a);
      border-radius: 4px;
      color: var(--vscode-input-foreground, #cccccc);
      font-size: 13px;
      font-family: inherit;
      outline: none;
      box-sizing: border-box;
      transition: all 0.2s;
    }

    .form-input:focus,
    .form-select:focus {
      border-color: var(--vscode-focusBorder, #007acc);
      box-shadow: 0 0 0 1px var(--vscode-focusBorder, #007acc);
    }

    .form-input.error,
    .form-select.error {
      border-color: var(--vscode-inputValidation-errorBorder, #f48771);
    }

    .form-input:disabled,
    .form-select:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .form-hint {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #999999);
    }

    .error-message {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: var(--vscode-inputValidation-errorForeground, #f48771);
    }

    .info-box {
      padding: 12px;
      background: var(--vscode-editor-background, #1e1e1e);
      border: 1px solid var(--vscode-editorWidget-border, #454545);
      border-radius: 4px;
      font-size: 13px;
      color: var(--vscode-foreground, #cccccc);
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .info-label {
      color: var(--vscode-descriptionForeground, #999999);
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
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
      border: 1px solid var(--vscode-button-background, #0e639c);
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--vscode-button-hoverBackground, #1177bb);
      border-color: var(--vscode-button-hoverBackground, #1177bb);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground, #3c3c3c);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      border: 1px solid var(--vscode-button-border, #5a5a5a);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
      border-color: var(--vscode-button-border, #5a5a5a);
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
    const sourceVolumeName = this.volume?.name ?? '';
    const sourcePoolName = this.pool?.name ?? '';
    const disableInputs = this.isCloning || !this.pool || !this.volume;

    const poolOptions = (this.poolNames && this.poolNames.length)
      ? this.poolNames
      : (sourcePoolName ? [sourcePoolName] : []);
    const selectedTargetPool = this.targetPool || sourcePoolName || (poolOptions[0] ?? '');

    return html`
      <div class="drawer">
        <div class="drawer-header">
          <h2 class="header-title">Clone Volume</h2>
          <button class="close-button" @click=${this.handleClose} ?disabled=${disableInputs}>×</button>
        </div>

        <div class="drawer-content">
          <div class="form-container">
            <div class="info-box">
              <div class="info-row">
                <span class="info-label">Source volume</span>
                <span>${sourceVolumeName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Source pool</span>
                <span>${sourcePoolName}</span>
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
                ?disabled=${disableInputs}
              />
              ${this.errors.has('name') ? html`
                <div class="error-message">${this.errors.get('name')}</div>
              ` : html`
                <div class="form-hint">Name of the cloned volume in the target pool.</div>
              `}
            </div>

            <div class="form-group">
              <label class="form-label" for="target-pool">Target pool</label>
              <select
                id="target-pool"
                class="form-select ${this.errors.has('targetPool') ? 'error' : ''}"
                .value=${selectedTargetPool}
                @change=${(e: Event) => {
                  this.targetPool = (e.target as HTMLSelectElement).value;
                }}
                ?disabled=${disableInputs}
              >
                ${poolOptions.map(name => html`<option value=${name}>${name}</option>`)}
              </select>
              ${this.errors.has('targetPool') ? html`
                <div class="error-message">${this.errors.get('targetPool')}</div>
              ` : html`
                <div class="form-hint">Choose the pool where the cloned volume will be created. The source pool is selected by default.</div>
              `}
            </div>
          </div>
        </div>

        <div class="drawer-footer">
          <button
            class="btn btn-secondary"
            @click=${this.handleClose}
            ?disabled=${disableInputs}
          >
            Cancel
          </button>
          <button
            class="btn btn-primary"
            @click=${this.handleClone}
            ?disabled=${disableInputs}
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
