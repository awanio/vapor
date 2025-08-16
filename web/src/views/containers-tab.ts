import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { t } from '../i18n';
import { api, ApiError } from '../api';
import type { Container, Image, ContainersResponse, ImagesResponse } from '../types/api';
import '../components/modal-dialog';

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export class ContainersTab extends LitElement {
  @state()
  private activeTab = 'containers';

  @state()
  private containers: Container[] = [];

  @state()
  private images: Image[] = [];

  @state()
  private searchTerm: string = '';

  @state()
  private error: string | null = null;

  @state()
  private runtime: string | null = null;

  @state()
  private showConfirmModal = false;

  @state()
  private confirmAction: (() => void) | null = null;

  @state()
  private selectedContainer: Container | null = null;

  @state()
  private selectedImage: Image | null = null;

  @state()
  private showDrawer: boolean = false;

  @state()
  private detailError: string | null = null;

  @state()
  private confirmTitle = '';

  @state()
  private confirmMessage = '';

  @state()
  private showLogsDrawer: boolean = false;

  @state()
  private containerLogs: string = '';

  @state()
  private logsError: string | null = null;

  @state()
  private logsSearchTerm: string = '';

  @state()
  private showImageActionsDropdown: boolean = false;

  @state()
  private showPullImageModal: boolean = false;

  @state()
  private imageName: string = '';

  @state()
  private selectedFile: File | null = null;

  @state()
  private showUploadDrawer: boolean = false;

  @state()
  private uploadQueue: UploadItem[] = [];

  @state()
  private isUploading: boolean = false;

  static override styles = css`
    :host {
      display: block;
      padding: 16px;
    }

    .tab-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .tab-header {
      display: flex;
      border-bottom: 2px solid var(--border-color);
      margin-bottom: 1rem;
    }

    .tab-button {
      padding: 0.75rem 1.5rem;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--text-secondary);
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s;
    }

    .tab-button:hover {
      color: var(--text-primary);
    }

    .tab-button.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }

    .tab-content {
      flex: 1;
      overflow-y: auto;
    }

    .container {
      background: var(--vscode-bg-light);
      color: var(--vscode-text);
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 16px;
    }

    .container-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .container-info {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 16px;
      font-size: 13px;
    }

    .container-actions {
      display: flex;
      gap: 8px;
    }

    button {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--vscode-accent);
      color: white;
    }

    .btn-primary:hover {
      background: var(--vscode-accent-hover);
    }

    .btn-danger {
      background: var(--vscode-error);
      color: white;
    }

    .btn-danger:hover {
      opacity: 0.9;
    }

    .size-info {
      font-size: 12px;
      color: var(--vscode-text-dim);
    }

    h1 {
      margin: 0 0 24px 0;
      font-size: 24px;
      font-weight: 300;
    }

    h2 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: var(--text-primary);
    }

    .image {
      background: var(--vscode-bg-light);
      color: var(--vscode-text);
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 16px;
    }

    .image-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .image-info {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 16px;
      font-size: 13px;
    }

    .image-actions {
      display: flex;
      gap: 8px;
    }

    .search-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      gap: 1rem;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .section-header h2 {
      margin: 0;
    }

    .search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      max-width: 400px;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      color: var(--vscode-input-placeholderForeground, #999);
      pointer-events: none;
      width: 16px;
      height: 16px;
    }

    .search-input {
      padding: 6px 12px 6px 32px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-input-border, var(--vscode-panel-border, #454545)));
      border-radius: 4px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: 0.875rem;
      width: 250px;
      transition: all 0.2s;
      outline: none;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
    }

    .search-input:hover {
      border-color: var(--vscode-inputOption-hoverBorder, var(--vscode-widget-border, #858585));
    }

    .search-input:focus {
      border-color: var(--vscode-focusBorder, #007acc);
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--vscode-focusBorder, #007acc);
    }

    .search-input::placeholder {
      color: var(--vscode-input-placeholderForeground, #999);
      opacity: 0.7;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }

    .error-state {
      text-align: center;
      padding: 3rem;
      color: var(--vscode-error);
      background: var(--vscode-bg-light);
      border-radius: 6px;
      margin: 2rem 0;
    }


    .table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      background: var(--vscode-bg-light);
      border-radius: 1px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
    }

    .table thead {
      background: var(--vscode-bg-lighter);
    }

    .table th {
      background: var(--vscode-bg-dark);
      color: var(--vscode-text);
      font-weight: 600;
      text-align: left;
      padding: 12px 16px;
      font-size: 0.875rem;
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
    }

    .table td {
      padding: 12px 16px;
      color: var(--vscode-text);
      font-size: 0.875rem;
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      position: relative;
    }

    .table td:last-child {
      text-align: right;
    }

    .table tr:last-child td {
      border-bottom: none;
    }

    .table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .table td button {
      margin-right: 8px;
    }

    .table td button:last-child {
      margin-right: 0;
    }

    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .status-icon {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
      position: relative;
    }

    .status-icon.running {
      background-color: #4caf50;
      box-shadow: 0 0 4px #4caf50;
    }

    .status-icon.stopped {
      background-color: #9e9e9e;
    }

    .status-icon.paused {
      background-color: #ff9800;
    }

    .status-icon.exited {
      background-color: #f44336;
    }

    .status-icon[data-tooltip]:hover::after {
      content: attr(data-tooltip);
      position: absolute;
      left: 15px;
      top: 50%;
      transform: translateY(-50%);
      padding: 6px 12px;
      background-color: var(--vscode-editorWidget-background, var(--vscode-dropdown-background, #252526));
      color: var(--vscode-editorWidget-foreground, var(--vscode-foreground, #cccccc));
      border: 1px solid var(--vscode-editorWidget-border, var(--vscode-widget-border, #454545));
      border-radius: 4px;
      font-size: 14px;
      white-space: nowrap;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .truncate {
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: inline-block;
      position: relative;
    }

    .truncate[title]:hover::after {
      content: attr(title);
      position: absolute;
      left: 0;
      top: 100%;
      margin-top: 4px;
      padding: 6px 12px;
      background-color: var(--vscode-editorWidget-background, var(--vscode-dropdown-background, #252526));
      color: var(--vscode-editorWidget-foreground, var(--vscode-foreground, #cccccc));
      border: 1px solid var(--vscode-editorWidget-border, var(--vscode-widget-border, #454545));
      border-radius: 4px;
      font-size: 14px;
      white-space: nowrap;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      pointer-events: none;
    }

    .action-menu {
      position: relative;
      display: inline-block;
    }

    .action-dots {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 8px;
      color: var(--text-secondary);
      font-size: 18px;
      line-height: 1;
      transition: background-color 0.2s;
      border-radius: 4px;
    }

    .action-dots:hover {
      background-color: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground, rgba(90, 93, 94, 0.1)));
    }

    .action-dropdown {
      position: absolute;
      right: 0;
      top: 100%;
      margin-top: 4px;
      background: var(--vscode-dropdown-background, var(--vscode-menu-background, var(--vscode-bg-light, #252526)));
      border: 1px solid var(--vscode-dropdown-border, var(--vscode-menu-border, var(--border-color, #454545)));
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      min-width: 160px;
      z-index: 1000;
      display: none;
    }

    .action-dropdown.show {
      display: block;
    }

    .action-dropdown button {
      display: block;
      width: 100%;
      text-align: left;
      padding: 8px 16px;
      border: none;
      background: none;
      color: var(--vscode-menu-foreground, var(--vscode-foreground, var(--vscode-text, #cccccc)));
      cursor: pointer;
      font-size: 13px;
      transition: background-color 0.2s;
    }

    .action-dropdown button:hover {
      background-color: var(--vscode-list-hoverBackground, var(--vscode-toolbar-hoverBackground, rgba(255, 255, 255, 0.08)));
      color: var(--vscode-list-hoverForeground, var(--vscode-foreground));
    }

    .action-dropdown button.danger {
      color: var(--vscode-error);
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--vscode-accent, #007acc);
      color: white;
    }

    .btn-primary:hover {
      background: var(--vscode-accent-hover, #005a9e);
    }

    .btn-secondary {
      background: var(--vscode-button-secondary-bg, #3c3c3c);
      color: var(--vscode-button-secondary-foreground, #cccccc);
      border: 1px solid var(--vscode-button-secondary-border, #5a5a5a);
    }

    .btn-secondary:hover {
      background: var(--vscode-button-secondary-hover-bg, #484848);
    }

    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: 50%;
      height: 100%;
      background: var(--vscode-bg-light);
      border-left: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
      z-index: 1001;
      overflow-y: auto;
      padding: 24px;
      animation: slideIn 0.3s ease-out;
    }

    /* Make drawer full width on smaller screens */
    @media (max-width: 1024px) {
      .drawer {
        width: 80%;
      }
    }

    @media (max-width: 768px) {
      .drawer {
        width: 100%;
      }
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(0);
      }
    }

    .drawer h2 {
      margin-top: 0;
    }

    .drawer pre {
      background: var(--vscode-bg-dark);
      border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      border-radius: 4px;
      padding: 16px;
      overflow-x: auto;
      font-size: 0.875rem;
      color: var(--vscode-text);
    }

    .drawer button.close-btn {
      position: absolute;
      top: 16px;
      right: 16px;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.1));
      color: var(--vscode-foreground, var(--vscode-editor-foreground));
      border: 1px solid var(--vscode-widget-border, rgba(0, 0, 0, 0.1));
      transition: all 0.2s;
    }

    .drawer button.close-btn:hover {
      background: var(--vscode-list-hoverBackground, rgba(90, 93, 94, 0.2));
      border-color: var(--vscode-widget-border, rgba(0, 0, 0, 0.2));
    }

    .drawer button.close-btn:active {
      background: var(--vscode-list-activeSelectionBackground, rgba(90, 93, 94, 0.3));
    }

    .drawer button.close-btn:focus {
      outline: 1px solid var(--vscode-focusBorder, #007acc);
      outline-offset: 2px;
    }

    .drawer-content {
      margin-top: 40px;
    }

    .detail-section {
      margin-bottom: 24px;
    }

    .detail-section h3 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--text-primary);
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      padding-bottom: 8px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      margin-bottom: 12px;
    }

    .detail-label {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin-bottom: 4px;
      font-weight: 500;
    }

    .detail-value {
      font-size: 0.875rem;
      color: var(--vscode-text);
      word-break: break-word;
    }

    .detail-value.monospace {
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      background: var(--vscode-textCodeBlock-background, rgba(255, 255, 255, 0.04));
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 0.8125rem;
    }

    .tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .tag {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .status-badge.running {
      background: rgba(76, 175, 80, 0.1);
      color: #4caf50;
      border: 1px solid rgba(76, 175, 80, 0.3);
    }

    .status-badge.stopped {
      background: rgba(158, 158, 158, 0.1);
      color: #9e9e9e;
      border: 1px solid rgba(158, 158, 158, 0.3);
    }

    .status-badge.paused {
      background: rgba(255, 152, 0, 0.1);
      color: #ff9800;
      border: 1px solid rgba(255, 152, 0, 0.3);
    }

    .status-badge.exited {
      background: rgba(244, 67, 54, 0.1);
      color: #f44336;
      border: 1px solid rgba(244, 67, 54, 0.3);
    }

    a {
      color: var(--vscode-textLink-foreground, #3794ff);
      text-decoration: none;
      cursor: pointer;
    }

    a:hover {
      text-decoration: underline;
    }

    /* Link-style buttons for clickable items */
    button.link-button,
    td button {
      background: none;
      border: none;
      color: var(--vscode-textLink-foreground, #3794ff);
      cursor: pointer;
      font-size: inherit;
      font-family: inherit;
      text-align: left;
      padding: 0;
      text-decoration: none;
      transition: text-decoration 0.2s;
    }

    button.link-button:hover,
    td button:hover {
      text-decoration: underline;
    }

    td button:focus {
      outline: 1px solid var(--vscode-focusBorder, #007acc);
      outline-offset: 2px;
    }

    .error-container {
      padding: 40px 20px;
      text-align: center;
    }

    .error-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.7;
    }

    .error-message {
      color: var(--vscode-errorForeground, #f48771);
      font-size: 14px;
      line-height: 1.5;
      margin: 0;
    }

    .logs-container {
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 0.875rem;
      line-height: 1.5;
      background: var(--vscode-editor-background, #1e1e1e);
      color: var(--vscode-editor-foreground, #d4d4d4);
      padding: 16px;
      border-radius: 4px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: calc(100vh - 200px);
      overflow-y: auto;
    }

    .logs-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
    }

    .logs-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--vscode-foreground);
    }

    /* Upload drawer styles */
    .upload-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
    }

    .upload-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--vscode-foreground);
    }

    .upload-zone {
      border: 2px dashed var(--vscode-widget-border, #454545);
      border-radius: 8px;
      padding: 40px 20px;
      text-align: center;
      margin-bottom: 24px;
      transition: all 0.2s;
      cursor: pointer;
    }

    .upload-zone:hover {
      border-color: var(--vscode-focusBorder, #007acc);
      background: rgba(0, 122, 204, 0.05);
    }

    .upload-zone.dragover {
      border-color: var(--vscode-focusBorder, #007acc);
      background: rgba(0, 122, 204, 0.1);
    }

    .upload-icon {
      font-size: 48px;
      margin-bottom: 16px;
      color: var(--vscode-descriptionForeground, #999);
    }

    .upload-text {
      font-size: 16px;
      margin-bottom: 8px;
      color: var(--vscode-foreground);
    }

    .upload-hint {
      font-size: 14px;
      color: var(--vscode-descriptionForeground, #999);
    }

    .upload-queue {
      margin-top: 24px;
    }

    .upload-item {
      background: var(--vscode-bg-dark);
      border: 1px solid var(--vscode-widget-border, #454545);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 12px;
    }

    .upload-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .upload-item-name {
      font-weight: 500;
      color: var(--vscode-foreground);
      flex: 1;
      margin-right: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .upload-item-size {
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #999);
      margin-right: 12px;
    }

    .upload-item-status {
      font-size: 12px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .upload-item-status.pending {
      background: rgba(255, 193, 7, 0.2);
      color: #ffc107;
    }

    .upload-item-status.uploading {
      background: rgba(0, 122, 204, 0.2);
      color: #007acc;
    }

    .upload-item-status.completed {
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
    }

    .upload-item-status.error {
      background: rgba(244, 67, 54, 0.2);
      color: #f44336;
    }

    .progress-bar {
      width: 100%;
      height: 6px;
      background: var(--vscode-widget-border, #454545);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .progress-fill {
      height: 100%;
      background: var(--vscode-focusBorder, #007acc);
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .progress-fill.completed {
      background: #4caf50;
    }

    .progress-fill.error {
      background: #f44336;
    }

    .progress-text {
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #999);
      display: flex;
      justify-content: space-between;
    }

    .upload-error {
      color: var(--vscode-errorForeground, #f48771);
      font-size: 12px;
      margin-top: 4px;
    }

    .upload-actions {
      display: flex;
      gap: 12px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--vscode-widget-border, #454545);
    }

    .hidden-file-input {
      display: none;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.handleLocationChange();
    window.addEventListener('popstate', this.handleLocationChange);
    // Add click handler to close menus when clicking outside
    this.addEventListener('click', this.handleOutsideClick.bind(this));
    // Add keyboard event listener for escape key
    this.handleKeyDown = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this.handleLocationChange);
    this.removeEventListener('click', this.handleOutsideClick.bind(this));
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  handleLocationChange = () => {
    const path = window.location.pathname;
    if (path.endsWith('/containers/images')) {
      this.activeTab = 'images';
    } else {
      this.activeTab = 'containers';
    }
    this.fetchData();
  }

  handleTabClick(event: MouseEvent, tab: string) {
    event.preventDefault();
    this.activeTab = tab;
    const path = tab === 'images' ? '/containers/cri/images' : '/containers/cri';
    window.history.pushState({}, '', path);
    this.fetchData();
  }

  async fetchData() {
    if (this.activeTab === 'containers') {
      await this.fetchContainers();
    } else if (this.activeTab === 'images') {
      await this.fetchImages();
    }
  }

  async fetchContainerDetails(id: string) {
    try {
      this.detailError = null;
      const response = await api.get<any>(`/containers/${id}`);
      console.log('Full container details response:', response);
      
      // Try different response structures
      let container = null;
      if (response?.data?.container) {
        container = response.data.container;
      } else if (response?.container) {
        container = response.container;
      } else if (response?.id) {
        // Response might be the container object directly
        container = response;
      }
      
      console.log('Extracted container:', container);
      this.selectedContainer = container;
      this.selectedImage = null;
      this.showDrawer = true;
    } catch (error) {
      console.error('Error fetching container details:', error);
      this.detailError = error instanceof ApiError ? error.message : 'Failed to fetch container details';
      this.selectedContainer = null;
      this.selectedImage = null;
      this.showDrawer = true;
    }
  }

async fetchImageDetails(id: string) {
    try {
      this.detailError = null;
      const response = await api.get<any>(`/containers/images/${id}`);
      console.log('Full image details response:', response);
      
      // Try different response structures
      let image = null;
      if (response?.data?.image) {
        image = response.data.image;
      } else if (response?.image) {
        image = response.image;
      } else if (response?.id) {
        // Response might be the image object directly
        image = response;
      }
      
      console.log('Extracted image:', image);
      this.selectedImage = image;
      this.selectedContainer = null;
      this.showDrawer = true;
    } catch (error) {
      console.error('Error fetching image details:', error);
      this.detailError = error instanceof ApiError ? error.message : 'Failed to fetch image details';
      this.selectedImage = null;
      this.selectedContainer = null;
      this.showDrawer = true;
    }
  }

  async fetchContainers() {
    try {
      const data = await api.get<ContainersResponse>('/containers');
      this.containers = data.containers || [];
      this.runtime = data.runtime || null;
      this.error = null;
    } catch (error) {
      console.error('Error fetching containers:', error);
      if (error instanceof ApiError && error.code === 'NO_RUNTIME_AVAILABLE') {
        this.error = error.message || 'No container runtime found';
        this.containers = [];
        this.runtime = null;
      } else if (error instanceof ApiError) {
        this.error = error.message || 'Failed to fetch containers';
      } else {
        this.error = 'Error connecting to server';
      }
    }
  }

  async fetchImages() {
    try {
      const data = await api.get<ImagesResponse>('/containers/images');
      this.images = data.images || [];
      this.runtime = data.runtime || null;
      this.error = null;
    } catch (error) {
      console.error('Error fetching images:', error);
      if (error instanceof ApiError && error.code === 'NO_RUNTIME_AVAILABLE') {
        this.error = error.message || 'No container runtime found';
        this.images = [];
        this.runtime = null;
      } else if (error instanceof ApiError) {
        this.error = error.message || 'Failed to fetch images';
      } else {
        this.error = 'Error connecting to server';
      }
    }
  }

  showConfirmDialog(title: string, message: string, action: () => void) {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmAction = action;
    this.showConfirmModal = true;
    
    // Focus on the modal after it opens
    this.updateComplete.then(() => {
      // Find the cancel button in the slot content
      const cancelButton = this.shadowRoot?.querySelector('modal-dialog button.btn-secondary') as HTMLButtonElement;
      if (cancelButton) {
        setTimeout(() => cancelButton.focus(), 50);
      }
    });
  }

  handleConfirm() {
    if (this.confirmAction) {
      this.confirmAction();
    }
    this.showConfirmModal = false;
    this.confirmAction = null;
  }

  handleCancel() {
    this.showConfirmModal = false;
    this.confirmAction = null;
  }

  async startContainer(id: string, name?: string) {
    this.showConfirmDialog(
      'Start Container',
      `Are you sure you want to start container "${name || id}"?`,
      async () => {
        try {
          await api.post(`/containers/${id}/start`);
          this.fetchContainers();
        } catch (error) {
          console.error('Error starting container:', error);
        }
      }
    );
  }

  async stopContainer(id: string, name?: string) {
    this.showConfirmDialog(
      'Stop Container',
      `Are you sure you want to stop container "${name || id}"?`,
      async () => {
        try {
          await api.post(`/containers/${id}/stop`);
          this.fetchContainers();
        } catch (error) {
          console.error('Error stopping container:', error);
        }
      }
    );
  }

  async removeContainer(id: string, name?: string) {
    this.showConfirmDialog(
      'Remove Container',
      `Are you sure you want to remove container "${name || id}"? This action cannot be undone.`,
      async () => {
        try {
          await api.delete(`/containers/${id}`);
          this.fetchContainers();
        } catch (error) {
          console.error('Error removing container:', error);
        }
      }
    );
  }

  async removeImage(id: string, tag?: string) {
    this.showConfirmDialog(
      'Remove Image',
      `Are you sure you want to remove image "${tag || id}"? This action cannot be undone.`,
      async () => {
        try {
          await api.delete(`/containers/images/${id}`);
          this.fetchImages();
        } catch (error) {
          console.error('Error removing image:', error);
        }
      }
    );
  }

  async fetchContainerLogs(id: string, name?: string) {
    try {
      console.log('Fetching logs for container:', id, name);
      this.logsError = null;
      this.containerLogs = 'Loading logs...';
      this.logsSearchTerm = ''; // Clear search term when opening logs
      this.showLogsDrawer = true;
      
      const response = await api.get<any>(`/containers/${id}/logs`);
      console.log('Logs response:', response);
      
      if (response?.data?.logs) {
        this.containerLogs = response.data.logs;
      } else if (response?.logs) {
        this.containerLogs = response.logs;
      } else {
        this.containerLogs = 'No logs available';
      }
    } catch (error) {
      console.error('Error fetching container logs:', error);
      this.logsError = error instanceof ApiError ? error.message : 'Failed to fetch container logs';
      this.containerLogs = '';
    }
  }

renderContainersTable() {
    const filteredContainers = this.containers.filter(container =>
      container.name?.toLowerCase().includes(this.searchTerm.toLowerCase())
    );

    return html`
    <div class="search-container">
      <div class="search-wrapper">
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <input 
          class="search-input"
          type="text" 
          placeholder="${t('containers.searchContainers')}"
          .value=${this.searchTerm}
          @input=${(e: any) => this.searchTerm = e.target.value}
        />
      </div>
    </div>
      <table class="table">
        <thead>
          <tr>
            <th>${t('common.name')}</th>
            <th>${t('common.state')}</th>
            <th>ID</th>
            <th>${t('common.image')}</th>
            <th>${t('common.created')}</th>
            <th>${t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          ${filteredContainers.map((container, index) => {
            const shortId = container.id?.substring(0, 12) || 'Unknown';
            const createdDate = container.created_at ? new Date(container.created_at).toLocaleString() : 'Unknown';
            const imageName = container.image || 'Unknown';
            const truncatedImage = imageName.length > 20 ? imageName.substring(0, 20) + '...' : imageName;
            
            return html`
              <tr>
<td>
<button class="link-button" @click=${() => this.fetchContainerDetails(container.id)}>
    ${container.name || 'Unnamed'}
  </button>
</td>
                <td>
                  <div class="status-indicator">
                    <span class="status-icon ${this.getStatusClass(container.state)}" data-tooltip="${this.getStatusTooltip(container.state)}"></span>
                  </div>
                </td>
                <td>${shortId}</td>
                <td>
                  <span class="truncate" title="${imageName}">${truncatedImage}</span>
                </td>
                <td>${createdDate}</td>
                <td>
                  <div class="action-menu">
                    <button class="action-dots" @click=${(e: Event) => this.toggleActionMenu(e, `container-${index}`)}>⋮</button>
                    <div class="action-dropdown" id="container-${index}">
                      <button @click=${() => { this.closeAllMenus(); this.fetchContainerLogs(container.id, container.name); }}>Logs</button>
                      ${container.state === 'CONTAINER_RUNNING'
                        ? html`<button @click=${() => { this.closeAllMenus(); this.stopContainer(container.id, container.name); }}>${t('containers.stop')}</button>`
                        : html`<button @click=${() => { this.closeAllMenus(); this.startContainer(container.id, container.name); }}>${t('containers.start')}</button>`}
                      <button class="danger" @click=${() => { this.closeAllMenus(); this.removeContainer(container.id, container.name); }}>${t('common.delete')}</button>
                    </div>
                  </div>
                </td>
              </tr>
            `;
          })}
        </tbody>
      </table>
    `;
  }

renderImagesTable() {
    const filteredImages = this.images.filter(image =>
      image.repo_tags?.some(tag => tag.toLowerCase().includes(this.searchTerm.toLowerCase()))
    );

    return html`
    <div class="search-container">
      <div class="search-wrapper">
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <input 
          class="search-input"
          type="text" 
          placeholder="${t('containers.searchImages')}"
          .value=${this.searchTerm}
          @input=${(e: any) => this.searchTerm = e.target.value}
        />
      </div>
      <div class="action-menu">
        <button class="btn btn-primary" @click=${(e: Event) => this.toggleImageActionsDropdown(e)}>+ Add Image</button>
        <div class="action-dropdown ${this.showImageActionsDropdown ? 'show' : ''}">
          <button @click=${() => this.handleImageActionSelect('pull')}>Pull Image</button>
          <button @click=${() => this.handleImageActionSelect('upload')}>Upload Image</button>
        </div>
      </div>
    </div>
      <table class="table">
        <thead>
          <tr>
            <th>${t('common.tags')}</th>
            <th>ID</th>
            <th>${t('common.size')}</th>
            <th>${t('common.runtime')}</th>
            <th>${t('common.created')}</th>
            <th>${t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          ${filteredImages.map((image, index) => {
            const shortId = image.id?.substring(0, 12) || 'Unknown';
            const tags = image.repo_tags && image.repo_tags.length > 0 
              ? image.repo_tags.join(', ') 
              : 'No tags';
            const createdDate = image.created_at ? new Date(image.created_at).toLocaleString() : 'Unknown';
            return html`
              <tr>
<td>
<button class="link-button" @click=${() => this.fetchImageDetails(image.id)}>
    ${tags}
  </button>
</td>
                <td>${shortId}</td>
                <td>${this.formatSize(image.size)}</td>
                <td>${image.runtime || 'Unknown'}</td>
                <td>${createdDate}</td>
                <td>
                  <div class="action-menu">
                    <button class="action-dots" @click=${(e: Event) => this.toggleActionMenu(e, `image-${index}`)}>⋮</button>
                    <div class="action-dropdown" id="image-${index}">
                      <button class="danger" @click=${() => { this.closeAllMenus(); this.removeImage(image.id, image.repo_tags?.join(', ')); }}>${t('common.delete')}</button>
                    </div>
                  </div>
                </td>
              </tr>
            `;
          })}
        </tbody>
      </table>
    `;
  }

  formatSize(bytes: number) {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  getStatusClass(state: string | undefined): string {
    switch (state) {
      case 'CONTAINER_RUNNING':
        return 'running';
      case 'CONTAINER_STOPPED':
        return 'stopped';
      case 'CONTAINER_PAUSED':
        return 'paused';
      case 'CONTAINER_EXITED':
        return 'exited';
      default:
        return 'stopped';
    }
  }

  getStatusTooltip(state: string | undefined): string {
    switch (state) {
      case 'CONTAINER_RUNNING':
        return 'Running';
      case 'CONTAINER_STOPPED':
        return 'Stopped';
      case 'CONTAINER_PAUSED':
        return 'Paused';
      case 'CONTAINER_EXITED':
        return 'Exited';
      default:
        return state || 'Unknown';
    }
  }

  toggleActionMenu(event: Event, menuId: string) {
    event.stopPropagation();
    const menu = this.shadowRoot?.getElementById(menuId);
    if (menu) {
      const isOpen = menu.classList.contains('show');
      this.closeAllMenus();
      if (!isOpen) {
        menu.classList.add('show');
        // Focus on the first button in the dropdown for keyboard navigation
        const firstButton = menu.querySelector('button') as HTMLButtonElement;
        if (firstButton) {
          setTimeout(() => firstButton.focus(), 10);
        }
      }
    }
  }

  closeAllMenus() {
    const menus = this.shadowRoot?.querySelectorAll('.action-dropdown');
    menus?.forEach(menu => menu.classList.remove('show'));
  }

  renderTabs() {
    return html`
      <div class="tab-header">
        <a 
          href="/containers/cri"
          class="tab-button ${this.activeTab === 'containers' ? 'active' : ''}" 
          @click="${(e: MouseEvent) => this.handleTabClick(e, 'containers')}"
        >
          Containers
        </a>
        <a 
          href="/containers/cri/images"
          class="tab-button ${this.activeTab === 'images' ? 'active' : ''}" 
          @click="${(e: MouseEvent) => this.handleTabClick(e, 'images')}"
        >
          Images
        </a>
      </div>
    `;
}

  renderError() {
    return html`
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <p class="error-message">${this.detailError}</p>
      </div>
    `;
  }

  renderContainerDetails() {
    if (!this.selectedContainer) return;
    const container = this.selectedContainer;
    
    return html`
      <div class="drawer-content">
        <div class="detail-section">
          <h3>Container Details</h3>
          <div class="detail-item">
            <span class="detail-label">Name</span>
            <span class="detail-value">${container.name || 'Unnamed'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">ID</span>
            <span class="detail-value monospace">${container.id || 'Unknown'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Image</span>
            <span class="detail-value">${container.image || 'Unknown'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">State</span>
            <span class="detail-value">
              <span class="status-badge ${this.getStatusClass(container.state)}">${this.getStatusTooltip(container.state)}</span>
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Status</span>
            <span class="detail-value">${container.status || 'Unknown'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Runtime</span>
            <span class="detail-value">${container.runtime || 'Unknown'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Created</span>
            <span class="detail-value">${container.created_at ? new Date(container.created_at).toLocaleString() : 'Unknown'}</span>
          </div>
        </div>

        ${container.labels && Object.keys(container.labels).length > 0 ? html`
          <div class="detail-section">
            <h3>Labels</h3>
            <div class="tag-list">
              ${Object.entries(container.labels).map(
                ([key, value]) => html`<div class="tag">${key}: ${value}</div>`
              )}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderImageDetails() {
    if (!this.selectedImage) return;
    const image = this.selectedImage;
    
    return html`
      <div class="drawer-content">
        <div class="detail-section">
          <h3>Image Details</h3>
          <div class="detail-item">
            <span class="detail-label">ID</span>
            <span class="detail-value monospace">${image.id || 'Unknown'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Tags</span>
            ${image.repo_tags && image.repo_tags.length > 0
              ? html`<div class="tag-list">${image.repo_tags.map(
                  (tag) => html`<div class="tag">${tag}</div>`
                )}</div>`
              : html`<span class="detail-value">No tags</span>`}
          </div>
          ${image.repo_digests && image.repo_digests.length > 0 ? html`
            <div class="detail-item">
              <span class="detail-label">Digests</span>
              <div class="detail-value">
                ${image.repo_digests.map(digest => html`<div class="monospace">${digest}</div>`)}
              </div>
            </div>
          ` : ''}
          <div class="detail-item">
            <span class="detail-label">Size</span>
            <span class="detail-value">${this.formatSize(image.size)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Runtime</span>
            <span class="detail-value">${image.runtime || 'Unknown'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Created</span>
            <span class="detail-value">${image.created_at ? new Date(image.created_at).toLocaleString() : 'Unknown'}</span>
          </div>
        </div>
      </div>
    `;
  }

  override render() {
    return html`
      <div class="tab-container">
        <h1>${t('containers.title')}${this.runtime ? html` <span style="font-size: 0.875rem; color: var(--text-secondary); font-weight: normal;">(${this.runtime})</span>` : ''}</h1>
        ${this.renderTabs()}
        <div class="tab-content">
          ${this.error ? html`
            <div class="error-state">
              <h3>${this.error.includes('No container runtime found') ? 'Container Runtime Not Available' : 'Error'}</h3>
              <p>${this.error.includes('No container runtime found') 
                ? 'Container management features are not available. Please install Docker or a CRI-compatible container runtime (containerd, CRI-O) to use this feature.'
                : this.error}</p>
            </div>
          ` : ''}


          ${this.activeTab === 'containers' && !this.error ? html`
            ${this.containers.length > 0 
              ? this.renderContainersTable()
              : html`
                <div class="empty-state">No containers found.</div>
              `
            }
          ` : ''}

          ${this.activeTab === 'images' && !this.error ? html`
            ${this.images.length > 0 
              ? this.renderImagesTable()
              : html`
                <div class="empty-state">No images found.</div>
              `
            }
          ` : ''}
        </div>
      </div>

      <modal-dialog
        ?open=${this.showConfirmModal}
        .title=${this.confirmTitle}
        size="small"
        @modal-close=${this.handleCancel}
      >
        <p>${this.confirmMessage}</p>
        <div slot="footer" style="display: flex; gap: 8px; justify-content: flex-end;">
          <button class="btn btn-secondary" @click=${this.handleCancel}>
            ${t('common.cancel')}
          </button>
          <button class="btn btn-primary" @click=${this.handleConfirm}>
            ${t('common.confirm')}
          </button>
        </div>
      </modal-dialog>

      <modal-dialog
        ?open=${this.showPullImageModal}
        .title="Pull Image"
        size="medium"
        @modal-close=${this.handleCancelPullImage}
      >
        <div style="margin-bottom: 1rem;">
          <label for="imageName" style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--vscode-foreground);">Image Name:</label>
          <input 
            id="imageName"
            class="modal-input search-input"
            type="text" 
            placeholder="e.g., nginx:latest, ubuntu:20.04"
            .value=${this.imageName}
            @input=${(e: any) => this.imageName = e.target.value}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === 'Enter') {
                this.handleConfirmPullImage();
              }
            }}
            style="width: 100%; padding-left: 12px;"
          />
        </div>
        <div slot="footer" style="display: flex; gap: 8px; justify-content: flex-end;">
          <button class="btn btn-secondary" @click=${this.handleCancelPullImage}>
            Cancel
          </button>
          <button class="btn btn-primary" @click=${this.handleConfirmPullImage} ?disabled=${!this.imageName.trim()}>
            Pull Image
          </button>
        </div>
      </modal-dialog>

      ${this.showDrawer ? html`
        <div class="drawer">
          <button class="close-btn" @click=${() => { this.showDrawer = false; this.detailError = null; }}>✕</button>
          
          ${this.detailError ? this.renderError() : 
            (this.selectedContainer ? this.renderContainerDetails() : 
             this.selectedImage ? this.renderImageDetails() : '')}
        </div>
      ` : ''}

      ${this.showLogsDrawer ? html`
        <div class="drawer">
          <button class="close-btn" @click=${() => { 
            this.showLogsDrawer = false; 
            this.logsError = null;
            this.containerLogs = '';
            this.logsSearchTerm = '';
          }}>✕</button>
          
          <div class="drawer-content">
            <div class="logs-header">
              <h2 class="logs-title">Container Logs</h2>
              <div class="search-wrapper">
                <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input
                  class="search-input"
                  type="text"
                  placeholder="${t('containers.searchLogs')}"
                  .value=${this.logsSearchTerm}
                  @input=${(e: any) => this.logsSearchTerm = e.target.value}
                />
              </div>
            </div>
            
            ${this.logsError ? html`
              <div class="error-container">
                <div class="error-icon">⚠️</div>
                <p class="error-message">${this.logsError}</p>
              </div>
            ` : html`
              <div class="logs-container">${unsafeHTML(this.highlightSearchTerm(this.containerLogs, this.logsSearchTerm))}</div>
            `}
          </div>
        </div>
      ` : ''}

      ${this.showUploadDrawer ? html`
        <div class="drawer">
          <button class="close-btn" @click=${this.closeUploadDrawer}>✕</button>
          ${this.renderUploadDrawer()}
        </div>
      ` : ''}
    `;
  }

  highlightSearchTerm(text: string, searchTerm: string): string {
    if (!searchTerm || !text) return text;

    // Escape special characters for use in RegExp
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');

    // Replace matching term with highlighted HTML
    return text.replace(regex, '<mark style="background-color: #ffeb3b; color: #000; padding: 0 2px;">$1</mark>');
  }

  private handleOutsideClick(_event: Event) {
    // Close all menus when clicking outside
    this.closeAllMenus();
    this.showImageActionsDropdown = false;
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.closeAllMenus();
      this.showImageActionsDropdown = false;
      if (this.showDrawer) {
        this.showDrawer = false;
      }
      if (this.showLogsDrawer) {
        this.showLogsDrawer = false;
      }
      if (this.showPullImageModal) {
        this.handleCancelPullImage();
      }
    }
  }

  toggleImageActionsDropdown(event: Event) {
    event.stopPropagation();
    this.showImageActionsDropdown = !this.showImageActionsDropdown;
  }

  handleImageActionSelect(action: string) {
    this.showImageActionsDropdown = false;
    
    if (action === 'pull') {
      this.showPullImageModal = true;
      this.imageName = '';
      
      // Focus on the modal input field after it opens
      this.updateComplete.then(() => {
        const inputField = this.shadowRoot?.querySelector('.modal-input') as HTMLInputElement;
        if (inputField) {
          setTimeout(() => inputField.focus(), 50);
        }
      });
    } else if (action === 'upload') {
      this.openUploadDrawer();
    }
  }

  triggerFileUpload() {
    // Create a temporary file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.tar,.tar.gz,.tgz';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (files && files.length > 0 && files[0]) {
        this.selectedFile = files[0];
        this.handleFileUpload();
      }
      // Clean up the temporary input
      document.body.removeChild(fileInput);
    });
    
    document.body.appendChild(fileInput);
    fileInput.click();
  }

  async handleFileUpload() {
    if (!this.selectedFile) return;
    
    try {
      const formData = new FormData();
      formData.append('image', this.selectedFile);
      
      // Note: This is a placeholder for the actual upload API call
      // Replace with the correct API endpoint when available
      console.log('Uploading image file:', this.selectedFile.name);
      
      // TODO: Implement actual file upload to the backend
      // await api.post('/images/upload', formData, {
      //   headers: {
      //     'Content-Type': 'multipart/form-data'
      //   }
      // });
      
      // Refresh images list after successful upload
      this.fetchImages();
      this.selectedFile = null;
      
    } catch (error) {
      console.error('Error uploading image file:', error);
      // TODO: Show error message to user
    }
  }

  handleConfirmPullImage() {
    if (!this.imageName.trim()) return;
    
    this.pullImage(this.imageName.trim());
    this.showPullImageModal = false;
    this.imageName = '';
  }

  handleCancelPullImage() {
    this.showPullImageModal = false;
    this.imageName = '';
  }

  async pullImage(imageName: string) {
    try {
      console.log('Pulling image:', imageName);
      
      // Note: This is a placeholder for the actual pull API call
      // Replace with the correct API endpoint when available
      // await api.post('/images/pull', { imageName });
      
      // Refresh images list after successful pull
      this.fetchImages();
      
    } catch (error) {
      console.error('Error pulling image:', error);
      // TODO: Show error message to user
    }
  }

  // Upload drawer methods
  openUploadDrawer() {
    this.showUploadDrawer = true;
    this.uploadQueue = [];
  }

  closeUploadDrawer() {
    this.showUploadDrawer = false;
    this.uploadQueue = [];
    this.isUploading = false;
  }

  handleUploadZoneClick() {
    const fileInput = this.shadowRoot?.querySelector('#uploadFileInput') as HTMLInputElement;
    fileInput?.click();
  }

  handleFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.addFilesToQueue(Array.from(files));
    }
    // Reset the input to allow selecting the same file again
    input.value = '';
  }

  handleDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const uploadZone = event.currentTarget as HTMLElement;
    uploadZone.classList.add('dragover');
  }

  handleDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const uploadZone = event.currentTarget as HTMLElement;
    uploadZone.classList.remove('dragover');
  }

  handleDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const uploadZone = event.currentTarget as HTMLElement;
    uploadZone.classList.remove('dragover');
    
    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length > 0) {
      this.addFilesToQueue(files);
    }
  }

  addFilesToQueue(files: File[]) {
    const validFiles = files.filter(file => {
      const validExtensions = ['.tar', '.tar.gz', '.tgz'];
      return validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    });

    const newItems: UploadItem[] = validFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: 'pending' as const
    }));

    this.uploadQueue = [...this.uploadQueue, ...newItems];
  }

  removeFromQueue(id: string) {
    this.uploadQueue = this.uploadQueue.filter(item => item.id !== id);
  }

  async startUploads() {
    if (this.isUploading) return;
    
    this.isUploading = true;
    const pendingItems = this.uploadQueue.filter(item => item.status === 'pending');
    
    for (const item of pendingItems) {
      await this.uploadSingleFile(item);
    }
    
    this.isUploading = false;
    // Refresh images list after all uploads complete
    this.fetchImages();
  }

  async uploadSingleFile(item: UploadItem) {
    try {
      // Update status to uploading
      const index = this.uploadQueue.findIndex(i => i.id === item.id);
      if (index !== -1) {
        this.uploadQueue[index] = { ...item, status: 'uploading', progress: 0 };
        this.requestUpdate();
      }

      const formData = new FormData();
      formData.append('image', item.file);

      // Simulate progress for now (replace with actual XMLHttpRequest for real progress)
      await this.simulateUploadProgress(item.id);

      // TODO: Replace with actual upload API call
      // const response = await api.post('/images/upload', formData, {
      //   headers: {
      //     'Content-Type': 'multipart/form-data'
      //   },
      //   onUploadProgress: (progressEvent) => {
      //     const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      //     this.updateUploadProgress(item.id, percentCompleted);
      //   }
      // });

      // Update status to completed
      const completedIndex = this.uploadQueue.findIndex(i => i.id === item.id);
      if (completedIndex !== -1 && this.uploadQueue[completedIndex]) {
        const existingItem = this.uploadQueue[completedIndex];
        this.uploadQueue[completedIndex] = { ...existingItem, status: 'completed', progress: 100 };
        this.requestUpdate();
      }

    } catch (error) {
      console.error('Error uploading file:', error);
      
      // Update status to error
      const errorIndex = this.uploadQueue.findIndex(i => i.id === item.id);
      if (errorIndex !== -1 && this.uploadQueue[errorIndex]) {
        const existingItem = this.uploadQueue[errorIndex];
        this.uploadQueue[errorIndex] = { 
          ...existingItem, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed'
        };
        this.requestUpdate();
      }
    }
  }

  async simulateUploadProgress(itemId: string) {
    // Simulate upload progress (remove this when implementing real upload)
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      this.updateUploadProgress(itemId, progress);
    }
  }

  updateUploadProgress(itemId: string, progress: number) {
    const index = this.uploadQueue.findIndex(item => item.id === itemId);
    if (index !== -1 && this.uploadQueue[index]) {
      const existingItem = this.uploadQueue[index];
      this.uploadQueue[index] = { ...existingItem, progress };
      this.requestUpdate();
    }
  }

  clearCompletedUploads() {
    this.uploadQueue = this.uploadQueue.filter(item => item.status !== 'completed');
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  renderUploadDrawer() {
    return html`
      <div class="drawer-content">
        <div class="upload-header">
          <h2 class="upload-title">Upload Images</h2>
        </div>
        
        <div class="upload-zone" 
             @click=${this.handleUploadZoneClick}
             @dragover=${this.handleDragOver}
             @dragleave=${this.handleDragLeave}
             @drop=${this.handleDrop}>
          <div class="upload-icon">📦</div>
          <div class="upload-text">Drop image files here or click to browse</div>
          <div class="upload-hint">Supported formats: .tar, .tar.gz, .tgz</div>
        </div>
        
        <input id="uploadFileInput" 
               class="hidden-file-input" 
               type="file" 
               accept=".tar,.tar.gz,.tgz" 
               multiple
               @change=${this.handleFileInputChange}>
        
        ${this.uploadQueue.length > 0 ? html`
          <div class="upload-queue">
            <h3>Upload Queue (${this.uploadQueue.length} files)</h3>
            ${this.uploadQueue.map(item => this.renderUploadItem(item))}
          </div>
          
          <div class="upload-actions">
            ${!this.isUploading ? html`
              <button class="btn btn-primary" 
                      @click=${this.startUploads}
                      ?disabled=${this.uploadQueue.filter(i => i.status === 'pending').length === 0}>
                Start Upload${this.uploadQueue.filter(i => i.status === 'pending').length > 1 ? 's' : ''}
              </button>
            ` : html`
              <button class="btn btn-secondary" disabled>
                Uploading...
              </button>
            `}
            
            <button class="btn btn-secondary" @click=${this.clearCompletedUploads}>
              Clear Completed
            </button>
            
            <button class="btn btn-secondary" @click=${this.closeUploadDrawer}>
              Close
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderUploadItem(item: UploadItem) {
    return html`
      <div class="upload-item">
        <div class="upload-item-header">
          <span class="upload-item-name" title="${item.file.name}">${item.file.name}</span>
          <span class="upload-item-size">${this.formatFileSize(item.file.size)}</span>
          <span class="upload-item-status ${item.status}">${item.status.toUpperCase()}</span>
          ${item.status === 'pending' ? html`
            <button class="btn btn-danger" @click=${() => this.removeFromQueue(item.id)} style="padding: 2px 6px; font-size: 10px; margin-left: 8px;">✕</button>
          ` : ''}
        </div>
        
        ${item.status === 'uploading' || item.status === 'completed' || item.status === 'error' ? html`
          <div class="progress-bar">
            <div class="progress-fill ${item.status}" style="width: ${item.progress}%"></div>
          </div>
          <div class="progress-text">
            <span>${item.progress}%</span>
            <span>${item.status === 'completed' ? 'Complete' : 
                     item.status === 'error' ? 'Failed' : 'Uploading...'}</span>
          </div>
        ` : ''}
        
        ${item.error ? html`
          <div class="upload-error">${item.error}</div>
        ` : ''}
      </div>
    `;
  }
}

customElements.define('containers-tab', ContainersTab);
