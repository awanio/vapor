import { LitElement, html, css } from 'lit';
import { generateUUID } from '../utils/uuid';
import { state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { t } from '../i18n';
import { api, ApiError } from '../api';
import { getApiUrl } from '../config';
import * as tus from 'tus-js-client';
import type { DockerContainer, DockerImage, DockerVolume, DockerNetwork, DockerContainersResponse, DockerImagesResponse, DockerVolumesResponse, DockerNetworksResponse } from '../types/api';
import '../components/modal-dialog';
import '../components/modals/container-terminal-modal.js';
import '../components/containers/container-image-autocomplete.js';

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface CreatePortMapping {
  containerPort: string;
  hostPort: string;
  protocol: string;
}

interface CreateVolumeMapping {
  source: string;
  target: string;
  type: string;
  readOnly: boolean;
  propagation: string;
}

export class DockerTab extends LitElement {
  @state() private activeTab = 'processes';
  @state() private containers: DockerContainer[] = [];
  @state() private images: DockerImage[] = [];
  @state() private volumes: DockerVolume[] = [];
  @state() private networks: DockerNetwork[] = [];
  @state() private searchTerm = '';
  @state() private error: string | null = null;
  // @state() private runtime: string | null = null;
  @state() private showConfirmModal = false;
  @state() private confirmAction: (() => void) | null = null;
  @state() private selectedContainer: DockerContainer | null = null;
  @state() private selectedImage: DockerImage | null = null;
  @state() private showDrawer = false;
  @state() private detailError: string | null = null;
  @state() private confirmTitle = '';
  @state() private confirmMessage = '';
  @state() private showLogsDrawer = false;
  @state() private containerLogs = '';
  @state() private logsError: string | null = null;
  @state() private logsSearchTerm = '';
  @state() private showTerminalModal = false;
  @state() private terminalContainerId = '';
  @state() private terminalContainerName = '';
  @state() private showImageActionsDropdown: boolean = false;
  @state() private showPullImageModal: boolean = false;
  @state() private imageName: string = '';
  @state() private isPullingImage: boolean = false;
  // @state() private selectedFile: File | null = null;
  @state() private showUploadDrawer: boolean = false;
  @state() private uploadQueue: UploadItem[] = [];
  @state() private isUploading: boolean = false;
  private currentUpload: tus.Upload | null = null;

  @state() private showCreateDrawer = false;
  @state() private isClosingCreateDrawer = false;
  @state() private createError: string | null = null;
  @state() private isCreating = false;
  @state() private createName = '';
  @state() private createImage = '';
  @state() private createEntrypoint = '';
  @state() private createCmd = '';
  @state() private createEnv = '';
  @state() private createLabels = '';
  @state() private createWorkingDir = '';
  @state() private createNetworkMode = '';
  @state() private createRestartPolicy = 'no';
  @state() private createRestartMaxRetry = '';
  @state() private createCpuCores = '';
  @state() private createMemoryMB = '';
  @state() private createPorts: CreatePortMapping[] = [];
  @state() private createVolumes: CreateVolumeMapping[] = [];

  static override styles = css`
    :host {
      display: block;
      padding: 16px;
      margin: 0;
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
      padding: 0;
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
      margin-bottom: 1.5rem;
      gap: 1rem;
    }

    .search-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
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
      overflow: visible;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border: 1px solid var(--vscode-border);
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
      border-bottom: 1px solid var(--vscode-border);
    }

    .table td {
      padding: 12px 16px;
      color: var(--vscode-text);
      font-size: 0.875rem;
      border-bottom: 1px solid var(--vscode-border);
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

    .action-dropdown.open-up {
      top: auto;
      bottom: 100%;
      margin-top: 0;
      margin-bottom: 4px;
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
      background: var(--vscode-button-secondaryBackground, #3c3c3c);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      border: 1px solid var(--vscode-button-border, transparent);
    }

    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground, #484848);
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

    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: 50%;
      height: 100%;
      background: var(--vscode-bg-light);
      border-left: 1px solid var(--vscode-border);
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

    @keyframes slideOut {
      from {
        transform: translateX(0);
      }
      to {
        transform: translateX(100%);
      }
    }

    .create-drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: 50%;
      height: 100%;
      background: var(--vscode-editor-background, #1e1e1e);
      border-left: 1px solid var(--vscode-border);
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
      z-index: 1001;
      overflow-y: auto;
      animation: slideIn 0.3s ease-out;
      display: flex;
      flex-direction: column;
    }

    @media (max-width: 1024px) {
      .create-drawer {
        width: 80%;
      }
    }

    @media (max-width: 768px) {
      .create-drawer {
        width: 100%;
      }
    }

    .create-drawer.closing {
      animation: slideOut 0.3s ease-in forwards;
    }

    .create-drawer-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--vscode-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--vscode-bg-lighter, #252526);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .create-drawer-title {
      font-size: 18px;
      font-weight: 500;
      color: var(--vscode-foreground, #cccccc);
      margin: 0;
    }

    .create-drawer-content {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }

    .create-drawer-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--vscode-border);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      background: var(--vscode-bg-lighter, #252526);
      position: sticky;
      bottom: 0;
      z-index: 10;
    }

    .create-close-btn {
      background: transparent;
      border: none;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      font-size: 20px;
      line-height: 1;
      transition: all 0.2s;
    }

    .create-close-btn:hover {
      background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
      color: var(--vscode-icon-foreground, #c5c5c5);
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
      padding-bottom: 80px;
    }

    .form-section {
      margin-bottom: 24px;
    }

    .form-section h3 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--text-primary);
      border-bottom: 1px solid var(--vscode-border);
      padding-bottom: 8px;
    }

    .form-field {
      margin-bottom: 12px;
    }

    .form-label {
      display: block;
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin-bottom: 4px;
      font-weight: 500;
    }

    .form-input,
    .form-select,
    .form-textarea {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-input-border, var(--vscode-panel-border, #454545)));
      border-radius: 4px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: 0.875rem;
      font-family: inherit;
      outline: none;
      box-sizing: border-box;
    }

    .form-input:focus,
    .form-select:focus,
    .form-textarea:focus {
      border-color: var(--vscode-focusBorder, #007acc);
    }

    .form-textarea {
      min-height: 80px;
      resize: vertical;
    }

    .form-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .form-row .form-input,
    .form-row .form-select {
      flex: 1;
    }

    .form-hint {
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #999);
      margin-top: 4px;
    }

    .btn-small {
      padding: 6px 10px;
      font-size: 12px;
    }

    .list-item {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 8px;
    }

    .detail-section {
      margin-bottom: 24px;
    }

    .detail-section h3 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--text-primary);
      border-bottom: 1px solid var(--vscode-border);
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
    document.addEventListener('click', this.handleDocumentClick);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this.handleLocationChange);
    document.removeEventListener('click', this.handleDocumentClick);
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleDocumentClick = (event: Event) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.action-menu')) {
      this.closeAllMenus();
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (this.showConfirmModal) {
        this.handleCancel();
      } else {
        this.closeAllMenus();
      }
    }
  };

  async fetchData() {
    switch (this.activeTab) {
      case 'processes':
        await this.fetchContainers();
        break;
      case 'images':
        await this.fetchImages();
        break;
      case 'volumes':
        await this.fetchVolumes();
        break;
      case 'networks':
        await this.fetchNetworks();
        break;
    }
  }

  async fetchContainers() {
    try {
      const data = await api.get<DockerContainersResponse>('/docker/ps');
      this.containers = data.containers || [];
      // this.runtime = data.runtime || null;
      this.error = null;
    } catch (error) {
      console.error('Error fetching containers:', error);
      this.error = error instanceof ApiError ? error.message : 'Failed to fetch containers';
    }
  }

  async fetchImages() {
    try {
      const data = await api.get<DockerImagesResponse>('/docker/images');
      this.images = data.images || [];
      // this.runtime = data.runtime || null;
      this.error = null;
    } catch (error) {
      console.error('Error fetching images:', error);
      this.error = error instanceof ApiError ? error.message : 'Failed to fetch images';
    }
  }

  async fetchVolumes() {
    try {
      const data = await api.get<DockerVolumesResponse>('/docker/volumes');
      this.volumes = data.volumes || [];
      this.error = null;
    } catch (error) {
      console.error('Error fetching volumes:', error);
      this.error = error instanceof ApiError ? error.message : 'Failed to fetch volumes';
    }
  }

  async fetchNetworks() {
    try {
      const data = await api.get<DockerNetworksResponse>('/docker/networks');
      this.networks = data.networks || [];
      this.error = null;
    } catch (error) {
      console.error('Error fetching networks:', error);
      this.error = error instanceof ApiError ? error.message : 'Failed to fetch networks';
    }
  }

  handleLocationChange = () => {
    const path = window.location.pathname;
    if (path.endsWith('/images')) {
      this.activeTab = 'images';
    } else if (path.endsWith('/volumes')) {
      this.activeTab = 'volumes';
    } else if (path.endsWith('/networks')) {
      this.activeTab = 'networks';
    } else {
      this.activeTab = 'processes';
    }
    this.fetchData();
  }

  handleTabClick(event: MouseEvent, tab: string) {
    event.preventDefault();
    this.activeTab = tab;
    let path: string;
    switch (tab) {
      case 'images':
        path = '/docker/images';
        break;
      case 'volumes':
        path = '/docker/volumes';
        break;
      case 'networks':
        path = '/docker/networks';
        break;
      default:
        path = '/docker/processes';
        break;
    }
    window.history.pushState({}, '', path);
    this.fetchData();
  }

  renderTabs() {
    return html`
      <div class="tab-header">
        <a 
          href="/docker/processes"
          class="tab-button ${this.activeTab === 'processes' ? 'active' : ''}" 
          @click="${(e: MouseEvent) => this.handleTabClick(e, 'processes')}"
        >
          Processes
        </a>
        <a 
          href="/docker/images"
          class="tab-button ${this.activeTab === 'images' ? 'active' : ''}" 
          @click="${(e: MouseEvent) => this.handleTabClick(e, 'images')}"
        >
          Images
        </a>
        <a 
          href="/docker/volumes"
          class="tab-button ${this.activeTab === 'volumes' ? 'active' : ''}" 
          @click="${(e: MouseEvent) => this.handleTabClick(e, 'volumes')}"
        >
          Volumes
        </a>
        <a 
          href="/docker/networks"
          class="tab-button ${this.activeTab === 'networks' ? 'active' : ''}" 
          @click="${(e: MouseEvent) => this.handleTabClick(e, 'networks')}"
        >
          Networks
        </a>
      </div>
    `;
  }

  override render() {
    return html`
      <div class="tab-container">
        <h1>${t('Docker')}</h1>
        ${this.renderTabs()}
        <div class="tab-content">
          ${this.error ? html`
            <div class="error-state">
              <h3>${this.error.includes('No container runtime found') ? 'Container Runtime Not Available' : 'Error'}</h3>
              <p>${this.error.includes('No container runtime found')
          ? 'Container management features are not available. Please install Docker or a CRI-compatible container runtime (containerd, CRI-O) to use this feature.'
          : this.error}</p>
            </div>` : ''}
          ${this.activeTab === 'processes' && !this.error ? html`
            ${this.containers.length > 0
          ? this.renderContainersTable()
          : html`
                <div class="empty-state">No containers found.</div>`
        }
          ` : ''}
          ${this.activeTab === 'images' && !this.error ? html`
            ${this.images.length > 0
          ? this.renderImagesTable()
          : html`
                <div class="empty-state">No images found.</div>`
        }
          ` : ''}
          ${this.activeTab === 'volumes' && !this.error ? html`
            ${this.volumes.length > 0
          ? this.renderVolumesTable()
          : html`
                <div class="empty-state">No volumes found.</div>`
        }
          ` : ''}
          ${this.activeTab === 'networks' && !this.error ? html`
            ${this.networks.length > 0
          ? this.renderNetworksTable()
          : html`
                <div class="empty-state">No networks found.</div>`
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

      <container-terminal-modal
        .show=${this.showTerminalModal}
        .containerId=${this.terminalContainerId}
        .containerName=${this.terminalContainerName}
        .runtime=${'docker'}
        @close=${() => { this.showTerminalModal = false; }}
      ></container-terminal-modal>

      ${this.showCreateDrawer ? this.renderCreateContainerDrawer() : ''}

      ${this.showDrawer ? html`
        <div class="drawer">
          <button class="close-btn" @click=${() => { this.showDrawer = false; this.detailError = null; }}>✕</button>
          ${this.detailError ? this.renderError() :
          (this.selectedContainer ? this.renderContainerDetails() :
            this.selectedImage ? this.renderImageDetails() : '')}
        </div>` : ''}

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
              </div>` : html`
              <div class="logs-container">${unsafeHTML(this.highlightSearchTerm(this.containerLogs, this.logsSearchTerm))}</div>`}
          </div>
        </div>` : ''}

      ${this.showUploadDrawer ? html`
        <div class="drawer">
          <button class="close-btn" @click=${() => {
          this.showUploadDrawer = false;
          this.uploadQueue = [];
          this.isUploading = false;
        }}>✕</button>
          <div class="drawer-content">
            <div class="upload-header">
              <h2 class="upload-title">Upload Docker Image</h2>
            </div>
            
            <div class="upload-zone" 
                  @click=${() => (this.shadowRoot?.querySelector('#file-input') as HTMLInputElement)?.click()}
                 @dragover=${this.handleDragOver}
                 @dragleave=${this.handleDragLeave}
                 @drop=${this.handleDrop}>
              <div class="upload-icon">📁</div>
              <div class="upload-text">Drop image files here or click to browse</div>
              <div class="upload-hint">Supports .tar, .tar.gz, .tgz files</div>
            </div>
            
            <input 
              type="file" 
              id="file-input" 
              class="hidden-file-input"
              accept=".tar,.tar.gz,.tgz"
              @change=${this.handleFileSelect}
            />
            
            ${this.uploadQueue.length > 0 ? html`
              <div class="upload-queue">
                <h3>Upload Queue</h3>
                ${this.uploadQueue.map(item => html`
                  <div class="upload-item">
                    <div class="upload-item-header">
                      <span class="upload-item-name">${item.file.name}</span>
                      <span class="upload-item-size">${this.formatFileSize(item.file.size)}</span>
                      <span class="upload-item-status ${item.status}">${item.status}</span>
                    </div>
                    
                    ${item.status === 'uploading' || item.status === 'completed' ? html`
                      <div class="progress-bar">
                        <div class="progress-fill ${item.status}" style="width: ${item.progress}%"></div>
                      </div>
                      <div class="progress-text">
                        <span>${item.progress}%</span>
                        <span>${item.status === 'completed' ? 'Complete' : 'Uploading...'}</span>
                      </div>
                    ` : ''}
                    
                    ${item.error ? html`
                      <div class="upload-error">${item.error}</div>
                    ` : ''}
                    
                    ${item.status === 'pending' || item.status === 'error' ? html`
                      <button class="btn btn-secondary" style="margin-top: 8px; font-size: 12px;" 
                              @click=${() => this.removeFromUploadQueue(item.id)}>Remove</button>
                    ` : ''}
                  </div>
                `)}
              </div>
              
              <div class="upload-actions">
                <button class="btn btn-primary" 
                        ?disabled=${this.isUploading || this.uploadQueue.filter(i => i.status === 'pending').length === 0}
                        @click=${this.startUpload}>
                  ${this.isUploading ? 'Uploading...' : 'Start Upload'}
                </button>
                <button class="btn btn-secondary" @click=${this.clearCompletedUploads}>Clear Completed</button>
              </div>
            ` : ''}
          </div>
        </div>` : ''}

      <modal-dialog
        ?open=${this.showPullImageModal}
        .title="Pull Docker Image"
        size="medium"
        @modal-close=${() => this.showPullImageModal = false}
      >
        <div style="margin-bottom: 16px;">
          <label for="image-name" style="display: block; margin-bottom: 8px; font-weight: 500;">Image Name:</label>
          <input 
            id="image-name"
            type="text" 
            class="form-input"
            placeholder="e.g., nginx:latest or ubuntu:20.04"
            .value=${this.imageName}
            @input=${(e: any) => this.imageName = e.target.value}
          />
          <div style="font-size: 12px; color: var(--vscode-descriptionForeground, #999); margin-top: 4px;">
            Enter the full image name including tag (if needed)
          </div>
        </div>
        <div slot="footer" style="display: flex; gap: 8px; justify-content: flex-end;">
          <button class="btn btn-secondary" ?disabled=${this.isPullingImage} @click=${() => { this.showPullImageModal = false; this.imageName = ''; }}>
            Cancel
          </button>
          <button class="btn btn-primary" 
                  ?disabled=${!this.imageName.trim() || this.isPullingImage}
                  @click=${this.handlePullImage}>
            ${this.isPullingImage ? 'Pulling...' : 'Pull Image'}
          </button>
        </div>
      </modal-dialog>
    `;
  }

  // Placeholder methods - these will need to be implemented based on containers-tab pattern
  private handleCancel() {
    this.showConfirmModal = false;
    this.confirmAction = null;
    this.selectedContainer = null;
    this.selectedImage = null;
  }
  private handleConfirm() {
    if (this.confirmAction) {
      this.confirmAction();
    }
  }
  private openCreateContainerDrawer() {
    this.resetCreateForm();
    this.isClosingCreateDrawer = false;
    this.showCreateDrawer = true;
    void this.fetchImages();
  }

  private closeCreateContainerDrawer() {
    if (this.isClosingCreateDrawer) return;
    this.isClosingCreateDrawer = true;
    window.setTimeout(() => {
      this.showCreateDrawer = false;
      this.isClosingCreateDrawer = false;
      this.createError = null;
    }, 300);
  }

  private resetCreateForm() {
    this.createName = '';
    this.createImage = '';
    this.createEntrypoint = '';
    this.createCmd = '';
    this.createEnv = '';
    this.createLabels = '';
    this.createWorkingDir = '';
    this.createNetworkMode = '';
    this.createRestartPolicy = 'no';
    this.createRestartMaxRetry = '';
    this.createCpuCores = '';
    this.createMemoryMB = '';
    this.createPorts = [];
    this.createVolumes = [];
  }

  private addPortMapping() {
    this.createPorts = [...this.createPorts, { containerPort: '', hostPort: '', protocol: 'tcp' }];
  }

  private removePortMapping(index: number) {
    this.createPorts = this.createPorts.filter((_, i) => i !== index);
  }

  private addVolumeMapping() {
    this.createVolumes = [...this.createVolumes, { source: '', target: '', type: 'bind', readOnly: false, propagation: '' }];
  }

  private removeVolumeMapping(index: number) {
    this.createVolumes = this.createVolumes.filter((_, i) => i !== index);
  }

  private parseCommandInput(value: string): string[] {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item));
        }
      } catch {
        // fall through to whitespace parsing
      }
    }
    return trimmed.split(/\s+/).filter(Boolean);
  }

  private parseKeyValueLines(value: string): string[] {
    return value.split('\n').map((line) => line.trim()).filter(Boolean);
  }

  private parseLabels(value: string): Record<string, string> {
    const labels: Record<string, string> = {};
    this.parseKeyValueLines(value).forEach((line) => {
      const [key, ...rest] = line.split('=');
      if (!key) return;
      labels[key] = rest.join('=') || '';
    });
    return labels;
  }

  private getImageSuggestions(): string[] {
    const suggestions = new Set<string>();
    this.images.forEach((image) => {
      (image.repoTags || []).forEach((tag) => {
        if (tag && tag !== '<none>:<none>') {
          suggestions.add(tag);
        }
      });
    });
    return Array.from(suggestions);
  }

  private async handleCreateContainer() {
    if (!this.createName.trim() || !this.createImage.trim()) {
      this.createError = 'Name and image are required';
      return;
    }

    this.isCreating = true;
    this.createError = null;

    try {
      const cmd = this.parseCommandInput(this.createCmd);
      const entrypoint = this.parseCommandInput(this.createEntrypoint);
      const env = this.parseKeyValueLines(this.createEnv);
      const labels = this.parseLabels(this.createLabels);

      const exposedPorts: Record<string, Record<string, never>> = {};
      const portBindings: Record<string, { hostPort: string }[]> = {};

      this.createPorts.forEach((mapping) => {
        const containerPort = mapping.containerPort.trim();
        if (!containerPort) return;
        const protocol = mapping.protocol?.trim() || 'tcp';
        const key = `${containerPort}/${protocol}`;
        exposedPorts[key] = {};
        if (!portBindings[key]) {
          portBindings[key] = [];
        }
        portBindings[key].push({ hostPort: mapping.hostPort.trim() });
      });

      const volumes = this.createVolumes
        .filter((volume) => volume.source.trim() && volume.target.trim())
        .map((volume) => ({
          source: volume.source.trim(),
          target: volume.target.trim(),
          type: volume.type || 'bind',
          readOnly: volume.readOnly,
          bindOptions: volume.propagation ? { propagation: volume.propagation } : undefined,
        }));

      const policyName = this.createRestartPolicy.trim();
      let restartPolicy: { name: string; maximumRetryCount?: number } | undefined;
      if (policyName && policyName !== 'no') {
        const maxRetry = this.createRestartMaxRetry.trim();
        const parsedMaxRetry = maxRetry ? Number.parseInt(maxRetry, 10) : undefined;
        restartPolicy = {
          name: policyName,
          maximumRetryCount: Number.isNaN(parsedMaxRetry as number) ? undefined : parsedMaxRetry,
        };
      }

      const cpuCores = this.createCpuCores.trim();
      const memoryMB = this.createMemoryMB.trim();
      const parsedCpu = cpuCores ? Number.parseFloat(cpuCores) : undefined;
      const parsedMemory = memoryMB ? Number.parseInt(memoryMB, 10) : undefined;
      const resources = (parsedCpu && !Number.isNaN(parsedCpu)) || (parsedMemory && !Number.isNaN(parsedMemory))
        ? {
          cpuCores: Number.isNaN(parsedCpu as number) ? undefined : parsedCpu,
          memoryMB: Number.isNaN(parsedMemory as number) ? undefined : parsedMemory,
        }
        : undefined;

      const payload: Record<string, unknown> = {
        name: this.createName.trim(),
        image: this.createImage.trim(),
        cmd: cmd.length ? cmd : undefined,
        entrypoint: entrypoint.length ? entrypoint : undefined,
        env: env.length ? env : undefined,
        labels: Object.keys(labels).length ? labels : undefined,
        workingDir: this.createWorkingDir.trim() || undefined,
        networkMode: this.createNetworkMode.trim() || undefined,
        restartPolicy,
        resources,
        volumes: volumes.length ? volumes : undefined,
        exposedPorts: Object.keys(exposedPorts).length ? exposedPorts : undefined,
        portBindings: Object.keys(portBindings).length ? portBindings : undefined,
      };

      await api.post('/docker/containers', payload);

      this.closeCreateContainerDrawer();
      this.resetCreateForm();
      this.fetchContainers();
    } catch (error) {
      this.createError = error instanceof ApiError ? error.message : 'Failed to create container';
    } finally {
      this.isCreating = false;
    }
  }

  private renderCreateContainerDrawer() {
    const suggestions = this.getImageSuggestions();
    return html`
      <div class="create-drawer ${this.isClosingCreateDrawer ? 'closing' : ''}">
        <div class="create-drawer-header">
          <h2 class="create-drawer-title">Create Container</h2>
          <button class="create-close-btn" @click=${this.closeCreateContainerDrawer}>✕</button>
        </div>

        <div class="create-drawer-content">
          ${this.createError ? html`
            <div class="error-container">
              <div class="error-icon">⚠️</div>
              <p class="error-message">${this.createError}</p>
            </div>
          ` : ''}
          <div class="form-section">
            <div class="form-field">
              <label class="form-label">Name *</label>
              <input
                class="form-input"
                type="text"
                placeholder="e.g., my-container"
                .value=${this.createName}
                @input=${(e: any) => { this.createName = e.target.value; }}
              />
            </div>
            <div class="form-field">
              <label class="form-label">Image *</label>
              <container-image-autocomplete
                .value=${this.createImage}
                .suggestions=${suggestions}
                placeholder="e.g., nginx:latest"
                ?disabled=${this.isCreating}
                @image-change=${(e: CustomEvent<{ value: string }>) => { this.createImage = e.detail.value; }}
              ></container-image-autocomplete>
              <div class="form-hint">Suggestions are based on existing images. You can enter any image.</div>
            </div>
            <div class="form-field">
              <label class="form-label">Entrypoint</label>
              <input
                class="form-input"
                type="text"
                placeholder="/bin/sh -c"
                .value=${this.createEntrypoint}
                @input=${(e: any) => { this.createEntrypoint = e.target.value; }}
              />
              <div class="form-hint">Space-separated or JSON array.</div>
            </div>
            <div class="form-field">
              <label class="form-label">Command</label>
              <input
                class="form-input"
                type="text"
                placeholder="echo hello"
                .value=${this.createCmd}
                @input=${(e: any) => { this.createCmd = e.target.value; }}
              />
              <div class="form-hint">Space-separated or JSON array.</div>
            </div>
            <div class="form-field">
              <label class="form-label">Working Directory</label>
              <input
                class="form-input"
                type="text"
                placeholder="/app"
                .value=${this.createWorkingDir}
                @input=${(e: any) => { this.createWorkingDir = e.target.value; }}
              />
            </div>
          </div>

          <div class="form-section">
            <h3>Environment</h3>
            <div class="form-field">
              <label class="form-label">Environment Variables</label>
              <textarea
                class="form-textarea"
                placeholder="KEY=value"
                .value=${this.createEnv}
                @input=${(e: any) => { this.createEnv = e.target.value; }}
              ></textarea>
            </div>
            <div class="form-field">
              <label class="form-label">Labels</label>
              <textarea
                class="form-textarea"
                placeholder="key=value"
                .value=${this.createLabels}
                @input=${(e: any) => { this.createLabels = e.target.value; }}
              ></textarea>
            </div>
          </div>

          <div class="form-section">
            <h3>Ports</h3>
            ${this.createPorts.map((mapping, index) => html`
              <div class="list-item">
                <input
                  class="form-input"
                  type="number"
                  min="1"
                  placeholder="Container port"
                  .value=${mapping.containerPort}
                  @input=${(e: any) => {
        const ports = [...this.createPorts];
        const current = ports[index] ?? { containerPort: '', hostPort: '', protocol: 'tcp' };
        ports[index] = { ...current, containerPort: e.target.value };
        this.createPorts = ports;
      }}
                />
                <input
                  class="form-input"
                  type="number"
                  min="1"
                  placeholder="Host port"
                  .value=${mapping.hostPort}
                  @input=${(e: any) => {
        const ports = [...this.createPorts];
        const current = ports[index] ?? { containerPort: '', hostPort: '', protocol: 'tcp' };
        ports[index] = { ...current, hostPort: e.target.value };
        this.createPorts = ports;
      }}
                />
                <select
                  class="form-select"
                  .value=${mapping.protocol}
                  @change=${(e: any) => {
        const ports = [...this.createPorts];
        const current = ports[index] ?? { containerPort: '', hostPort: '', protocol: 'tcp' };
        ports[index] = { ...current, protocol: e.target.value };
        this.createPorts = ports;
      }}
                >
                  <option value="tcp">tcp</option>
                  <option value="udp">udp</option>
                  <option value="sctp">sctp</option>
                </select>
                <button class="btn btn-secondary btn-small" @click=${() => this.removePortMapping(index)}>Remove</button>
              </div>
            `)}
            <button class="btn btn-secondary btn-small" @click=${this.addPortMapping}>+ Add Port</button>
          </div>

          <div class="form-section">
            <h3>Volumes</h3>
            ${this.createVolumes.map((volume, index) => html`
              <div class="list-item">
                <input
                  class="form-input"
                  type="text"
                  placeholder="/host/path"
                  .value=${volume.source}
                  @input=${(e: any) => {
          const volumes = [...this.createVolumes];
          const current = volumes[index] ?? { source: '', target: '', type: 'bind', readOnly: false, propagation: '' };
          volumes[index] = { ...current, source: e.target.value };
          this.createVolumes = volumes;
        }}
                />
                <input
                  class="form-input"
                  type="text"
                  placeholder="/container/path"
                  .value=${volume.target}
                  @input=${(e: any) => {
          const volumes = [...this.createVolumes];
          const current = volumes[index] ?? { source: '', target: '', type: 'bind', readOnly: false, propagation: '' };
          volumes[index] = { ...current, target: e.target.value };
          this.createVolumes = volumes;
        }}
                />
                <select
                  class="form-select"
                  .value=${volume.type}
                  @change=${(e: any) => {
          const volumes = [...this.createVolumes];
          const current = volumes[index] ?? { source: '', target: '', type: 'bind', readOnly: false, propagation: '' };
          volumes[index] = { ...current, type: e.target.value };
          this.createVolumes = volumes;
        }}
                >
                  <option value="bind">bind</option>
                  <option value="volume">volume</option>
                  <option value="tmpfs">tmpfs</option>
                </select>
                <select
                  class="form-select"
                  .value=${volume.propagation}
                  @change=${(e: any) => {
          const volumes = [...this.createVolumes];
          const current = volumes[index] ?? { source: '', target: '', type: 'bind', readOnly: false, propagation: '' };
          volumes[index] = { ...current, propagation: e.target.value };
          this.createVolumes = volumes;
        }}
                >
                  <option value="">propagation</option>
                  <option value="rprivate">rprivate</option>
                  <option value="rslave">rslave</option>
                  <option value="rshared">rshared</option>
                </select>
                <label style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-secondary);">
                  <input
                    type="checkbox"
                    .checked=${volume.readOnly}
                    @change=${(e: any) => {
          const volumes = [...this.createVolumes];
          const current = volumes[index] ?? { source: '', target: '', type: 'bind', readOnly: false, propagation: '' };
          volumes[index] = { ...current, readOnly: e.target.checked };
          this.createVolumes = volumes;
        }}
                  />
                  Read-only
                </label>
                <button class="btn btn-secondary btn-small" @click=${() => this.removeVolumeMapping(index)}>Remove</button>
              </div>
            `)}
            <button class="btn btn-secondary btn-small" @click=${this.addVolumeMapping}>+ Add Volume</button>
          </div>

          <div class="form-section">
            <h3>Resources</h3>
            <div class="form-row">
              <div class="form-field" style="flex: 1;">
                <label class="form-label">CPU Cores</label>
                <input
                  class="form-input"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g., 1.5"
                  .value=${this.createCpuCores}
                  @input=${(e: any) => { this.createCpuCores = e.target.value; }}
                />
              </div>
              <div class="form-field" style="flex: 1;">
                <label class="form-label">Memory (MB)</label>
                <input
                  class="form-input"
                  type="number"
                  min="0"
                  step="64"
                  placeholder="e.g., 512"
                  .value=${this.createMemoryMB}
                  @input=${(e: any) => { this.createMemoryMB = e.target.value; }}
                />
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>Runtime</h3>
            <div class="form-row">
              <div class="form-field" style="flex: 1;">
                <label class="form-label">Network Mode</label>
                <input
                  class="form-input"
                  type="text"
                  placeholder="bridge"
                  .value=${this.createNetworkMode}
                  @input=${(e: any) => { this.createNetworkMode = e.target.value; }}
                />
              </div>
              <div class="form-field" style="flex: 1;">
                <label class="form-label">Restart Policy</label>
                <select
                  class="form-select"
                  .value=${this.createRestartPolicy}
                  @change=${(e: any) => { this.createRestartPolicy = e.target.value; }}
                >
                  <option value="no">no</option>
                  <option value="always">always</option>
                  <option value="on-failure">on-failure</option>
                  <option value="unless-stopped">unless-stopped</option>
                </select>
              </div>
              <div class="form-field" style="flex: 1;">
                <label class="form-label">Max Retries</label>
                <input
                  class="form-input"
                  type="number"
                  min="0"
                  placeholder="0"
                  .value=${this.createRestartMaxRetry}
                  @input=${(e: any) => { this.createRestartMaxRetry = e.target.value; }}
                />
              </div>
            </div>
          </div>
        </div>

        <div class="create-drawer-footer">
          <button class="btn btn-secondary" @click=${this.closeCreateContainerDrawer}>Cancel</button>
          <button class="btn btn-primary" ?disabled=${this.isCreating || !this.createName.trim() || !this.createImage.trim()} @click=${this.handleCreateContainer}>
            ${this.isCreating ? 'Creating...' : 'Create Container'}
          </button>
        </div>
      </div>
    `;
  }

  private renderContainersTable() {
    const filteredContainers = this.containers.filter(container =>
      container.names.some(name => name.toLowerCase().includes(this.searchTerm.toLowerCase()))
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
      <div class="action-menu">
        <button class="btn btn-primary" @click=${() => this.openCreateContainerDrawer()}>+ Create Container</button>
      </div>
    </div>
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Status</th>
            <th>Image</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filteredContainers.map((container, index) => {
      const isRunning = container.state.toLowerCase().includes('running');
      const isPaused = container.state.toLowerCase().includes('paused');
      const shortId = container.id?.substring(0, 12) || 'Unknown';
      const containerName = container.names.join(', ');

      return html`
            <tr>
              <td>${shortId}</td>
              <td>
                <button class="link-button" @click=${() => this.fetchContainerDetails(container.id)}>
                  ${containerName}
                </button>
              </td>
              <td>
                <div class="status-indicator">
                  <span class="status-icon ${this.getStatusClass(container.state)}" data-tooltip="${container.status}"></span>
                  ${container.status}
                </div>
              </td>
              <td>
                <span class="truncate" title="${container.image}">${this.truncateText(container.image, 30)}</span>
              </td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e: Event) => this.toggleActionMenu(e, `docker-container-${index}`)}>⋮</button>
                  <div class="action-dropdown" id="docker-container-${index}">
                    <button @click=${() => { this.closeAllMenus(); this.showContainerLogs(container); }}>View Logs</button>
                    <button @click=${() => { this.closeAllMenus(); this.openContainerTerminal(container); }}>${t('terminal.title')}</button>
                    ${!isRunning ? html`
                      <button @click=${() => { this.closeAllMenus(); this.confirmStartContainer(container); }}>${t('containers.start')}</button>
                    ` : ''}
                    ${isRunning && !isPaused ? html`
                      <button @click=${() => { this.closeAllMenus(); this.confirmStopContainer(container); }}>${t('containers.stop')}</button>
                    ` : ''}
                    ${isPaused ? html`
                      <button @click=${() => { this.closeAllMenus(); this.confirmUnpauseContainer(container); }}>Unpause</button>
                    ` : ''}
                    ${isRunning && !isPaused ? html`
                      <button @click=${() => { this.closeAllMenus(); this.confirmPauseContainer(container); }}>Pause</button>
                    ` : ''}
                    <button @click=${() => { this.closeAllMenus(); this.confirmRestartContainer(container); }}>Restart</button>
                    <button class="danger" @click=${() => { this.closeAllMenus(); this.confirmDeleteContainer(container); }}>${t('common.delete')}</button>
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
  private renderImagesTable() {
    const filteredImages = this.images.filter(image =>
      image.repoTags?.some(tag => tag.toLowerCase().includes(this.searchTerm.toLowerCase()))
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
        <button class="btn btn-primary" @click=${(e: Event) => this.toggleImageActionsMenu(e)}>+ Add Image</button>
        <div class="action-dropdown ${this.showImageActionsDropdown ? 'show' : ''}">
          <button @click=${() => { this.closeAllMenus(); this.showPullImageModal = true; }}>Pull Image</button>
          <button @click=${() => { this.closeAllMenus(); this.showUploadImageDialog(); }}>Upload Image</button>
        </div>
      </div>
    </div>
    <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tags</th>
            <th>Created</th>
            <th>Size</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filteredImages.map((image, index) => {
      const shortId = image.id?.substring(0, 12) || 'Unknown';
      const tags = image.repoTags && image.repoTags.length > 0
        ? image.repoTags.join(', ')
        : 'No tags';
      const size = typeof image.size === 'number' ? this.formatBytes(image.size) : 'Unknown';

      return html`
            <tr>
              <td>${shortId}</td>
              <td>${tags}</td>
              <td>-</td>
              <td>${size}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e: Event) => this.toggleActionMenu(e, `docker-image-${index}`)}>⋮</button>
                  <div class="action-dropdown" id="docker-image-${index}">
                    <button @click=${() => { this.closeAllMenus(); this.fetchImageDetails(image.id); }}>View Details</button>
                    <button class="danger" @click=${() => { this.closeAllMenus(); this.confirmDeleteImage(image); }}>${t('common.delete')}</button>
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
  private confirmDeleteContainer(container: DockerContainer) {
    this.selectedContainer = container;
    this.confirmTitle = 'Confirm Delete';
    this.confirmMessage = `Are you sure you want to delete container ${container.names.join(', ')}?`;
    this.confirmAction = this.deleteSelectedContainer.bind(this);
    this.showConfirmModal = true;
  }

  private confirmDeleteImage(image: DockerImage) {
    this.selectedImage = image;
    this.confirmTitle = 'Confirm Delete';
    const tags = image.repoTags && image.repoTags.length > 0 ? image.repoTags.join(', ') : 'Untagged image';
    this.confirmMessage = `Are you sure you want to delete image ${tags}?`;
    this.confirmAction = this.deleteSelectedImage.bind(this);
    this.showConfirmModal = true;
  }

  private async deleteSelectedContainer() {
    if (!this.selectedContainer) return;
    try {
      await api.delete(`/docker/containers/${this.selectedContainer.id}`);
      this.showConfirmModal = false;
      this.fetchContainers();
      this.selectedContainer = null;
    } catch (error) {
      console.error('Error deleting container:', error);
      // Handle error UI?
    }
  }

  private async deleteSelectedImage() {
    if (!this.selectedImage) return;
    try {
      await api.delete(`/docker/images/${this.selectedImage.id}`);
      this.showConfirmModal = false;
      this.fetchImages();
      this.selectedImage = null;
    } catch (error) {
      console.error('Error deleting image:', error);
      // Handle error UI?
    }
  }

  private renderVolumesTable() {
    const filteredVolumes = this.volumes.filter(volume =>
      volume.name.toLowerCase().includes(this.searchTerm.toLowerCase())
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
          placeholder="${t('containers.searchVolumes')}"
          .value=${this.searchTerm}
          @input=${(e: any) => this.searchTerm = e.target.value}
        />
      </div>
    </div>
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Driver</th>
            <th>Mount Point</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filteredVolumes.map((volume, index) => html`
            <tr>
              <td>${volume.name}</td>
              <td>${volume.driver}</td>
              <td>${volume.mountpoint}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e: Event) => this.toggleActionMenu(e, `docker-volume-${index}`)}>⋮</button>
                  <div class="action-dropdown" id="docker-volume-${index}">
                    <button class="danger" @click=${() => { this.closeAllMenus(); this.confirmDeleteVolume(volume); }}>${t('common.delete')}</button>
                  </div>
                </div>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  private renderNetworksTable() {
    const filteredNetworks = this.networks.filter(network =>
      network.name.toLowerCase().includes(this.searchTerm.toLowerCase())
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
          placeholder="${t('containers.searchNetworks')}"
          .value=${this.searchTerm}
          @input=${(e: any) => this.searchTerm = e.target.value}
        />
      </div>
    </div>
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Driver</th>
            <th>Scope</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filteredNetworks.map((network, index) => html`
            <tr>
              <td>${network.name}</td>
              <td>${network.driver}</td>
              <td>${network.scope}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e: Event) => this.toggleActionMenu(e, `docker-network-${index}`)}>⋮</button>
                  <div class="action-dropdown" id="docker-network-${index}">
                    <button class="danger" @click=${() => { this.closeAllMenus(); this.confirmDeleteNetwork(network); }}>${t('common.delete')}</button>
                  </div>
                </div>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  private confirmDeleteVolume(volume: DockerVolume) {
    this.confirmTitle = 'Confirm Delete';
    this.confirmMessage = `Are you sure you want to delete volume ${volume.name}?`;
    this.confirmAction = async () => {
      try {
        await api.delete(`/docker/volumes/${volume.name}`);
        this.showConfirmModal = false;
        this.fetchVolumes();
      } catch (error) {
        console.error('Error deleting volume:', error);
      }
    };
    this.showConfirmModal = true;
  }

  private confirmDeleteNetwork(network: DockerNetwork) {
    this.confirmTitle = 'Confirm Delete';
    this.confirmMessage = `Are you sure you want to delete network ${network.name}?`;
    this.confirmAction = async () => {
      try {
        await api.delete(`/docker/networks/${network.id}`);
        this.showConfirmModal = false;
        this.fetchNetworks();
      } catch (error) {
        console.error('Error deleting network:', error);
      }
    };
    this.showConfirmModal = true;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private toggleActionMenu(event: Event, menuId: string) {
    event.stopPropagation();
    const menu = this.shadowRoot?.getElementById(menuId);
    if (menu) {
      const isOpen = menu.classList.contains('show');
      this.closeAllMenus();
      if (!isOpen) {
        menu.classList.add('show');
        menu.classList.remove('open-up');
        const trigger = event.currentTarget as HTMLElement | null;
        requestAnimationFrame(() => {
          if (trigger) {
            const triggerRect = trigger.getBoundingClientRect();
            const menuRect = menu.getBoundingClientRect();
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const spaceBelow = viewportHeight - triggerRect.bottom;
            const spaceAbove = triggerRect.top;
            if (spaceBelow < menuRect.height && spaceAbove > spaceBelow) {
              menu.classList.add('open-up');
            }
          }
          const firstButton = menu.querySelector('button') as HTMLButtonElement;
          if (firstButton) {
            setTimeout(() => firstButton.focus(), 10);
          }
        });
      }
    }
  }

  private closeAllMenus() {
    const menus = this.shadowRoot?.querySelectorAll('.action-dropdown');
    menus?.forEach(menu => menu.classList.remove('show', 'open-up'));
  }

  // Container action methods
  private confirmStartContainer(container: DockerContainer) {
    this.selectedContainer = container;
    this.confirmTitle = 'Start Container';
    this.confirmMessage = `Are you sure you want to start container "${container.names.join(', ')}"?`;
    this.confirmAction = this.startSelectedContainer.bind(this);
    this.showConfirmModal = true;
  }

  private confirmStopContainer(container: DockerContainer) {
    this.selectedContainer = container;
    this.confirmTitle = 'Stop Container';
    this.confirmMessage = `Are you sure you want to stop container "${container.names.join(', ')}"?`;
    this.confirmAction = this.stopSelectedContainer.bind(this);
    this.showConfirmModal = true;
  }

  private confirmRestartContainer(container: DockerContainer) {
    this.selectedContainer = container;
    this.confirmTitle = 'Restart Container';
    this.confirmMessage = `Are you sure you want to restart container "${container.names.join(', ')}"?`;
    this.confirmAction = this.restartSelectedContainer.bind(this);
    this.showConfirmModal = true;
  }

  private confirmPauseContainer(container: DockerContainer) {
    this.selectedContainer = container;
    this.confirmTitle = 'Pause Container';
    this.confirmMessage = `Are you sure you want to pause container "${container.names.join(', ')}"?`;
    this.confirmAction = this.pauseSelectedContainer.bind(this);
    this.showConfirmModal = true;
  }

  private confirmUnpauseContainer(container: DockerContainer) {
    this.selectedContainer = container;
    this.confirmTitle = 'Unpause Container';
    this.confirmMessage = `Are you sure you want to unpause container "${container.names.join(', ')}"?`;
    this.confirmAction = this.unpauseSelectedContainer.bind(this);
    this.showConfirmModal = true;
  }

  private async startSelectedContainer() {
    if (!this.selectedContainer) return;
    try {
      await api.post(`/docker/containers/${this.selectedContainer.id}/start`);
      this.showConfirmModal = false;
      this.fetchContainers();
      this.selectedContainer = null;
    } catch (error) {
      console.error('Error starting container:', error);
      // TODO: Add error handling UI
    }
  }

  private async stopSelectedContainer() {
    if (!this.selectedContainer) return;
    try {
      await api.post(`/docker/containers/${this.selectedContainer.id}/stop`);
      this.showConfirmModal = false;
      this.fetchContainers();
      this.selectedContainer = null;
    } catch (error) {
      console.error('Error stopping container:', error);
      // TODO: Add error handling UI
    }
  }

  private async restartSelectedContainer() {
    if (!this.selectedContainer) return;
    try {
      await api.post(`/docker/containers/${this.selectedContainer.id}/restart`);
      this.showConfirmModal = false;
      this.fetchContainers();
      this.selectedContainer = null;
    } catch (error) {
      console.error('Error restarting container:', error);
      // TODO: Add error handling UI
    }
  }

  private async pauseSelectedContainer() {
    if (!this.selectedContainer) return;
    try {
      await api.post(`/docker/containers/${this.selectedContainer.id}/pause`);
      this.showConfirmModal = false;
      this.fetchContainers();
      this.selectedContainer = null;
    } catch (error) {
      console.error('Error pausing container:', error);
      // TODO: Add error handling UI
    }
  }

  private async unpauseSelectedContainer() {
    if (!this.selectedContainer) return;
    try {
      await api.post(`/docker/containers/${this.selectedContainer.id}/unpause`);
      this.showConfirmModal = false;
      this.fetchContainers();
      this.selectedContainer = null;
    } catch (error) {
      console.error('Error unpausing container:', error);
      // TODO: Add error handling UI
    }
  }

  private async showContainerLogs(container: DockerContainer) {
    try {
      this.logsError = null;
      this.containerLogs = 'Loading logs...';
      this.showLogsDrawer = true;

      const response = await api.get(`/docker/containers/${container.id}/logs`);
      this.containerLogs = response.logs || 'No logs available';
    } catch (error) {
      console.error('Error fetching container logs:', error);
      this.logsError = error instanceof ApiError ? error.message : 'Failed to fetch logs';
    }
  }

  private openContainerTerminal(container: DockerContainer) {
    this.terminalContainerId = container.id;
    this.terminalContainerName = container.names?.join(', ') || container.id;
    this.showTerminalModal = true;
  }



  private async fetchContainerDetails(containerId: string) {
    try {
      this.detailError = null;
      const response = await api.get(`/docker/containers/${containerId}`);
      this.selectedContainer = response.container || response;
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

  // Helper methods
  private getStatusClass(state: string): string {
    switch (state.toLowerCase()) {
      case 'running':
        return 'running';
      case 'stopped':
      case 'exited':
        return 'stopped';
      case 'paused':
        return 'paused';
      case 'created':
        return 'stopped';
      default:
        return 'stopped';
    }
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  }

  private renderContainerDetails() {
    if (!this.selectedContainer) return html``;
    const container = this.selectedContainer;

    return html`
      <div class="drawer-content">
        <div class="detail-section">
          <h3>Container Details</h3>
          <div class="detail-item">
            <span class="detail-label">Name</span>
            <span class="detail-value">${container.names.join(', ') || 'Unnamed'}</span>
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
              <span class="status-badge ${this.getStatusClass(container.state)}">${container.state}</span>
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Status</span>
            <span class="detail-value">${container.status || 'Unknown'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Command</span>
            <span class="detail-value monospace">${container.command || 'Unknown'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Created</span>
            <span class="detail-value">${container.created ? new Date(container.created).toLocaleString() : 'Unknown'}</span>
          </div>
        </div>

        ${container.labels && Object.keys(container.labels).length > 0 ? html`
          <div class="detail-section">
            <h3>Labels</h3>
            <div class="tag-list">
              ${Object.entries(container.labels).map(([key, value]) => html`<div class="tag">${key}: ${value}</div>`)}
            </div>
          </div>
        ` : ''}

        ${container.ports && container.ports.length > 0 ? html`
          <div class="detail-section">
            <h3>Ports</h3>
            ${container.ports.map(port => html`
              <div class="detail-item">
                <span class="detail-value">${port.privatePort}${port.publicPort ? ` → ${port.publicPort}` : ''} (${port.type})</span>
              </div>
            `)}
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderImageDetails() {
    if (!this.selectedImage) return html``;
    const image = this.selectedImage;
    const shortId = image.id?.replace('sha256:', '').substring(0, 12) || 'Unknown';
    const fullId = image.id || 'Unknown';
    const tags = image.repoTags && image.repoTags.length > 0 && image.repoTags[0] !== '<none>:<none>'
      ? image.repoTags
      : [];
    const digests = image.repoDigests && image.repoDigests.length > 0
      ? image.repoDigests
      : [];
    const size = typeof image.size === 'number' ? this.formatBytes(image.size) : 'Unknown';
    const created = image.created ? new Date(image.created).toLocaleString() : 'Unknown';

    return html`
      <div class="drawer-content">
        <div class="detail-section">
          <h3>Image Details</h3>
          <div class="detail-item">
            <span class="detail-label">Short ID</span>
            <span class="detail-value monospace">${shortId}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Full ID</span>
            <span class="detail-value monospace" style="word-break: break-all;">${fullId}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Size</span>
            <span class="detail-value">${size}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Created</span>
            <span class="detail-value">${created}</span>
          </div>
        </div>

        ${tags.length > 0 ? html`
          <div class="detail-section">
            <h3>Tags</h3>
            <div class="tag-list">
              ${tags.map(tag => html`<div class="tag">${tag}</div>`)}
            </div>
          </div>
        ` : html`
          <div class="detail-section">
            <h3>Tags</h3>
            <p style="color: var(--text-secondary); font-style: italic;">No tags</p>
          </div>
        `}

        ${digests.length > 0 ? html`
          <div class="detail-section">
            <h3>Digests</h3>
            ${digests.map(digest => html`
              <div class="detail-item">
                <span class="detail-value monospace" style="word-break: break-all; font-size: 0.75rem;">${digest}</span>
              </div>
            `)}
          </div>
        ` : ''}

        ${image.labels && Object.keys(image.labels).length > 0 ? html`
          <div class="detail-section">
            <h3>Labels</h3>
            <div class="tag-list">
              ${Object.entries(image.labels).map(([key, value]) => html`<div class="tag">${key}: ${value}</div>`)}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  private highlightSearchTerm(text: string, term: string): string {
    if (!term || !text) return text;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark style="background-color: #ffeb3b; color: #000; padding: 0 2px;">$1</mark>');
  }

  private renderError() {
    return html`
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <p class="error-message">${this.detailError}</p>
      </div>
    `;
  }

  // Image action methods
  private toggleImageActionsMenu(event: Event) {
    event.stopPropagation();
    this.showImageActionsDropdown = !this.showImageActionsDropdown;
  }

  private showUploadImageDialog() {
    this.showUploadDrawer = true;
  }

  private fetchImageDetails(imageId: string) {
    this.detailError = null;
    // Find the image from the already loaded images list
    const image = this.images.find(img => img.id === imageId);
    if (image) {
      this.selectedImage = image;
      this.selectedContainer = null;
      this.showDrawer = true;
    } else {
      this.detailError = 'Image not found';
      this.selectedContainer = null;
      this.selectedImage = null;
      this.showDrawer = true;
    }
  }

  // Upload methods
  private handleFileSelect = (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file) {
        this.addToUploadQueue(file);
      }
    }
  };

  private handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    const zone = event.currentTarget as HTMLElement;
    zone.classList.add('dragover');
  };

  private handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    const zone = event.currentTarget as HTMLElement;
    zone.classList.remove('dragover');
  };

  private handleDrop = (event: DragEvent) => {
    event.preventDefault();
    const zone = event.currentTarget as HTMLElement;
    zone.classList.remove('dragover');

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file) {
        this.addToUploadQueue(file);
      }
    }
  };

  private addToUploadQueue(file: File) {
    const uploadItem: UploadItem = {
      id: generateUUID(),
      file,
      progress: 0,
      status: 'pending'
    };

    this.uploadQueue = [...this.uploadQueue, uploadItem];
  }

  private removeFromUploadQueue(id: string) {
    this.uploadQueue = this.uploadQueue.filter(item => item.id !== id);
  }

  private async startUpload() {
    const pendingItems = this.uploadQueue.filter(item => item.status === 'pending');
    if (pendingItems.length === 0) return;

    this.isUploading = true;

    for (const item of pendingItems) {
      await this.uploadFile(item);
    }

    this.isUploading = false;
  }

  private async uploadFile(item: UploadItem): Promise<void> {
    return new Promise((resolve, reject) => {
      // Update status to uploading
      this.updateUploadItem(item.id, { status: 'uploading', progress: 0 });

      // Build the upload endpoint URL
      const uploadEndpoint = getApiUrl('/docker/images/upload');

      // Create TUS upload
      this.currentUpload = new tus.Upload(item.file, {
        endpoint: uploadEndpoint,
        chunkSize: 4 * 1024 * 1024, // 4MB chunks
        retryDelays: [0, 1000, 3000, 5000],
        metadata: {
          filename: item.file.name,
          filetype: item.file.type || 'application/octet-stream',
        },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token') || localStorage.getItem('auth_token')}`,
        },
        onError: (error) => {
          console.error('TUS upload error:', error);
          this.updateUploadItem(item.id, {
            status: 'error',
            error: error.message || 'Upload failed'
          });
          this.currentUpload = null;
          reject(error);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          this.updateUploadItem(item.id, { progress: percentage });
        },
        onSuccess: async () => {
          try {
            // Get the upload URL which contains the upload ID
            const uploadUrl = this.currentUpload?.url;
            if (uploadUrl) {
              // Extract upload ID from URL (last segment)
              const uploadId = uploadUrl.split('/').pop();
              if (uploadId) {
                // Complete the upload
                await api.post(`/docker/images/upload/${uploadId}/complete`, {});
              }
            }

            this.updateUploadItem(item.id, { status: 'completed', progress: 100 });
            // Refresh images list
            this.fetchImages();
            this.currentUpload = null;
            resolve();
          } catch (error) {
            console.error('Failed to complete upload:', error);
            this.updateUploadItem(item.id, {
              status: 'error',
              error: 'Failed to complete upload'
            });
            this.currentUpload = null;
            reject(error);
          }
        },
      });

      // Start the upload
      this.currentUpload.start();
    });
  }

  private updateUploadItem(id: string, updates: Partial<UploadItem>) {
    this.uploadQueue = this.uploadQueue.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
  }

  private clearCompletedUploads() {
    this.uploadQueue = this.uploadQueue.filter(item =>
      item.status !== 'completed' && item.status !== 'error'
    );
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Pull image method
  private async handlePullImage() {
    if (!this.imageName.trim() || this.isPullingImage) return;

    this.isPullingImage = true;

    try {
      await api.post('/docker/images/pull', {
        image: this.imageName.trim()
      });

      // Close modal and reset form
      this.showPullImageModal = false;
      this.imageName = '';

      // Refresh images list
      this.fetchImages();

    } catch (error) {
      console.error('Error pulling image:', error);
      // TODO: Add error handling UI - could show a toast notification or update modal with error
    } finally {
      this.isPullingImage = false;
    }
  }
}

customElements.define('docker-tab', DockerTab);

