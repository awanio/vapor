import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import YAML from 'yaml';

/**
 * Create resource drawer component for creating Kubernetes resources via YAML/JSON
 * @element create-resource-drawer
 * 
 * @fires close - Fired when the drawer is closed
 * @fires create - Fired when create button is clicked with valid resource
 * 
 * @csspart drawer - The drawer container
 * @csspart header - The drawer header
 * @csspart content - The content area
 * @csspart editor - The code editor textarea
 * @csspart controls - The control buttons container
 */
@customElement('create-resource-drawer')
export class CreateResourceDrawer extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      right: 0;
      width: 700px;
      height: 100vh;
      z-index: 1000;
      /* Prevent overlay from intercepting clicks when hidden */
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
      background: var(--vscode-bg-lighter, #2c2f3a);
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .header-title {
      font-size: 18px;
      font-weight: 500;
      color: var(--title-color, #e0e0e0);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .close-button {
      background: none;
      border: none;
      color: var(--close-color, #999);
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .close-button:hover {
      background: var(--close-hover-bg, rgba(255, 255, 255, 0.1));
      color: var(--close-hover-color, #e0e0e0);
    }

.format-toggle {
      padding: 12px 20px;
      background: var(--vscode-bg-lighter, #2c2f3a);
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .format-left {
      display: inline-flex;
      gap: 8px;
      align-items: center;
    }

    .format-hint {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: 1px solid transparent;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }

    .format-hint.yaml {
      background: rgba(137, 209, 133, 0.08);
      border-color: #89d185;
      color: #89d185;
    }

    .format-hint.json {
      background: rgba(55, 148, 255, 0.08);
      border-color: #3794ff;
      color: #3794ff;
    }

.format-button {
      padding: 8px 16px;
      background: var(--button-bg, var(--vscode-bg-lighter, #3a3d4a));
      color: var(--button-color, var(--vscode-foreground, #e0e0e0));
      border: 1px solid var(--button-border, var(--vscode-widget-border, #4a4d5a));
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

.format-button:hover {
      background: var(--button-hover-bg, #4a4d5a);
      border-color: var(--button-hover-border, #5a5d6a);
    }

.format-button.active {
      background: var(--vscode-button-background, #0e639c);
      border-color: var(--vscode-button-border, transparent);
      color: var(--vscode-button-foreground, #ffffff);
    }

    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .editor-container {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
    }

.editor {
      width: 100%;
      min-height: 400px;
      padding: 16px;
      background: var(--vscode-editor-background, #1e1e1e);
      color: var(--vscode-editor-foreground, #d4d4d4);
      border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      border-radius: 4px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.6;
      resize: vertical;
      outline: none;
    }

.editor:focus {
      border-color: var(--vscode-focusBorder, #007acc);
    }

    .editor::placeholder {
      color: var(--editor-placeholder, #666);
    }

    .validation-message {
      margin-top: 12px;
      padding: 12px;
      border-radius: 4px;
      font-size: 14px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .validation-message.error {
      background: var(--error-bg, rgba(244, 67, 54, 0.1));
      color: var(--error-color, #f44336);
      border: 1px solid var(--error-border, rgba(244, 67, 54, 0.3));
    }

    .validation-message.success {
      background: var(--success-bg, rgba(76, 175, 80, 0.1));
      color: var(--success-color, #4caf50);
      border: 1px solid var(--success-border, rgba(76, 175, 80, 0.3));
    }

    .validation-icon {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
    }

    .templates {
      padding: 0 20px 20px;
    }

    .templates-title {
      font-size: 14px;
      color: var(--templates-title-color, #999);
      margin-bottom: 8px;
    }

    .template-buttons {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .template-button {
      padding: 6px 12px;
      background: var(--template-bg, #3a3d4a);
      color: var(--template-color, #e0e0e0);
      border: 1px solid var(--template-border, #4a4d5a);
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }

    .template-button:hover {
      background: var(--template-hover-bg, #4a4d5a);
      border-color: var(--template-hover-border, #5a5d6a);
    }

.controls {
      padding: 20px;
      background: var(--vscode-bg-lighter, #2c2f3a);
      border-top: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      flex-shrink: 0;
    }

    .control-button {
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
      border: 1px solid transparent;
    }

.control-button.cancel {
      background: var(--vscode-button-secondaryBackground, #3a3d4a);
      color: var(--vscode-button-secondaryForeground, #e0e0e0);
      border-color: var(--vscode-button-border, #4a4d5a);
    }

.control-button.cancel:hover {
      background: var(--vscode-button-secondaryHoverBackground, #4a4d5a);
      border-color: var(--vscode-button-border, #5a5d6a);
    }

.control-button.create {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
      border-color: var(--vscode-button-border, transparent);
    }

.control-button.create:hover {
      background: var(--vscode-button-hoverBackground, #1177bb);
      border-color: var(--vscode-button-border, transparent);
    }

    .control-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Scrollbar styling */
    .editor-container::-webkit-scrollbar {
      width: 8px;
    }

.editor-container::-webkit-scrollbar-track {
      background: var(--scrollbar-track, var(--vscode-editor-background, #1e1e1e));
    }

.editor-container::-webkit-scrollbar-thumb {
      background: var(--scrollbar-thumb, var(--vscode-scrollbarSlider-background, #4a4d5a));
      border-radius: 4px;
    }

    .editor-container::-webkit-scrollbar-thumb:hover {
      background: var(--scrollbar-thumb-hover, #5a5d6a);
    }
  `;

  @property({ type: Boolean, reflect: true }) show = false;
  @property({ type: String }) override title = 'Create Resource';
  @property({ type: String }) value = '';
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) error = '';
  @property({ type: String }) format: 'yaml' | 'json' = 'yaml';
  @property({ type: String }) submitLabel: string = 'Create';

  @state() private validationMessage = '';
  @state() private validationStatus: 'error' | 'success' | '' = '';

  private templates = {
    deployment: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-deployment
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-container
        image: nginx:latest
        ports:
        - containerPort: 80`,
    
    service: `apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: default
spec:
  selector:
    app: my-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: ClusterIP`,
    
    configmap: `apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config
  namespace: default
data:
  config.yaml: |
    key1: value1
    key2: value2`,
    
    secret: `apiVersion: v1
kind: Secret
metadata:
  name: my-secret
  namespace: default
type: Opaque
data:
  username: YWRtaW4=
  password: cGFzc3dvcmQ=`
  };

  override render() {
    return html`
      <div class="drawer" part="drawer">
        <div class="drawer-header" part="header">
          <h2 class="header-title">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a1 1 0 011 1v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H3a1 1 0 110-2h6V3a1 1 0 011-1z"/>
            </svg>
            ${this.title}
          </h2>
          <button class="close-button" @click=${this.handleClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>

        <div class="format-toggle">
          <div class="format-left">
            <button
              class="format-button ${this.format === 'yaml' ? 'active' : ''}"
              @click=${() => this.setFormat('yaml')}
            >
              YAML
            </button>
            <button
              class="format-button ${this.format === 'json' ? 'active' : ''}"
              @click=${() => this.setFormat('json')}
            >
              JSON
            </button>
          </div>
          <div class="format-hint ${this.format}">
            ${this.format.toUpperCase()} format detected
          </div>
        </div>

        <div class="content" part="content">
          <div class="editor-container">
            <textarea
              class="editor"
              part="editor"
              .value=${this.value}
              @input=${this.handleInput}
              placeholder=${this.getPlaceholder()}
              spellcheck="false"
            ></textarea>
            
            ${this.validationMessage ? html`
              <div class="validation-message ${this.validationStatus}">
                <svg class="validation-icon" viewBox="0 0 16 16" fill="currentColor">
                  ${this.validationStatus === 'error' ? html`
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-1 10V6h2v5H7zm0 2v-1h2v1H7z"/>
                  ` : html`
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.5 4.5L7 10 4.5 7.5l1-1L7 8l3.5-3.5 1 1z"/>
                  `}
                </svg>
                <span>${this.validationMessage}</span>
              </div>
            ` : ''}
          </div>

          <div class="templates">
            <div class="templates-title">Quick Templates:</div>
            <div class="template-buttons">
              <button class="template-button" @click=${() => this.loadTemplate('deployment')}>
                Deployment
              </button>
              <button class="template-button" @click=${() => this.loadTemplate('service')}>
                Service
              </button>
              <button class="template-button" @click=${() => this.loadTemplate('configmap')}>
                ConfigMap
              </button>
              <button class="template-button" @click=${() => this.loadTemplate('secret')}>
                Secret
              </button>
            </div>
          </div>
        </div>

        <div class="controls" part="controls">
          <button
            class="control-button cancel"
            @click=${this.handleClose}
            ?disabled=${this.loading}
          >
            Cancel
          </button>
          <button
            class="control-button create"
            @click=${this.handleCreate}
            ?disabled=${this.loading || !this.value.trim() || this.validationStatus === 'error'}
          >
            ${this.loading ? 'Processing...' : this.submitLabel}
          </button>
        </div>
      </div>
    `;
  }

  private getPlaceholder() {
    if (this.format === 'yaml') {
      return `# Enter your Kubernetes resource definition in YAML format
# Example:
# apiVersion: v1
# kind: Pod
# metadata:
#   name: my-pod
# spec:
#   containers:
#   - name: my-container
#     image: nginx`;
    } else {
      return `{
  "apiVersion": "v1",
  "kind": "Pod",
  "metadata": {
    "name": "my-pod"
  },
  "spec": {
    "containers": [{
      "name": "my-container",
      "image": "nginx"
    }]
  }
}`;
    }
  }

  private handleInput(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    this.value = textarea.value;
    // Auto-detect format based on content
    const detected = this.detectFormat(this.value);
    this.format = detected;
    this.validateResource();
  }

  private setFormat(format: 'yaml' | 'json') {
    this.format = format;
    // Try to convert between formats if there's content
    if (this.value.trim()) {
      this.convertFormat();
    }
  }

  private detectFormat(text: string): 'yaml' | 'json' {
    const t = text.trim();
    if (!t) return this.format;
    if (t.startsWith('{') || t.startsWith('[')) {
      try {
        JSON.parse(t);
        return 'json';
      } catch {
        return 'yaml';
      }
    }
    return 'yaml';
  }

  private convertFormat() {
    try {
      if (this.format === 'json') {
        // Convert YAML to pretty JSON
        const obj = YAML.parse(this.value);
        this.value = JSON.stringify(obj, null, 2);
        this.validationMessage = '';
        this.validationStatus = '';
      } else {
        // Convert JSON to YAML
        const obj = JSON.parse(this.value);
        this.value = YAML.stringify(obj);
        this.validationMessage = '';
        this.validationStatus = '';
      }
      this.validateResource();
    } catch (error) {
      this.validationMessage = 'Failed to convert format';
      this.validationStatus = 'error';
    }
  }

  private validateResource() {
    if (!this.value.trim()) {
      this.validationMessage = '';
      this.validationStatus = '';
      return;
    }

    try {
      if (this.format === 'json') {
        const resource = JSON.parse(this.value);
        this.validateResourceStructure(resource);
      } else {
        // Parse YAML and validate structure
        const resource = YAML.parse(this.value);
        this.validateResourceStructure(resource);
      }
    } catch (error: any) {
      this.validationMessage = error.message || 'Invalid format';
      this.validationStatus = 'error';
    }
  }

  private validateResourceStructure(resource: any) {
    if (!resource.apiVersion) {
      throw new Error('Missing required field: apiVersion');
    }
    if (!resource.kind) {
      throw new Error('Missing required field: kind');
    }
    if (!resource.metadata) {
      throw new Error('Missing required field: metadata');
    }
    if (!resource.metadata.name) {
      throw new Error('Missing required field: metadata.name');
    }
    
    this.validationMessage = `Valid ${resource.kind} resource`;
    this.validationStatus = 'success';
  }

  private loadTemplate(templateName: keyof typeof this.templates) {
    this.value = this.templates[templateName];
    this.format = 'yaml';
    this.validateResource();
  }

  private handleClose() {
    this.show = false;
    this.dispatchEvent(new CustomEvent('close', {
      bubbles: true,
      composed: true
    }));
  }

  private handleCreate() {
    if (!this.value.trim() || this.validationStatus === 'error') {
      return;
    }

    let resource;
    try {
      if (this.format === 'json') {
        resource = JSON.parse(this.value);
      } else {
        // In a real app, parse YAML to JSON
        resource = { yaml: this.value };
      }

      this.dispatchEvent(new CustomEvent('create', {
        detail: { resource, format: this.format },
        bubbles: true,
        composed: true
      }));
    } catch (error) {
      this.validationMessage = 'Failed to parse resource';
      this.validationStatus = 'error';
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'create-resource-drawer': CreateResourceDrawer;
  }
}
