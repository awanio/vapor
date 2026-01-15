import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export type NetworkMode = 'nat' | 'route' | 'bridge' | 'private';

export interface DHCPHostFormRow {
  mac: string;
  ip: string;
  name: string;
}

export interface NetworkFormData {
  name: string;
  mode: NetworkMode;
  bridge: string;
  ipAddress: string;
  netmask: string;
  dhcpStart: string;
  dhcpEnd: string;
  autostart: boolean;
  hosts: DHCPHostFormRow[];
}

@customElement('network-form-drawer')
export class NetworkFormDrawer extends LitElement {
  @property({ type: Boolean, reflect: true })
  show = false;

  @property({ type: Boolean })
  loading = false;

  @property({ type: Boolean })
  editMode = false;

  @property({ type: Object })
  networkData: Partial<NetworkFormData> | null = null;

  @state()
  private formData: NetworkFormData = {
    name: '',
    mode: 'nat',
    bridge: '',
    ipAddress: '',
    netmask: '',
    dhcpStart: '',
    dhcpEnd: '',
    autostart: true,
    hosts: [],
  };

  @state()
  private errors: Record<string, string> = {};

  @state()
  private isClosing = false;

  static override styles = css`
    :host {
      display: block;
    }

    .drawer {
      position: fixed;
      inset-block: 0;
      inset-inline-end: 0;
      width: 480px;
      max-width: 100%;
      background: var(--vscode-editor-background, var(--vscode-bg-light));
      border-left: 1px solid var(--vscode-border);
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      animation: slideIn 0.25s ease-out;
      z-index: 1001;
    }

    .drawer.closing {
      animation: slideOut 0.25s ease-in;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(0);
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
      }
      to {
        transform: translateX(100%);
      }
    }

    .drawer-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--vscode-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--vscode-editor-background, var(--vscode-bg-light));
    }

    .drawer-title {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--vscode-foreground, #cccccc);
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      font-size: 18px;
      line-height: 1;
    }

    .close-btn:hover {
      background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
    }

    .drawer-body {
      padding: 16px 20px 80px;
      overflow-y: auto;
      flex: 1;
    }

    .drawer-footer {
      padding: 12px 20px;
      border-top: 1px solid var(--vscode-border);
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      background: var(--vscode-editor-background, var(--vscode-bg-light));
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section {
      border-radius: 4px;
      border: 1px solid var(--vscode-border);
      padding: 12px 12px 8px;
      background: var(--vscode-editorWidget-background, rgba(0, 0, 0, 0.03));
    }

    .section + .section {
      margin-top: 4px;
    }

    .section-title {
      font-size: 13px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: var(--vscode-foreground, #cccccc);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 10px;
    }

    .field-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    label {
      font-size: 12px;
      font-weight: 500;
      color: var(--vscode-descriptionForeground, #9d9d9d);
    }

    .required::after {
      content: ' *';
      color: var(--vscode-inputValidation-errorForeground, #f48771);
    }

    input,
    select {
      padding: 6px 8px;
      border-radius: 3px;
      border: 1px solid var(--vscode-input-border, #5a5a5a);
      background: var(--vscode-input-background, #3c3c3c);
      color: var(--vscode-input-foreground, #cccccc);
      font-size: 13px;
      font-family: inherit;
      outline: none;
      box-sizing: border-box;
    }

    input:focus,
    select:focus {
      border-color: var(--vscode-focusBorder, #007acc);
    }

    input:disabled,
    select:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    input.error,
    select.error {
      border-color: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    .error-text {
      color: var(--vscode-inputValidation-errorForeground, #f48771);
      font-size: 11px;
    }

    .hint {
      font-size: 11px;
      color: var(--vscode-descriptionForeground, #9d9d9d);
    }

    .checkbox-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }

    .hosts-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 12px;
    }

    .hosts-table th,
    .hosts-table td {
      border: 1px solid var(--vscode-border);
      padding: 4px 6px;
    }

    .hosts-table th {
      background: var(--vscode-editor-background, var(--vscode-bg-light));
      font-weight: 500;
      text-align: left;
    }

    .btn {
      padding: 6px 12px;
      border-radius: 4px;
      border: 1px solid transparent;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
    }

    .btn-primary {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
      border-color: var(--vscode-button-background, #0e639c);
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--vscode-button-hoverBackground, #1177bb);
      border-color: var(--vscode-button-hoverBackground, #1177bb);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground, #3c3c3c);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      border-color: var(--vscode-button-border, #5a5a5a);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }

    .btn-ghost {
      background: transparent;
      color: var(--vscode-button-foreground, #ffffff);
      border-color: var(--vscode-button-border, #5a5a5a);
      font-size: 11px;
      padding: 4px 8px;
    }

    .btn-ghost:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.05);
    }

    .btn-danger {
      color: var(--vscode-errorForeground, #f48771);
      border-color: rgba(244, 135, 113, 0.4);
      background: rgba(244, 135, 113, 0.08);
    }

    .btn-danger:hover:not(:disabled) {
      background: rgba(244, 135, 113, 0.16);
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('keydown', this.handleEscape);
  }

  override disconnectedCallback(): void {
    window.removeEventListener('keydown', this.handleEscape);
    super.disconnectedCallback();
  }

  private handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.show && !this.loading) {
      event.stopPropagation();
      this.handleClose();
    }
  };

  protected override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('networkData') && this.networkData) {
      const data = this.networkData;
      this.formData = {
        name: data.name ?? '',
        mode: (data.mode as NetworkMode) ?? 'nat',
        bridge: data.bridge ?? '',
        ipAddress: data.ipAddress ?? '',
        netmask: data.netmask ?? '',
        dhcpStart: data.dhcpStart ?? '',
        dhcpEnd: data.dhcpEnd ?? '',
        autostart: data.autostart ?? true,
        hosts: data.hosts ?? [],
      };
      this.errors = {};
    }

    if (changed.has('show')) {
      if (this.show) {
        // Focus name input when opening
        requestAnimationFrame(() => {
          const input = this.renderRoot.querySelector<HTMLInputElement>('#network-name');
          input?.focus();
        });
      } else {
        // Reset form shortly after closing
        setTimeout(() => {
          this.formData = {
            name: '',
            mode: 'nat',
            bridge: '',
            ipAddress: '',
            netmask: '',
            dhcpStart: '',
            dhcpEnd: '',
            autostart: true,
            hosts: [],
          };
          this.errors = {};
        }, 300);
      }
    }
  }

  private handleClose = () => {
    if (this.loading || this.isClosing) return;
    this.isClosing = true;
    setTimeout(() => {
      this.isClosing = false;
      this.dispatchEvent(
        new CustomEvent('close', {
          bubbles: true,
          composed: true,
        }),
      );
    }, 250);
  };

  private validateField(field: keyof NetworkFormData): boolean {
    const value = this.formData[field];
    let error = '';

    switch (field) {
      case 'name': {
        const name = String(value || '').trim();
        if (!name) {
          error = 'Name is required';
        } else if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
          error = 'Use only letters, numbers, dashes, and underscores';
        }
        break;
      }
      case 'bridge': {
        if (this.formData.mode === 'bridge') {
          const bridge = String(value || '').trim();
          if (!bridge) {
            error = 'Bridge name is required for bridge mode';
          }
        }
        break;
      }
      default:
        break;
    }

    const newErrors = { ...this.errors };
    if (error) {
      newErrors[field] = error;
    } else {
      delete newErrors[field];
    }
    this.errors = newErrors;
    return !error;
  }

  private validateForm(): boolean {
    const fieldsToValidate: (keyof NetworkFormData)[] = ['name'];
    if (this.formData.mode === 'bridge') {
      fieldsToValidate.push('bridge');
    }

    let isValid = true;
    for (const field of fieldsToValidate) {
      if (!this.validateField(field)) {
        isValid = false;
      }
    }

    // IP range: require both address and netmask if either is provided
    const hasIpAddress = !!this.formData.ipAddress.trim();
    const hasNetmask = !!this.formData.netmask.trim();
    // For NAT/route networks, libvirt requires an IPv4 <ip> block (address+netmask).
    if (this.formData.mode === 'nat' || this.formData.mode === 'route') {
      if (!hasIpAddress || !hasNetmask) {
        this.errors = {
          ...this.errors,
          ipAddress: !hasIpAddress ? 'IP address is required for NAT/Route networks' : (this.errors.ipAddress || ''),
          netmask: !hasNetmask ? 'Netmask is required for NAT/Route networks' : (this.errors.netmask || ''),
        };
        isValid = false;
      }
    }

    if (hasIpAddress || hasNetmask) {
      if (!hasIpAddress || !hasNetmask) {
        this.errors = {
          ...this.errors,
          ipAddress: !hasIpAddress ? 'IP address is required when netmask is set' : (this.errors.ipAddress || ''),
          netmask: !hasNetmask ? 'Netmask is required when IP address is set' : (this.errors.netmask || ''),
        };
        isValid = false;
      }
    }

    // DHCP: if one of start/end is set, require both
    const hasDhcpStart = !!this.formData.dhcpStart.trim();
    const hasDhcpEnd = !!this.formData.dhcpEnd.trim();
    if (hasDhcpStart || hasDhcpEnd) {
      if (!hasDhcpStart || !hasDhcpEnd) {
        this.errors = {
          ...this.errors,
          dhcpStart: !hasDhcpStart ? 'DHCP start is required when end is set' : (this.errors.dhcpStart || ''),
          dhcpEnd: !hasDhcpEnd ? 'DHCP end is required when start is set' : (this.errors.dhcpEnd || ''),
        };
        isValid = false;
      }
    }

    return isValid;
  }

  private handleInputChange(field: keyof NetworkFormData, value: string | boolean) {
    this.formData = {
      ...this.formData,
      [field]: typeof value === 'string' ? value : value,
    };

    if (field === 'name' || field === 'bridge') {
      this.validateField(field);
    }
  }

  private handleModeChange(value: NetworkMode) {
    this.formData = {
      ...this.formData,
      mode: value,
    };

    // Clear bridge error if mode is no longer bridge
    if (value !== 'bridge' && this.errors.bridge) {
      const { bridge, ...rest } = this.errors;
      this.errors = rest;
    }
  }

  private addHostRow() {
    this.formData = {
      ...this.formData,
      hosts: [...this.formData.hosts, { mac: '', ip: '', name: '' }],
    };
  }

  private updateHostRow(index: number, field: keyof DHCPHostFormRow, value: string) {
    const hosts = this.formData.hosts.map((host, i) =>
      i === index
        ? {
          ...host,
          [field]: value,
        }
        : host,
    );
    this.formData = {
      ...this.formData,
      hosts,
    };
  }

  private removeHostRow(index: number) {
    const hosts = this.formData.hosts.filter((_, i) => i !== index);
    this.formData = {
      ...this.formData,
      hosts,
    };
  }

  private handleSubmit(event: Event) {
    event.preventDefault();
    if (this.loading) return;

    if (!this.validateForm()) {
      return;
    }

    const trimmedName = this.formData.name.trim();

    const sanitized: NetworkFormData = {
      ...this.formData,
      name: trimmedName,
      bridge: this.formData.bridge.trim(),
      ipAddress: this.formData.ipAddress.trim(),
      netmask: this.formData.netmask.trim(),
      dhcpStart: this.formData.dhcpStart.trim(),
      dhcpEnd: this.formData.dhcpEnd.trim(),
      hosts: this.formData.hosts
        .map(h => ({
          mac: h.mac.trim(),
          ip: h.ip.trim(),
          name: h.name.trim(),
        }))
        .filter(h => h.mac || h.ip || h.name),
    };

    this.dispatchEvent(
      new CustomEvent('save', {
        detail: { formData: sanitized },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private get showDhcpSection(): boolean {
    return !!this.formData.ipAddress.trim() && !!this.formData.netmask.trim();
  }

  override render() {
    if (!this.show && !this.isClosing) return null;

    return html`
      <div class="drawer ${this.isClosing ? 'closing' : ''}" role="dialog" aria-modal="true">
        <div class="drawer-header">
          <h2 class="drawer-title">
            ${this.editMode ? 'Edit Virtual Network' : 'Create Virtual Network'}
          </h2>
          <button class="close-btn" @click=${this.handleClose} aria-label="Close">
            ×
          </button>
        </div>
        <div class="drawer-body">
          <form @submit=${this.handleSubmit}>
            <div class="section">
              <h3 class="section-title">General</h3>
              <div class="field">
                <label for="network-name" class="required">Name</label>
                <input
                  id="network-name"
                  class=${this.errors.name ? 'error' : ''}
                  type="text"
                  .value=${this.formData.name}
                  ?disabled=${this.loading || this.editMode}
                  @input=${(e: Event) =>
        this.handleInputChange('name', (e.target as HTMLInputElement).value)}
                />
                ${this.errors.name
        ? html`<div class="error-text">${this.errors.name}</div>`
        : html`<div class="hint">Use lowercase letters, numbers, dashes, and underscores.</div>`}
              </div>

              <div class="field">
                <label for="network-mode" class="required">Mode</label>
                <select
                  id="network-mode"
                  .value=${this.formData.mode}
                  ?disabled=${this.loading}
                  @change=${(e: Event) =>
        this.handleModeChange((e.target as HTMLSelectElement).value as NetworkMode)}
                >
                  <option value="nat">NAT</option>
                  <option value="route">Route</option>
                  <option value="bridge">Bridge</option>
                  <option value="private">Private</option>
                </select>
              </div>

              ${this.formData.mode === 'bridge'
        ? html`<div class="field">
                    <label for="network-bridge" class="required">Host bridge name</label>
                    <input
                      id="network-bridge"
                      class=${this.errors.bridge ? 'error' : ''}
                      type="text"
                      .value=${this.formData.bridge}
                      ?disabled=${this.loading}
                      @input=${(e: Event) =>
            this.handleInputChange('bridge', (e.target as HTMLInputElement).value)}
                    />
                    ${this.errors.bridge
            ? html`<div class="error-text">${this.errors.bridge}</div>`
            : html`<div class="hint">Existing host bridge to attach this virtual network to (e.g. br0).</div>`}
                  </div>`
        : null}

              <div class="checkbox-row">
                <input
                  id="network-autostart"
                  type="checkbox"
                  .checked=${this.formData.autostart}
                  ?disabled=${this.loading}
                  @change=${(e: Event) =>
        this.handleInputChange('autostart', (e.target as HTMLInputElement).checked)}
                />
                <label for="network-autostart">Start network automatically on host boot</label>
              </div>
            </div>

            <div class="section">
              <h3 class="section-title">IP Range</h3>
              <div class="field-row">
                <div class="field">
                  <label for="ip-address">Address</label>
                  <input
                    id="ip-address"
                    class=${this.errors.ipAddress ? 'error' : ''}
                    type="text"
                    .value=${this.formData.ipAddress}
                    ?disabled=${this.loading}
                    @input=${(e: Event) =>
        this.handleInputChange('ipAddress', (e.target as HTMLInputElement).value)}
                  />
                  ${this.errors.ipAddress
        ? html`<div class="error-text">${this.errors.ipAddress}</div>`
        : html`<div class="hint">Gateway IP, e.g. 192.168.250.1</div>`}
                </div>
                <div class="field">
                  <label for="netmask">Netmask</label>
                  <input
                    id="netmask"
                    class=${this.errors.netmask ? 'error' : ''}
                    type="text"
                    .value=${this.formData.netmask}
                    ?disabled=${this.loading}
                    @input=${(e: Event) =>
        this.handleInputChange('netmask', (e.target as HTMLInputElement).value)}
                  />
                  ${this.errors.netmask
        ? html`<div class="error-text">${this.errors.netmask}</div>`
        : html`<div class="hint">Netmask, e.g. 255.255.255.0</div>`}
                </div>
              </div>
              <div class="hint">Required for NAT/Route networks. Optional for Bridge/Private.</div>
            </div>

            ${this.showDhcpSection
        ? html`<div class="section">
                  <h3 class="section-title">DHCP (optional)</h3>
                  <div class="field-row">
                    <div class="field">
                      <label for="dhcp-start">Start IP</label>
                      <input
                        id="dhcp-start"
                        class=${this.errors.dhcpStart ? 'error' : ''}
                        type="text"
                        .value=${this.formData.dhcpStart}
                        ?disabled=${this.loading}
                        @input=${(e: Event) =>
            this.handleInputChange('dhcpStart', (e.target as HTMLInputElement).value)}
                      />
                      ${this.errors.dhcpStart
            ? html`<div class="error-text">${this.errors.dhcpStart}</div>`
            : html`<div class="hint">First IP in DHCP pool.</div>`}
                    </div>
                    <div class="field">
                      <label for="dhcp-end">End IP</label>
                      <input
                        id="dhcp-end"
                        class=${this.errors.dhcpEnd ? 'error' : ''}
                        type="text"
                        .value=${this.formData.dhcpEnd}
                        ?disabled=${this.loading}
                        @input=${(e: Event) =>
            this.handleInputChange('dhcpEnd', (e.target as HTMLInputElement).value)}
                      />
                      ${this.errors.dhcpEnd
            ? html`<div class="error-text">${this.errors.dhcpEnd}</div>`
            : html`<div class="hint">Last IP in DHCP pool.</div>`}
                    </div>
                  </div>

                  <div class="field">
                    <label>Static DHCP hosts (optional)</label>
                    <table class="hosts-table">
                      <thead>
                        <tr>
                          <th>MAC address</th>
                          <th>IP address</th>
                          <th>Hostname</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        ${this.formData.hosts.map(
              (host, index) => html`<tr>
                            <td>
                              <input
                                type="text"
                                .value=${host.mac}
                                ?disabled=${this.loading}
                                @input=${(e: Event) =>
                  this.updateHostRow(
                    index,
                    'mac',
                    (e.target as HTMLInputElement).value,
                  )}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                .value=${host.ip}
                                ?disabled=${this.loading}
                                @input=${(e: Event) =>
                  this.updateHostRow(
                    index,
                    'ip',
                    (e.target as HTMLInputElement).value,
                  )}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                .value=${host.name}
                                ?disabled=${this.loading}
                                @input=${(e: Event) =>
                  this.updateHostRow(
                    index,
                    'name',
                    (e.target as HTMLInputElement).value,
                  )}
                              />
                            </td>
                            <td style="text-align: center;">
                              <button
                                type="button"
                                class="btn btn-ghost btn-danger"
                                ?disabled=${this.loading}
                                @click=${() => this.removeHostRow(index)}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>`,
            )}
                      </tbody>
                    </table>
                    <button
                      type="button"
                      class="btn btn-ghost"
                      ?disabled=${this.loading}
                      @click=${this.addHostRow}
                    >
                      Add static host
                    </button>
                  </div>
                </div>`
        : null}
          </form>
        </div>
        <div class="drawer-footer">
          <button
            type="button"
            class="btn btn-secondary"
            @click=${this.handleClose}
            ?disabled=${this.loading}
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click=${this.handleSubmit}
            ?disabled=${this.loading}
          >
            ${this.loading
        ? this.editMode
          ? 'Updating...'
          : 'Creating...'
        : this.editMode
          ? 'Update'
          : 'Create'}
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'network-form-drawer': NetworkFormDrawer;
  }
}
