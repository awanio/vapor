import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { Api } from '../api.js';

class KubernetesTab extends LitElement {
  @property({ type: String }) activeSubmenu = 'workloads';
  @property({ type: String }) subRoute: string | null = null;
  @property({ type: Array }) workloads: any[] = [];
  @property({ type: Array }) networks: any[] = [];
  @property({ type: Array }) storages: any[] = [];
  @property({ type: Array }) configurations: any[] = [];
  @property({ type: Array }) helms: any[] = [];
  @property({ type: Array }) nodes: any[] = [];
  @property({ type: Array }) crds: any[] = [];
  @property({ type: String }) error: string | null = null;
  @property({ type: String }) activeWorkloadTab = 'pods';
  @property({ type: String }) activeNetworkTab = 'services';
  @property({ type: String }) activeStorageTab = 'pvc';
  @property({ type: String }) activeConfigurationTab = 'secrets';
  @property({ type: String }) activeHelmTab = 'releases';
  @property({ type: Boolean }) showPodDetails = false;
  @property({ type: Object }) selectedPod: any = null;
  @property({ type: Boolean }) loadingPodDetails = false;
  @property({ type: Boolean }) showCrdDetails = false;
  @property({ type: Object }) selectedCrd: any = null;
  @property({ type: Boolean }) loadingCrdDetails = false;
  @property({ type: Boolean }) showDeploymentDetails = false;
  @property({ type: Object }) selectedDeployment: any = null;
  @property({ type: Boolean }) loadingDeploymentDetails = false;
  @property({ type: Boolean }) showStatefulSetDetails = false;
  @property({ type: Object }) selectedStatefulSet: any = null;
  @property({ type: Boolean }) loadingStatefulSetDetails = false;
  @property({ type: Boolean }) showDaemonSetDetails = false;
  @property({ type: Object }) selectedDaemonSet: any = null;
  @property({ type: Boolean }) loadingDaemonSetDetails = false;
  @property({ type: Boolean }) showJobDetails = false;
  @property({ type: Object }) selectedJob: any = null;
  @property({ type: Boolean }) loadingJobDetails = false;
  @property({ type: Boolean }) showCronJobDetails = false;
  @property({ type: Object }) selectedCronJob: any = null;
  @property({ type: Boolean }) loadingCronJobDetails = false;
  @property({ type: Boolean }) showPvcDetails = false;
  @property({ type: Object }) selectedPvc: any = null;
  @property({ type: Boolean }) loadingPvcDetails = false;
  @property({ type: Boolean }) showPvDetails = false;
  @property({ type: Object }) selectedPv: any = null;
  @property({ type: Boolean }) loadingPvDetails = false;
  @property({ type: Boolean }) showSecretDetails = false;
  @property({ type: Object }) selectedSecret: any = null;
  @property({ type: Boolean }) loadingSecretDetails = false;
  @property({ type: Boolean }) showConfigMapDetails = false;
  @property({ type: Object }) selectedConfigMap: any = null;
  @property({ type: Boolean }) loadingConfigMapDetails = false;
  @property({ type: Boolean }) showNodeDetails = false;
  @property({ type: Object }) selectedNode: any = null;
  @property({ type: Boolean }) loadingNodeDetails = false;
  @property({ type: Array }) namespaces: string[] = [];
  @property({ type: String }) selectedNamespace = 'all';
  @property({ type: Boolean }) showNamespaceDropdown = false;
  @property({ type: String }) namespaceSearchQuery = '';
  @property({ type: Array }) notifications: any[] = [];
  @property({ type: Number }) notificationId = 0;
  @property({ type: Boolean }) showLogsDrawer = false;
  @property({ type: String }) containerLogs = '';
  @property({ type: String }) logsSearchTerm = '';
  @property({ type: String }) logsError: string | null = null;
  @property({ type: Boolean }) showCreateDrawer = false;
  @property({ type: String }) createResourceYaml = '';
  @property({ type: Boolean }) isResourceValid = false;
  @property({ type: String }) validationError = '';
  @property({ type: Boolean }) showDeleteModal = false;
  @property({ type: Object }) itemToDelete: any = null;
  @property({ type: Boolean }) isDeleting = false;

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


    .tab-content {
      flex: 1;
      overflow-y: auto;
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

    .table {
      width: 100%;
      border-collapse: collapse;
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

    .table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .error-state {
      text-align: center;
      padding: 3rem;
      color: var(--vscode-error);
      background: var(--vscode-bg-light);
      border-radius: 6px;
      margin: 2rem 0;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }

    /* Drawer styles */
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

    .drawer-content {
      margin-top: 40px;
    }

    /* Logs styles */
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
      background: var(--vscode-button-background, #007acc);
      color: var(--vscode-button-foreground, white);
    }

    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground, #005a9e);
    }

    .btn-create {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: var(--vscode-button-background, #007acc);
      color: var(--vscode-button-foreground, white);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }

    .btn-create:hover {
      background: var(--vscode-button-hoverBackground, #005a9e);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.16);
    }

    .btn-create:active {
      transform: translateY(1px);
    }

    .btn-create svg {
      width: 14px;
      height: 14px;
    }

    h1 {
      margin: 0 0 24px 0;
      padding: 0;
      font-size: 24px;
      font-weight: 300;
    }

    .table tr:last-child td {
      border-bottom: none;
    }

    .table td:last-child {
      text-align: right;
    }

    .status {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .status.running,
    .status.active,
    .status.deployed,
    .status.bound,
    .status.available,
    .status.ready {
      background-color: rgba(34, 197, 94, 0.1);
      color: rgb(34, 197, 94);
    }

    .status.pending {
      background-color: rgba(251, 191, 36, 0.1);
      color: rgb(251, 191, 36);
    }

    .status.failed,
    .status.error {
      background-color: rgba(239, 68, 68, 0.1);
      color: rgb(239, 68, 68);
    }

    .status.enforced {
      background-color: rgba(59, 130, 246, 0.1);
      color: rgb(59, 130, 246);
    }

    .search-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      gap: 1rem;
    }

    .search-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
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

    .namespace-filter {
      position: relative;
      display: flex;
      align-items: center;
    }

    .namespace-select {
      padding: 6px 12px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-input-border, var(--vscode-panel-border, #454545)));
      border-radius: 4px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: 0.875rem;
      min-width: 150px;
      transition: all 0.2s;
      outline: none;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
    }

    .namespace-select:hover {
      border-color: var(--vscode-inputOption-hoverBorder, var(--vscode-widget-border, #858585));
    }

    .namespace-select:focus {
      border-color: var(--vscode-focusBorder, #007acc);
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--vscode-focusBorder, #007acc);
    }

    .namespace-dropdown {
      position: relative;
      min-width: 150px;
    }

    .namespace-button {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 6px 12px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-input-border, var(--vscode-panel-border, #454545)));
      border-radius: 4px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
      outline: none;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
    }

    .namespace-button:hover {
      border-color: var(--vscode-inputOption-hoverBorder, var(--vscode-widget-border, #858585));
    }

    .namespace-button:focus,
    .namespace-button.active {
      border-color: var(--vscode-focusBorder, #007acc);
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--vscode-focusBorder, #007acc);
    }

    .namespace-arrow {
      margin-left: 8px;
      transition: transform 0.2s;
      font-size: 12px;
    }

    .namespace-arrow.open {
      transform: rotate(180deg);
    }

    .namespace-dropdown-content {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 4px;
      background: var(--vscode-dropdown-background, var(--vscode-menu-background, var(--vscode-bg-light, #252526)));
      border: 1px solid var(--vscode-dropdown-border, var(--vscode-menu-border, var(--border-color, #454545)));
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 1000;
      max-height: 250px;
      overflow: hidden;
      display: none;
    }

    .namespace-dropdown-content.show {
      display: block;
    }

    .namespace-search {
      padding: 8px;
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
    }

    .namespace-search-input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid var(--vscode-widget-border, var(--vscode-input-border, var(--vscode-panel-border, #454545)));
      border-radius: 3px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: 0.8125rem;
      outline: none;
      box-sizing: border-box;
    }

    .namespace-search-input:focus {
      border-color: var(--vscode-focusBorder, #007acc);
    }

    .namespace-search-input::placeholder {
      color: var(--vscode-input-placeholderForeground, #999);
      opacity: 0.7;
    }

    .namespace-options {
      max-height: 180px;
      overflow-y: auto;
    }

    .namespace-option {
      display: block;
      width: 100%;
      text-align: left;
      padding: 8px 12px;
      border: none;
      background: none;
      color: var(--vscode-menu-foreground, var(--vscode-foreground, var(--vscode-text, #cccccc)));
      cursor: pointer;
      font-size: 0.875rem;
      transition: background-color 0.2s;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .namespace-option:hover {
      background-color: var(--vscode-list-hoverBackground, var(--vscode-toolbar-hoverBackground, rgba(255, 255, 255, 0.08)));
      color: var(--vscode-list-hoverForeground, var(--vscode-foreground));
    }

    .namespace-option.selected {
      background-color: var(--vscode-list-activeSelectionBackground, var(--vscode-accent, #007acc));
      color: var(--vscode-list-activeSelectionForeground, white);
    }

    .namespace-option.selected:hover {
      background-color: var(--vscode-list-activeSelectionBackground, var(--vscode-accent, #007acc));
    }

    .no-namespaces {
      padding: 8px 12px;
      color: var(--vscode-descriptionForeground, var(--text-secondary, #999));
      font-style: italic;
      font-size: 0.8125rem;
    }

    .filter-label {
      margin-right: 8px;
      font-size: 0.875rem;
      color: var(--vscode-foreground);
      font-weight: 500;
    }

    .pod-details-drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: 600px;
      height: 100vh;
      background: var(--vscode-editor-background, var(--vscode-bg-light));
      border-left: 0.5px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
      z-index: 1001;
      overflow-y: auto;
      padding: 20px;
    }

    .close-button {
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--vscode-text);
      font-size: 18px;
      padding: 4px;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .close-button:hover {
      background-color: var(--hover-bg);
    }

    .pod-details-drawer h2 {
      margin: 0 0 20px 0;
      padding: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--vscode-text);
    }

    .pod-details-drawer ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .pod-details-drawer li {
      padding: 8px 0;
      border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      font-size: 0.875rem;
      color: var(--vscode-text);
    }

    .pod-details-drawer li:last-child {
      border-bottom: none;
    }

    .pod-details-drawer strong {
      font-weight: bold;
      font-size: 0.9rem;
    }

    .loading-state {
      text-align: center;
      padding: 20px;
      color: var(--vscode-text);
      font-style: italic;
    }

    .no-data {
      text-align: center;
      padding: 20px;
      color: var(--text-secondary);
      font-style: italic;
    }

    .pod-details-content {
      font-size: 0.875rem;
    }

    .detail-section {
      margin-bottom: 8px;
    }

    .detail-item {
      margin-bottom: 8px;
      padding: 4px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .detail-item:last-child {
      border-bottom: none;
    }

    .detail-key {
      font-weight: 600;
      display: inline-block;
      min-width: 120px;
      margin-right: 8px;
    }

    .detail-value {
      color: var(--vscode-foreground, var(--vscode-text, #cccccc));
      word-break: break-word;
      display: inline;
    }

    .detail-value.null {
      color: var(--vscode-descriptionForeground, var(--text-secondary, #999));
      font-style: italic;
    }

    .detail-item.nested {
      border-left: 1px solid var(--vscode-accent, #007acc);
      padding-left: 8px;
      margin-left: 8px;
    }

    .nested-content {
      margin-top: 4px;
    }

    .detail-item.array {
      border-left: 2px solid var(--vscode-symbolIcon-arrayForeground, #4FC1FF);
      padding-left: 8px;
      margin-left: 8px;
    }

    .array-content {
      margin-top: 4px;
    }

    .array-item {
      margin: 4px 0;
      padding: 2px 0;
    }

    .array-index {
      color: var(--vscode-symbolIcon-numberForeground, #B5CEA8);
      font-weight: 600;
      margin-right: 8px;
      font-size: 0.8rem;
    }

    .array-value {
      color: var(--vscode-text);
    }

    .empty-array {
      color: var(--text-secondary);
      font-style: italic;
    }

    /* Modal styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 2000;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 80px;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .modal {
      background: var(--vscode-editor-background, var(--vscode-bg-light));
      border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
      border-radius: 8px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      animation: modalFadeIn 0.3s ease-out;
    }

    @keyframes modalFadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .modal-header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
    }

    .modal-icon {
      font-size: 24px;
      margin-right: 12px;
    }

    .modal-icon.warning {
      color: var(--vscode-notificationsWarningIcon-foreground, #ff9800);
    }

    .modal-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }

    .modal-body {
      margin-bottom: 24px;
      color: var(--vscode-foreground);
      line-height: 1.5;
    }

    .modal-resource-info {
      background: var(--vscode-editor-inactiveSelectionBackground, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--vscode-widget-border, rgba(255, 255, 255, 0.1));
      border-radius: 4px;
      padding: 12px;
      margin: 12px 0;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 14px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .modal-button {
      padding: 8px 16px;
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .modal-button.cancel {
      background: var(--vscode-button-secondaryBackground, rgba(255, 255, 255, 0.1));
      color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    }

    .modal-button.cancel:hover {
      background: var(--vscode-button-secondaryHoverBackground, rgba(255, 255, 255, 0.15));
    }

    .modal-button.delete {
      background: var(--vscode-notificationsErrorIcon-foreground, #f44336);
      color: white;
      border-color: var(--vscode-notificationsErrorIcon-foreground, #f44336);
    }

    .modal-button.delete:hover {
      background: #d32f2f;
      border-color: #d32f2f;
    }

    .modal-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .modal-button.delete:disabled {
      background: var(--vscode-notificationsErrorIcon-foreground, #f44336);
      border-color: var(--vscode-notificationsErrorIcon-foreground, #f44336);
    }

    .pod-name-link {
      color: var(--vscode-link-foreground, #0096ff);
      cursor: pointer;
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: all 0.2s ease;
    }

    .pod-name-link:hover {
      color: var(--vscode-link-activeForeground, #0096ff);
      text-decoration: none;
      border-bottom-color: var(--vscode-link-foreground, #0096ff);
    }

    .pod-name-link:active {
      color: var(--vscode-link-activeForeground, #0096ff);
    }

    .detail-sections {
      padding: 0;
    }

    .detail-section {
      margin-bottom: 24px;
      padding: 16px 0;
      border-bottom: 1px solid var(--vscode-widget-border, rgba(255, 255, 255, 0.1));
    }

    .detail-section:last-child {
      border-bottom: none;
    }

    .detail-section h3 {
      margin: 0 0 12px 0;
      padding: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--vscode-foreground);
      border-bottom: 1px solid var(--vscode-accent, #007acc);
      padding-bottom: 6px;
      margin-bottom: 16px;
    }

    .detail-item {
      margin-bottom: 8px;
      padding: 6px 0;
      display: flex;
      align-items: flex-start;
    }

    .detail-item:last-child {
      margin-bottom: 0;
    }

    .detail-key {
      font-weight: 600;
      min-width: 140px;
      margin-right: 12px;
      flex-shrink: 0;
    }

    .detail-value {
      color: var(--vscode-foreground, var(--vscode-text, #cccccc));
      word-break: break-word;
      flex: 1;
      line-height: 1.4;
    }

    .detail-value.null {
      color: var(--vscode-descriptionForeground, var(--text-secondary, #999));
      font-style: italic;
    }

    .detail-item.nested {
      border-left: 3px solid var(--vscode-accent, #007acc);
      padding-left: 12px;
      margin-left: 0;
      background: rgba(0, 122, 204, 0.05);
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 12px;
      flex-direction: column;
      align-items: stretch;
    }

    .nested-content {
      margin-top: 8px;
    }

    .nested-content .detail-item {
      margin-bottom: 6px;
      padding: 4px 0;
    }

    .notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
    }

    .notification {
      background: var(--vscode-notifications-background, #252526);
      border: 1px solid var(--vscode-notifications-border, #454545);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: flex-start;
      animation: slideIn 0.3s ease-out;
      position: relative;
    }

    .notification.error {
      border-left: 4px solid var(--vscode-errorForeground, #f14c4c);
    }

    .notification.success {
      border-left: 4px solid var(--vscode-terminal-ansiGreen, #23d18b);
    }

    .notification.info {
      border-left: 4px solid var(--vscode-focusBorder, #007acc);
    }

    .notification.warning {
      border-left: 4px solid var(--vscode-terminal-ansiYellow, #f1fa8c);
    }

    .notification-icon {
      margin-right: 12px;
      font-size: 18px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .notification-icon.error {
      color: var(--vscode-errorForeground, #f14c4c);
    }

    .notification-icon.success {
      color: var(--vscode-terminal-ansiGreen, #23d18b);
    }

    .notification-icon.info {
      color: var(--vscode-focusBorder, #007acc);
    }

    .notification-icon.warning {
      color: var(--vscode-terminal-ansiYellow, #f1fa8c);
    }

    .notification-content {
      flex: 1;
    }

    .notification-title {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 4px;
      color: var(--vscode-notifications-foreground, #cccccc);
    }

    .notification-message {
      font-size: 13px;
      color: var(--vscode-descriptionForeground, #999);
      line-height: 1.4;
    }

    .notification-close {
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      color: var(--vscode-notifications-foreground, #cccccc);
      cursor: pointer;
      padding: 4px;
      border-radius: 3px;
      font-size: 16px;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .notification-close:hover {
      opacity: 1;
      background: rgba(255, 255, 255, 0.1);
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }

    .notification.removing {
      animation: slideOut 0.3s ease-in;
    }

    /* CRD Details specific styles */
    .crd-details-drawer {
      width: 700px; /* Slightly wider for CRD details */
    }

    .raw-data {
      background: var(--vscode-textCodeBlock-background, rgba(0, 0, 0, 0.2));
      border: 1px solid var(--vscode-widget-border, rgba(255, 255, 255, 0.1));
      border-radius: 4px;
      padding: 12px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
      line-height: 1.4;
      overflow-x: auto;
      white-space: pre-wrap;
      color: var(--vscode-editor-foreground, #cccccc);
      max-height: 400px;
      overflow-y: auto;
    }

    details {
      margin: 8px 0;
    }

    summary {
      cursor: pointer;
      padding: 8px 0;
      font-weight: 600;
      color: var(--vscode-foreground);
      user-select: none;
      border-bottom: 1px solid var(--vscode-widget-border, rgba(255, 255, 255, 0.1));
      margin-bottom: 8px;
      list-style: none;
      position: relative;
    }

    summary:hover {
      color: var(--vscode-link-foreground, #0096ff);
    }

    /* Hide default browser disclosure triangles */
    summary::-webkit-details-marker {
      display: none;
    }

    summary::-moz-list-bullet {
      list-style-type: none;
    }

    summary::marker {
      display: none;
      content: "";
    }

    details > summary {
      list-style: none;
    }

    details > summary::-webkit-details-marker {
      display: none;
    }

    /* Custom arrow */
    summary::before {
      content: '▶';
      display: inline-block;
      margin-right: 8px;
      transition: transform 0.2s;
      font-size: 12px;
      position: relative;
    }

    details[open] summary::before {
      transform: rotate(90deg);
    }

    .detail-value.empty-object {
      color: var(--vscode-descriptionForeground, var(--text-secondary, #999));
      font-style: italic;
    }
  `;

  renderContent() {
    // Use filtered data based on search query
    const data = this.getFilteredData();

    if (data.length === 0) {
      const allData = this.getDataForActiveSubmenu();
      if (allData.length === 0) {
        return html`
          <div class="empty-state">No ${this.activeSubmenu} resources found.</div>
        `;
      } else {
        return html`
          <div class="empty-state">No ${this.activeSubmenu} resources match your search.</div>
        `;
      }
    }

    switch (this.activeSubmenu) {
      case 'workloads':
        return this.renderWorkloadTable(data);
      case 'networks':
        return this.renderNetworksTable(data);
      case 'storages':
        return this.renderStorageTable(data);
      case 'configurations':
        return this.renderConfigurationsTable(data);
      case 'helms':
        return this.renderHelmTable(data);
      case 'nodes':
        return this.renderNodesTable(data);
      case 'crds':
        return this.renderCrdTable(data);
      default:
        return html`<div class="empty-state">Invalid submenu</div>`;
    }
  }

  renderWorkloadTable(data: Array<any>) {
    if (this.loadingPodDetails || this.loadingStatefulSetDetails) {
      console.log('Raw data in detail drawers:');
      console.log('Pod data:', this.selectedPod);
      console.log('StatefulSet data:', this.selectedStatefulSet);
    }
    
    // Check if we're showing only CronJobs or Jobs to adjust header
    const isCronJobsOnly = this.activeWorkloadTab === 'cronjobs';
    const isJobsOnly = this.activeWorkloadTab === 'jobs';
    
    let headerText = 'Replicas';
    if (isCronJobsOnly) {
      headerText = 'Schedule';
    } else if (isJobsOnly) {
      headerText = 'Completions';
    }
    
    return html`
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Namespace</th>
            ${!isJobsOnly ? html`<th>Status</th>` : ''}
            <th>${headerText}</th>
            <th>Age</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((item: any, index: number) => html`
            <tr>
              <td>
                ${(item.type === 'Pod' || item.type === 'Deployment' || item.type === 'StatefulSet' || item.type === 'DaemonSet' || item.type === 'Job' || item.type === 'CronJob')
                  ? html`<span class="pod-name-link" @click=${() => this.viewDetails(item)}>${item.name}</span>`
                  : item.name
                }
              </td>
              <td>${item.type}</td>
              <td>${item.namespace}</td>
              ${!isJobsOnly ? html`<td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>` : ''}
              <td>${item.replicas || '-'}</td>
              <td>${item.age}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e: MouseEvent) => this.toggleActionMenu(e, `k8s-workload-${index}`)}>⋮</button>
                  <div class="action-dropdown" id="k8s-workload-${index}">
                    <button @click=${() => { this.closeAllMenus(); this.viewDetails(item); }}>View Details</button>
                    ${item.type === 'Pod' ? html`<button @click=${() => { this.closeAllMenus(); this.viewLogs(item); }}>View Logs</button>` : ''}
                    <button class="danger" @click=${() => { this.closeAllMenus(); this.deleteItem(item); }}>Delete</button>
                  </div>
                </div>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  renderNetworksTable(data: Array<any>) {
    // Check which network tab is active to render appropriate columns
    const isServices = this.activeNetworkTab === 'services';
    const isIngresses = this.activeNetworkTab === 'ingresses';
    const isIngressClasses = this.activeNetworkTab === 'ingressclasses';
    // const isNetworkPolicies = this.activeNetworkTab === 'networkpolicies';
    
    if (isServices) {
      return html`
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Namespace</th>
              <th>Cluster IP</th>
              <th>External IP</th>
              <th>Ports</th>
              <th>Age</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((item: any, index: number) => html`
              <tr>
                <td>
                  <span class="pod-name-link" @click=${() => this.viewDetails(item)}>
                    ${item.name}
                  </span>
                </td>
                <td>${item.serviceType}</td>
                <td>${item.namespace}</td>
                <td>${item.clusterIP || '-'}</td>
                <td>${item.externalIP || '-'}</td>
                <td>${item.ports || '-'}</td>
                <td>${item.age}</td>
                <td>
                  <div class="action-menu">
                    <button class="action-dots" @click=${(e: MouseEvent) => this.toggleActionMenu(e, `k8s-networks-${index}`)}>⋮</button>
                    <div class="action-dropdown" id="k8s-networks-${index}">
                      <button @click=${() => { this.closeAllMenus(); this.viewDetails(item); }}>View Details</button>
                      <button @click=${() => { this.closeAllMenus(); this.editItem(item); }}>Edit</button>
                      <button @click=${() => { this.closeAllMenus(); this.viewEndpoints(item); }}>View Endpoints</button>
                      <button class="danger" @click=${() => { this.closeAllMenus(); this.deleteItem(item); }}>Delete</button>
                    </div>
                  </div>
                </td>
              </tr>
            `)}
          </tbody>
        </table>
      `;
    } else if (isIngresses) {
      return html`
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Namespace</th>
              <th>Class</th>
              <th>Hosts</th>
              <th>Address</th>
              <th>Ports</th>
              <th>Age</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((item: any, index: number) => html`
              <tr>
                <td>
                  <span class="pod-name-link" @click=${() => this.viewDetails(item)}>
                    ${item.name}
                  </span>
                </td>
                <td>${item.namespace}</td>
                <td>${item.ingressClass || '-'}</td>
                <td>${item.hosts || '-'}</td>
                <td>${item.address || '-'}</td>
                <td>${item.ports || '-'}</td>
                <td>${item.age}</td>
                <td>
                  <div class="action-menu">
                    <button class="action-dots" @click=${(e: MouseEvent) => this.toggleActionMenu(e, `k8s-networks-${index}`)}>⋮</button>
                    <div class="action-dropdown" id="k8s-networks-${index}">
                      <button @click=${() => { this.closeAllMenus(); this.viewDetails(item); }}>View Details</button>
                      <button @click=${() => { this.closeAllMenus(); this.editItem(item); }}>Edit</button>
                      <button class="danger" @click=${() => { this.closeAllMenus(); this.deleteItem(item); }}>Delete</button>
                    </div>
                  </div>
                </td>
              </tr>
            `)}
          </tbody>
        </table>
      `;
    } else {
      // For IngressClasses and NetworkPolicies (not yet implemented)
      return html`
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Namespace</th>
              <th>Status</th>
              <th>Age</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.length === 0 ? html`
              <tr>
                <td colspan="6" style="text-align: center; padding: 2rem;">
                  ${isIngressClasses ? 'IngressClasses' : 'NetworkPolicies'} API endpoint is not yet implemented
                </td>
              </tr>
            ` : data.map((item: any, index: number) => html`
              <tr>
                <td>${item.name}</td>
                <td>${item.type}</td>
                <td>${item.namespace}</td>
                <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
                <td>${item.age}</td>
                <td>
                  <div class="action-menu">
                    <button class="action-dots" @click=${(e: MouseEvent) => this.toggleActionMenu(e, `k8s-networks-${index}`)}>⋮</button>
                    <div class="action-dropdown" id="k8s-networks-${index}">
                      <button @click=${() => { this.closeAllMenus(); this.viewDetails(item); }}>View Details</button>
                      <button @click=${() => { this.closeAllMenus(); this.editItem(item); }}>Edit</button>
                      <button class="danger" @click=${() => { this.closeAllMenus(); this.deleteItem(item); }}>Delete</button>
                    </div>
                  </div>
                </td>
              </tr>
            `)}
          </tbody>
        </table>
      `;
    }
  }

  renderStorageTable(data: Array<any>) {
    return html`
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Namespace</th>
            <th>Status</th>
            <th>Capacity</th>
            <th>Access Mode</th>
            <th>Age</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((item: any, index: number) => html`
            <tr>
              <td>
                ${(item.type === 'PersistentVolume' || item.type === 'PersistentVolumeClaim')
                  ? html`<span class="pod-name-link" @click=${() => this.viewDetails(item)}>${item.name}</span>`
                  : item.name
                }
              </td>
              <td>${item.type}</td>
              <td>${item.namespace}</td>
              <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
              <td>${item.capacity}</td>
              <td>${item.accessMode}</td>
              <td>${item.age}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e: MouseEvent) => this.toggleActionMenu(e, `k8s-storage-${index}`)}>⋮</button>
                  <div class="action-dropdown" id="k8s-storage-${index}">
                    <button @click=${() => { this.closeAllMenus(); this.viewDetails(item); }}>View Details</button>
                    <button @click=${() => { this.closeAllMenus(); this.editItem(item); }}>Edit</button>
                    <button @click=${() => { this.closeAllMenus(); this.expandVolume(item); }}>Expand</button>
                    <button class="danger" @click=${() => { this.closeAllMenus(); this.deleteItem(item); }}>Delete</button>
                  </div>
                </div>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  renderConfigurationsTable(data: Array<any>) {
    return html`
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Namespace</th>
            <th>Status</th>
            <th>Keys</th>
            <th>Age</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((item: any, index: number) => html`
            <tr>
              <td>
                ${(item.type === 'Secret' || item.type === 'ConfigMap')
                  ? html`<span class="pod-name-link" @click=${() => this.viewDetails(item)}>${item.name}</span>`
                  : item.name
                }
              </td>
              <td>${item.type}</td>
              <td>${item.namespace}</td>
              <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
              <td>${item.keys}</td>
              <td>${item.age}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e: MouseEvent) => this.toggleActionMenu(e, `k8s-configurations-${index}`)}>⋮</button>
                  <div class="action-dropdown" id="k8s-configurations-${index}">
                    <button @click=${() => { this.closeAllMenus(); this.viewDetails(item); }}>View Details</button>
                    <button @click=${() => { this.closeAllMenus(); this.editItem(item); }}>Edit</button>
                    <button @click=${() => { this.closeAllMenus(); this.viewKeys(item); }}>View Keys</button>
                    <button class="danger" @click=${() => { this.closeAllMenus(); this.deleteItem(item); }}>Delete</button>
                  </div>
                </div>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  renderHelmTable(data: Array<any>) {
    return html`
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Namespace</th>
            <th>Revision</th>
            <th>Status</th>
            <th>Chart</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((item: any, index: number) => html`
            <tr>
              <td>${item.name}</td>
              <td>${item.namespace}</td>
              <td>${item.revision}</td>
              <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
              <td>${item.chart}</td>
              <td>${item.updated}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e: MouseEvent) => this.toggleActionMenu(e, `k8s-helm-${index}`)}>⋮</button>
                  <div class="action-dropdown" id="k8s-helm-${index}">
                    <button @click=${() => { this.closeAllMenus(); this.viewDetails(item); }}>View Details</button>
                    <button @click=${() => { this.closeAllMenus(); this.upgradeRelease(item); }}>Upgrade</button>
                    <button @click=${() => { this.closeAllMenus(); this.rollbackRelease(item); }}>Rollback</button>
                    <button class="danger" @click=${() => { this.closeAllMenus(); this.uninstallRelease(item); }}>Uninstall</button>
                  </div>
                </div>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  renderNodesTable(data: Array<any>) {
    return html`
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Roles</th>
            <th>Age</th>
            <th>Version</th>
            <th>Internal IP</th>
            <th>External IP</th>
            <th>OS Image</th>
            <th>Kernel Version</th>
            <th>Container Runtime</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((node: any, index: number) => html`
            <tr>
              <td>
                <span class="pod-name-link" @click=${() => this.viewDetails(node)}>
                  ${node.name}
                </span>
              </td>
              <td><span class="status ${node.status.toLowerCase()}">${node.status}</span></td>
              <td>${Array.isArray(node.roles) ? node.roles.join(', ') : (node.roles || '-')}</td>
              <td>${node.age}</td>
              <td>${node.version}</td>
              <td>${node.internalIP}</td>
              <td>${node.externalIP || '-'}</td>
              <td>${node.osImage}</td>
              <td>${node.kernelVersion}</td>
              <td>${node.containerRuntime}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e: MouseEvent) => this.toggleActionMenu(e, `k8s-node-${index}`)}>⋮</button>
                  <div class="action-dropdown" id="k8s-node-${index}">
                    <button @click=${() => { this.closeAllMenus(); this.viewDetails(node); }}>View Details</button>
                    <button @click=${() => { this.closeAllMenus(); this.editItem(node); }}>Edit</button>
                    <button @click=${() => { this.closeAllMenus(); this.drainNode(node); }}>Drain</button>
                    <button @click=${() => { this.closeAllMenus(); this.cordonNode(node); }}>Cordon</button>
                  </div>
                </div>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  renderCrdTable(data: Array<any>) {
    return html`
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Group</th>
            <th>Version</th>
            <th>Kind</th>
            <th>Scope</th>
            <th>Age</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((crd: any, index: number) => html`
            <tr>
              <td>
                <span class="pod-name-link" @click=${() => this.viewDetails(crd)}>
                  ${crd.name}
                </span>
              </td>
              <td>${crd.group}</td>
              <td>${crd.version}</td>
              <td>${crd.kind}</td>
              <td>${crd.scope}</td>
              <td>${crd.age}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e: MouseEvent) => this.toggleActionMenu(e, `k8s-crd-${index}`)}>⋮</button>
                  <div class="action-dropdown" id="k8s-crd-${index}">
                    <button @click=${() => { this.closeAllMenus(); this.viewDetails(crd); }}>View Details</button>
                    <button @click=${() => { this.closeAllMenus(); this.editItem(crd); }}>Edit</button>
                    <button class="danger" @click=${() => { this.closeAllMenus(); this.deleteItem(crd); }}>Delete</button>
                  </div>
                </div>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  private searchQuery: string = '';

  private handleSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value.toLowerCase();
    this.requestUpdate();
  }

  private getFilteredData(): Array<any> {
    let data = this.getDataForActiveSubmenu();
    
    // If viewing workloads, filter by active workload tab
    if (this.activeSubmenu === 'workloads') {
      data = this.getFilteredWorkloadData();
    }
    
    // If viewing networks, filter by active network tab
    if (this.activeSubmenu === 'networks') {
      data = this.getFilteredNetworkData();
    }
    
    // If viewing storages, filter by active storage tab
    if (this.activeSubmenu === 'storages') {
      data = this.getFilteredStorageData();
    }
    
    // If viewing configurations, filter by active configuration tab
    if (this.activeSubmenu === 'configurations') {
      data = this.getFilteredConfigurationData();
    }
    
    // If viewing helms, filter by active helm tab
    if (this.activeSubmenu === 'helms') {
      data = this.getFilteredHelmData();
    }
    
    // Filter by namespace if a specific namespace is selected
    // Skip namespace filtering for nodes since they are cluster-level resources
    if (this.selectedNamespace !== 'all' && this.activeSubmenu !== 'nodes') {
      data = data.filter((item: any) => item.namespace === this.selectedNamespace);
    }
    
    // Apply search query filter
    if (this.searchQuery) {
      data = data.filter((item: any) => JSON.stringify(item).toLowerCase().includes(this.searchQuery));
    }
    
    return data;
  }

  private getFilteredWorkloadData(): Array<any> {
    const allWorkloads = this.workloads || [];
    
    switch (this.activeWorkloadTab) {
      case 'pods':
        return allWorkloads.filter((item: any) => item.type === 'Pod');
      case 'deployments':
        return allWorkloads.filter((item: any) => item.type === 'Deployment');
      case 'statefulsets':
        return allWorkloads.filter((item: any) => item.type === 'StatefulSet');
      case 'daemonsets':
        return allWorkloads.filter((item: any) => item.type === 'DaemonSet');
      case 'jobs':
        return allWorkloads.filter((item: any) => item.type === 'Job');
      case 'cronjobs':
        return allWorkloads.filter((item: any) => item.type === 'CronJob');
      default:
        return allWorkloads;
    }
  }

  private getFilteredNetworkData(): Array<any> {
    const allNetworks = this.networks || [];
    
    switch (this.activeNetworkTab) {
      case 'services':
        return allNetworks.filter((item: any) => item.type === 'Service');
      case 'ingresses':
        return allNetworks.filter((item: any) => item.type === 'Ingress');
      case 'ingressclasses':
        return allNetworks.filter((item: any) => item.type === 'IngressClass');
      case 'networkpolicies':
        return allNetworks.filter((item: any) => item.type === 'NetworkPolicy');
      default:
        return allNetworks;
    }
  }

  private getFilteredStorageData(): Array<any> {
    const allStorages = this.storages || [];
    
    switch (this.activeStorageTab) {
      case 'pvc':
        return allStorages.filter((item: any) => item.type === 'PersistentVolumeClaim');
      case 'pv':
        return allStorages.filter((item: any) => item.type === 'PersistentVolume');
      default:
        return allStorages;
    }
  }

  private getFilteredConfigurationData(): Array<any> {
    const allConfigurations = this.configurations || [];
    
    switch (this.activeConfigurationTab) {
      case 'secrets':
        return allConfigurations.filter((item: any) => item.type === 'Secret');
      case 'configmap':
        return allConfigurations.filter((item: any) => item.type === 'ConfigMap');
      default:
        return allConfigurations;
    }
  }

  private getFilteredHelmData(): Array<any> {
    const allHelms = this.helms || [];
    
    switch (this.activeHelmTab) {
      case 'releases':
        return allHelms.filter((item: any) => item.type === 'Release');
      case 'charts':
        return allHelms.filter((item: any) => item.type === 'Chart');
      default:
        return allHelms;
    }
  }

  private handleWorkloadTabClick(tab: string) {
    this.activeWorkloadTab = tab;
    this.requestUpdate();
  }

  private handleNetworkTabClick(tab: string) {
    this.activeNetworkTab = tab;
    this.requestUpdate();
  }

  private handleStorageTabClick(tab: string) {
    this.activeStorageTab = tab;
    this.requestUpdate();
  }

  private handleConfigurationTabClick(tab: string) {
    this.activeConfigurationTab = tab;
    this.requestUpdate();
  }

  private handleHelmTabClick(tab: string) {
    this.activeHelmTab = tab;
    this.requestUpdate();
  }

  private renderWorkloadTabs() {
    return html`
      <div class="tab-header">
        <button 
          class="tab-button ${this.activeWorkloadTab === 'pods' ? 'active' : ''}"
          @click=${() => this.handleWorkloadTabClick('pods')}
        >
          Pods
        </button>
        <button 
          class="tab-button ${this.activeWorkloadTab === 'deployments' ? 'active' : ''}"
          @click=${() => this.handleWorkloadTabClick('deployments')}
        >
          Deployments
        </button>
        <button 
          class="tab-button ${this.activeWorkloadTab === 'statefulsets' ? 'active' : ''}"
          @click=${() => this.handleWorkloadTabClick('statefulsets')}
        >
          StatefulSets
        </button>
        <button 
          class="tab-button ${this.activeWorkloadTab === 'daemonsets' ? 'active' : ''}"
          @click=${() => this.handleWorkloadTabClick('daemonsets')}
        >
          DaemonSets
        </button>
        <button 
          class="tab-button ${this.activeWorkloadTab === 'jobs' ? 'active' : ''}"
          @click=${() => this.handleWorkloadTabClick('jobs')}
        >
          Jobs
        </button>
        <button 
          class="tab-button ${this.activeWorkloadTab === 'cronjobs' ? 'active' : ''}"
          @click=${() => this.handleWorkloadTabClick('cronjobs')}
        >
          CronJobs
        </button>
      </div>
    `;
  }

  private renderNetworkTabs() {
    return html`
      <div class="tab-header">
        <button 
          class="tab-button ${this.activeNetworkTab === 'services' ? 'active' : ''}"
          @click=${() => this.handleNetworkTabClick('services')}
        >
          Services
        </button>
        <button 
          class="tab-button ${this.activeNetworkTab === 'ingresses' ? 'active' : ''}"
          @click=${() => this.handleNetworkTabClick('ingresses')}
        >
          Ingresses
        </button>
        <button 
          class="tab-button ${this.activeNetworkTab === 'ingressclasses' ? 'active' : ''}"
          @click=${() => this.handleNetworkTabClick('ingressclasses')}
        >
          IngressClasses
        </button>
        <button 
          class="tab-button ${this.activeNetworkTab === 'networkpolicies' ? 'active' : ''}"
          @click=${() => this.handleNetworkTabClick('networkpolicies')}
        >
          NetworkPolicies
        </button>
      </div>
    `;
  }

  private renderStorageTabs() {
    return html`
      <div class="tab-header">
        <button 
          class="tab-button ${this.activeStorageTab === 'pvc' ? 'active' : ''}"
          @click=${() => this.handleStorageTabClick('pvc')}
        >
          PVC
        </button>
        <button 
          class="tab-button ${this.activeStorageTab === 'pv' ? 'active' : ''}"
          @click=${() => this.handleStorageTabClick('pv')}
        >
          PV
        </button>
      </div>
    `;
  }

  private renderConfigurationTabs() {
    return html`
      <div class="tab-header">
        <button 
          class="tab-button ${this.activeConfigurationTab === 'secrets' ? 'active' : ''}"
          @click=${() => this.handleConfigurationTabClick('secrets')}
        >
          Secrets
        </button>
        <button 
          class="tab-button ${this.activeConfigurationTab === 'configmap' ? 'active' : ''}"
          @click=${() => this.handleConfigurationTabClick('configmap')}
        >
          ConfigMap
        </button>
      </div>
    `;
  }

  private renderHelmTabs() {
    return html`
      <div class="tab-header">
        <button 
          class="tab-button ${this.activeHelmTab === 'releases' ? 'active' : ''}"
          @click=${() => this.handleHelmTabClick('releases')}
        >
          Releases
        </button>
        <button 
          class="tab-button ${this.activeHelmTab === 'charts' ? 'active' : ''}"
          @click=${() => this.handleHelmTabClick('charts')}
        >
          Charts
        </button>
      </div>
    `;
  }
  renderPodDetailsDrawer() {
    if (!this.showPodDetails) {
      return null;
    }

    if (this.loadingPodDetails) {
      return html`
        <div class="pod-details-drawer">
          <button class="close-button" @click="${() => this.showPodDetails = false}">×</button>
          <h2>Pod Details</h2>
          <div class="loading-state">Loading pod details...</div>
        </div>
      `;
    }

    return html`
      <div class="pod-details-drawer">
        <button class="close-button" @click="${() => this.showPodDetails = false}">×</button>
        <h2>Pod Details</h2>
        <div class="pod-details-content">
          ${this.renderPodDetailContent(this.selectedPod)}
        </div>
      </div>
    `;
  }

  renderCrdDetailsDrawer() {
    if (!this.showCrdDetails) {
      return null;
    }

    if (this.loadingCrdDetails) {
      return html`
        <div class="pod-details-drawer crd-details-drawer">
          <button class="close-button" @click="${() => this.showCrdDetails = false}">×</button>
          <h2>CRD Details</h2>
          <div class="loading-state">Loading CRD details...</div>
        </div>
      `;
    }

    return html`
      <div class="pod-details-drawer crd-details-drawer">
        <button class="close-button" @click="${() => this.showCrdDetails = false}">×</button>
        <h2>CRD Details</h2>
        <div class="pod-details-content">
          ${this.renderCrdDetailContent(this.selectedCrd)}
        </div>
      </div>
    `;
  }

  renderDeploymentDetailsDrawer() {
    if (!this.showDeploymentDetails) {
      return null;
    }

    if (this.loadingDeploymentDetails) {
      return html`
        <div class="pod-details-drawer crd-details-drawer">
          <button class="close-button" @click="${() => this.showDeploymentDetails = false}">×</button>
          <h2>Deployment Details</h2>
          <div class="loading-state">Loading deployment details...</div>
        </div>
      `;
    }

    return html`
      <div class="pod-details-drawer crd-details-drawer">
        <button class="close-button" @click="${() => this.showDeploymentDetails = false}">×</button>
        <h2>Deployment Details</h2>
        <div class="pod-details-content">
          ${this.renderDeploymentDetailContent(this.selectedDeployment)}
        </div>
      </div>
    `;
  }

  renderStatefulSetDetailsDrawer() {
    if (!this.showStatefulSetDetails) {
      return null;
    }

    if (this.loadingStatefulSetDetails) {
      return html`
        <div class="pod-details-drawer">
          <button class="close-button" @click="${() => this.showStatefulSetDetails = false}">×</button>
          <h2>StatefulSet Details</h2>
          <div class="loading-state">Loading statefulset details...</div>
        </div>
      `;
    }

    return html`
      <div class="pod-details-drawer">
        <button class="close-button" @click="${() => this.showStatefulSetDetails = false}">×</button>
        <h2>StatefulSet Details</h2>
        <div class="pod-details-content">
          ${this.renderStatefulSetDetailContent(this.selectedStatefulSet)}
        </div>
      </div>
    `;
  }

  renderDaemonSetDetailsDrawer() {
    if (!this.showDaemonSetDetails) {
      return null;
    }

    if (this.loadingDaemonSetDetails) {
      return html`
        <div class="pod-details-drawer">
          <button class="close-button" @click="${() => this.showDaemonSetDetails = false}">×</button>
          <h2>DaemonSet Details</h2>
          <div class="loading-state">Loading daemonset details...</div>
        </div>
      `;
    }

    return html`
      <div class="pod-details-drawer">
        <button class="close-button" @click="${() => this.showDaemonSetDetails = false}">×</button>
        <h2>DaemonSet Details</h2>
        <div class="pod-details-content">
          ${this.renderDaemonSetDetailContent(this.selectedDaemonSet)}
        </div>
      </div>
    `;
  }

  renderJobDetailsDrawer() {
    if (!this.showJobDetails) {
      return null;
    }

    if (this.loadingJobDetails) {
      return html`
        <div class="pod-details-drawer">
          <button class="close-button" @click="${() => this.showJobDetails = false}">×</button>
          <h2>Job Details</h2>
          <div class="loading-state">Loading job details...</div>
        </div>
      `;
    }

    return html`
      <div class="pod-details-drawer">
        <button class="close-button" @click="${() => this.showJobDetails = false}">×</button>
        <h2>Job Details</h2>
        <div class="pod-details-content">
          ${this.renderJobDetailContent(this.selectedJob)}
        </div>
      </div>
    `;
  }

  renderCronJobDetailsDrawer() {
    if (!this.showCronJobDetails) {
      return null;
    }

    if (this.loadingCronJobDetails) {
      return html`
        <div class="pod-details-drawer">
          <button class="close-button" @click="${() => this.showCronJobDetails = false}">×</button>
          <h2>CronJob Details</h2>
          <div class="loading-state">Loading cronjob details...</div>
        </div>
      `;
    }

    return html`
      <div class="pod-details-drawer">
        <button class="close-button" @click="${() => this.showCronJobDetails = false}">×</button>
        <h2>CronJob Details</h2>
        <div class="pod-details-content">
          ${this.renderCronJobDetailContent(this.selectedCronJob)}
        </div>
      </div>
    `;
  }

  renderPvcDetailsDrawer() {
    if (!this.showPvcDetails) {
      return null;
    }

    if (this.loadingPvcDetails) {
      return html`
        <div class="pod-details-drawer">
          <button class="close-button" @click="${() => this.showPvcDetails = false}">×</button>
          <h2>PVC Details</h2>
          <div class="loading-state">Loading PVC details...</div>
        </div>
      `;
    }

    return html`
      <div class="pod-details-drawer">
        <button class="close-button" @click="${() => this.showPvcDetails = false}">×</button>
        <h2>PVC Details</h2>
        <div class="pod-details-content">
          ${this.renderPvcDetailContent(this.selectedPvc)}
        </div>
      </div>
    `;
  }

  renderPvDetailsDrawer() {
    if (!this.showPvDetails) {
      return null;
    }

    if (this.loadingPvDetails) {
      return html`
        <div class="pod-details-drawer">
          <button class="close-button" @click="${() => this.showPvDetails = false}">×</button>
          <h2>PV Details</h2>
          <div class="loading-state">Loading PV details...</div>
        </div>
      `;
    }

    return html`
      <div class="pod-details-drawer">
        <button class="close-button" @click="${() => this.showPvDetails = false}">×</button>
        <h2>PV Details</h2>
        <div class="pod-details-content">
          ${this.renderPvDetailContent(this.selectedPv)}
        </div>
      </div>
    `;
  }

  renderSecretDetailsDrawer() {
    if (!this.showSecretDetails) {
      return null;
    }

    if (this.loadingSecretDetails) {
      return html`
        <div class="pod-details-drawer">
          <button class="close-button" @click="${() => this.showSecretDetails = false}">×</button>
          <h2>Secret Details</h2>
          <div class="loading-state">Loading secret details...</div>
        </div>
      `;
    }

    return html`
      <div class="pod-details-drawer">
        <button class="close-button" @click="${() => this.showSecretDetails = false}">×</button>
        <h2>Secret Details</h2>
        <div class="pod-details-content">
          ${this.renderSecretDetailContent(this.selectedSecret)}
        </div>
      </div>
    `;
  }

  renderConfigMapDetailsDrawer() {
    if (!this.showConfigMapDetails) {
      return null;
    }

    if (this.loadingConfigMapDetails) {
      return html`
        <div class="pod-details-drawer">
          <button class="close-button" @click="${() => this.showConfigMapDetails = false}">×</button>
          <h2>ConfigMap Details</h2>
          <div class="loading-state">Loading configmap details...</div>
        </div>
      `;
    }

    return html`
      <div class="pod-details-drawer">
        <button class="close-button" @click="${() => this.showConfigMapDetails = false}">×</button>
        <h2>ConfigMap Details</h2>
        <div class="pod-details-content">
          ${this.renderConfigMapDetailContent(this.selectedConfigMap)}
        </div>
      </div>
    `;
  }

  renderNodeDetailsDrawer() {
    if (!this.showNodeDetails) {
      return null;
    }

    if (this.loadingNodeDetails) {
      return html`
        <div class="pod-details-drawer">
          <button class="close-button" @click="${() => this.showNodeDetails = false}">×</button>
          <h2>Node Details</h2>
          <div class="loading-state">Loading node details...</div>
        </div>
      `;
    }

    return html`
      <div class="pod-details-drawer">
        <button class="close-button" @click="${() => this.showNodeDetails = false}">×</button>
        <h2>Node Details</h2>
        <div class="pod-details-content">
          ${this.renderNodeDetailContent(this.selectedNode)}
        </div>
      </div>
    `;
  }

renderDaemonSetDetailContent(data: any) {
    if (!data) {
      return html`<div class="no-data">No data available</div>`;
    }

    const daemonSetData = data.daemonset_detail || data;

    console.log('Processing daemon set data:', daemonSetData);

    return html`
      <div class="detail-sections">
        <!-- Basic Information -->
        <div class="detail-section">
          <h3>Basic Information</h3>
          ${this.renderDetailItem('Name', daemonSetData.metadata.name)}
          ${this.renderDetailItem('Namespace', daemonSetData.metadata.namespace)}
          ${this.renderDetailItem('UID', daemonSetData.metadata.uid)}
          ${this.renderDetailItem('Resource Version', daemonSetData.metadata.resourceVersion)}
          ${this.renderDetailItem('Creation Timestamp', daemonSetData.metadata.creationTimestamp)}
        </div>

<!-- Status Information -->
        <div class="detail-section">
          <h3>Status</h3>
          ${this.renderDetailItem('Current Number Scheduled', daemonSetData.status.currentNumberScheduled)}
          ${this.renderDetailItem('Number Ready', daemonSetData.status.numberReady)}
          ${this.renderDetailItem('Desired Number Scheduled', daemonSetData.status.desiredNumberScheduled)}
          ${this.renderDetailItem('Number Misscheduled', daemonSetData.status.numberMisscheduled)}
        </div>

        <!-- Update Strategy -->
        ${daemonSetData.spec.updateStrategy ? html`
          <div class="detail-section">
            <h3>Update Strategy</h3>
            ${this.renderDetailItem('Type', daemonSetData.spec.updateStrategy.type)}
            ${daemonSetData.spec.updateStrategy.rollingUpdate ? html`
              <div class="detail-item nested">
                <strong class="detail-key">Rolling Update:</strong>
                <div class="nested-content">
                  ${this.renderDetailItem('Max Unavailable', daemonSetData.spec.updateStrategy.rollingUpdate.maxUnavailable)}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Selector -->
        ${daemonSetData.spec.selector ? html`
          <div class="detail-section">
            <h3>Selector</h3>
            ${this.renderDetailItem('Match Labels', daemonSetData.spec.selector.matchLabels, true)}
          </div>
        ` : ''}

        <!-- Labels -->
        ${daemonSetData.metadata.labels && Object.keys(daemonSetData.metadata.labels).length > 0 ? html`
          <div class="detail-section">
            <h3>Labels</h3>
            ${this.renderObjectAsKeyValue(daemonSetData.metadata.labels)}
          </div>
        ` : ''}

        <!-- Annotations -->
        ${daemonSetData.metadata.annotations && Object.keys(daemonSetData.metadata.annotations).length > 0 ? html`
          <div class="detail-section">
            <h3>Annotations</h3>
            ${this.renderObjectAsKeyValue(daemonSetData.metadata.annotations)}
          </div>
        ` : ''}

        <!-- Template -->
        ${daemonSetData.spec.template ? html`
          <div class="detail-section">
            <h3>Pod Template</h3>
            ${daemonSetData.spec.template.metadata?.labels ? 
              this.renderDetailItem('Pod Labels', daemonSetData.spec.template.metadata.labels, true) : ''}
            ${daemonSetData.spec.template.spec?.containers && daemonSetData.spec.template.spec.containers.length > 0 ? html`
              <div class="detail-item nested">
                <strong class="detail-key">Containers:</strong>
                <div class="nested-content">
                  ${daemonSetData.spec.template.spec.containers.map((container: any, index: number) => html`
                    <div class="detail-item nested">
                      <strong class="detail-key">Container ${index + 1}:</strong>
                      <div class="nested-content">
                        ${this.renderDetailItem('Name', container.name)}
                        ${this.renderDetailItem('Image', container.image)}
                        ${container.ports && container.ports.length > 0 ? 
                          this.renderDetailItem('Ports', container.ports.map((p: any) => `${p.containerPort}/${p.protocol || 'TCP'}`).join(', ')) : ''}
                        ${container.env && container.env.length > 0 ? 
                          this.renderDetailItem('Environment Variables', `${container.env.length} variables`) : ''}
                        ${container.resources ? this.renderDetailItem('Resources', container.resources, true) : ''}
                      </div>
                    </div>
                  `)}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Conditions -->
        ${daemonSetData.status.conditions && daemonSetData.status.conditions.length > 0 ? html`
          <div class="detail-section">
            <h3>Conditions</h3>
            ${daemonSetData.status.conditions.map((condition: any) => html`
              <div class="detail-item nested">
                <strong class="detail-key">${condition.type}:</strong>
                <div class="nested-content">
                  ${this.renderDetailItem('Status', condition.status)}
                  ${this.renderDetailItem('Last Update Time', condition.lastUpdateTime)}
                  ${this.renderDetailItem('Last Transition Time', condition.lastTransitionTime)}
                  ${this.renderDetailItem('Reason', condition.reason)}
                  ${this.renderDetailItem('Message', condition.message)}
                </div>
              </div>
            `)};
          </div>
        ` : ''}

        <!-- Raw Data -->
        <div class="detail-section">
          <h3>Raw Data</h3>
          <details>
            <summary>View raw daemonset data</summary>
            <pre class="raw-data">${JSON.stringify(daemonSetData, null, 2)}</pre>
          </details>
        </div>
      </div>
    `;
  }

renderJobDetailContent(data: any) {
    if (!data) {
      return html`<div class="no-data">No data available</div>`;
    }

    const jobData = data.job_detail || data;

    console.log('Processing job data:', jobData);

    return html`
      <div class="detail-sections">
        <!-- Basic Information -->
        <div class="detail-section">
          <h3>Basic Information</h3>
          ${this.renderDetailItem('Name', jobData.metadata.name)}
          ${this.renderDetailItem('Namespace', jobData.metadata.namespace)}
          ${this.renderDetailItem('UID', jobData.metadata.uid)}
          ${this.renderDetailItem('Resource Version', jobData.metadata.resourceVersion)}
          ${this.renderDetailItem('Creation Timestamp', jobData.metadata.creationTimestamp)}
        </div>

<!-- Status Information -->
        <div class="detail-section">
          <h3>Status</h3>
          ${this.renderDetailItem('Succeeded', jobData.status.succeeded)}
          ${this.renderDetailItem('Failed', jobData.status.failed)}
          ${this.renderDetailItem('Active', jobData.status.active)}
          ${this.renderDetailItem('Start Time', jobData.status.startTime)}
          ${this.renderDetailItem('Completion Time', jobData.status.completionTime)}
        </div>

        <!-- Job Spec -->
        ${jobData.spec ? html`
          <div class="detail-section">
            <h3>Specification</h3>
            ${this.renderDetailItem('Parallelism', jobData.spec.parallelism)}
            ${this.renderDetailItem('Completions', jobData.spec.completions)}
            ${this.renderDetailItem('Active Deadline Seconds', jobData.spec.activeDeadlineSeconds)}
            ${this.renderDetailItem('Backoff Limit', jobData.spec.backoffLimit)}
            ${this.renderDetailItem('TTL Seconds After Finished', jobData.spec.ttlSecondsAfterFinished)}
          </div>
        ` : ''}

        <!-- Selector -->
        ${jobData.spec?.selector ? html`
          <div class="detail-section">
            <h3>Selector</h3>
            ${this.renderDetailItem('Match Labels', jobData.spec.selector.matchLabels, true)}
          </div>
        ` : ''}

        <!-- Labels -->
        ${jobData.metadata.labels && Object.keys(jobData.metadata.labels).length > 0 ? html`
          <div class="detail-section">
            <h3>Labels</h3>
            ${this.renderObjectAsKeyValue(jobData.metadata.labels)}
          </div>
        ` : ''}

        <!-- Annotations -->
        ${jobData.metadata.annotations && Object.keys(jobData.metadata.annotations).length > 0 ? html`
          <div class="detail-section">
            <h3>Annotations</h3>
            ${this.renderObjectAsKeyValue(jobData.metadata.annotations)}
          </div>
        ` : ''}

        <!-- Template -->
        ${jobData.spec?.template ? html`
          <div class="detail-section">
            <h3>Pod Template</h3>
            ${jobData.spec.template.metadata?.labels ? 
              this.renderDetailItem('Pod Labels', jobData.spec.template.metadata.labels, true) : ''}
            ${jobData.spec.template.spec?.containers && jobData.spec.template.spec.containers.length > 0 ? html`
              <div class="detail-item nested">
                <strong class="detail-key">Containers:</strong>
                <div class="nested-content">
                  ${jobData.spec.template.spec.containers.map((container: any, index: number) => html`
                    <div class="detail-item nested">
                      <strong class="detail-key">Container ${index + 1}:</strong>
                      <div class="nested-content">
                        ${this.renderDetailItem('Name', container.name)}
                        ${this.renderDetailItem('Image', container.image)}
                        ${container.ports && container.ports.length > 0 ? 
                          this.renderDetailItem('Ports', container.ports.map((p: any) => `${p.containerPort}/${p.protocol || 'TCP'}`).join(', ')) : ''}
                        ${container.env && container.env.length > 0 ? 
                          this.renderDetailItem('Environment Variables', `${container.env.length} variables`) : ''}
                        ${container.resources ? this.renderDetailItem('Resources', container.resources, true) : ''}
                      </div>
                    </div>
                  `)}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Conditions -->
        ${jobData.status?.conditions && jobData.status.conditions.length > 0 ? html`
          <div class="detail-section">
            <h3>Conditions</h3>
            ${jobData.status.conditions.map((condition: any) => html`
              <div class="detail-item nested">
                <strong class="detail-key">${condition.type}:</strong>
                <div class="nested-content">
                  ${this.renderDetailItem('Status', condition.status)}
                  ${this.renderDetailItem('Last Update Time', condition.lastUpdateTime)}
                  ${this.renderDetailItem('Last Transition Time', condition.lastTransitionTime)}
                  ${this.renderDetailItem('Reason', condition.reason)}
                  ${this.renderDetailItem('Message', condition.message)}
                </div>
              </div>
            `)};
          </div>
        ` : ''}

        <!-- Raw Data -->
        <div class="detail-section">
          <h3>Raw Data</h3>
          <details>
            <summary>View raw job data</summary>
            <pre class="raw-data">${JSON.stringify(jobData, null, 2)}</pre>
          </details>
        </div>
      </div>
    `;
  }

  renderCrdDetailContent(data: any) {
    if (!data) {
      return html`<div class="no-data">No data available</div>`;
    }

    // Handle the actual API response structure where data might be under 'crd_detail' key
    const crdData = data.crd_detail || data;
    
    console.log('Processing CRD data:', crdData);

    return html`
      <div class="detail-sections">
        <div class="detail-section">
          <h3>Basic Information</h3>
          ${this.renderDetailItem('Name', crdData.name)}
          ${this.renderDetailItem('Group', crdData.group)}
          ${this.renderDetailItem('Version', crdData.version)}
          ${this.renderDetailItem('Kind', crdData.kind)}
          ${this.renderDetailItem('Scope', crdData.scope)}
          ${this.renderDetailItem('Creation Timestamp', crdData.creationTimestamp)}
          ${crdData.age ? this.renderDetailItem('Age', crdData.age) : ''}
          ${crdData.uid ? this.renderDetailItem('UID', crdData.uid) : ''}
          ${crdData.resourceVersion ? this.renderDetailItem('Resource Version', crdData.resourceVersion) : ''}
        </div>

        <!-- Names Section -->
        ${crdData.names ? html`
          <div class="detail-section">
            <h3>Names</h3>
            ${typeof crdData.names === 'object' && crdData.names !== null ? 
              html`${this.renderObjectAsKeyValue(crdData.names)}` : 
              html`<div class="detail-item"><span class="detail-key">Names:</span> <span class="detail-value">${crdData.names || 'N/A'}</span></div>`
            }
          </div>
        ` : ''}

        <!-- Specification Section (if available) -->
        ${crdData.spec ? html`
        <div class="detail-section">
          <h3>Specification</h3>
          ${this.renderDetailItem('Group', crdData.spec.group)}
          ${this.renderDetailItem('Scope', crdData.spec.scope)}
          ${crdData.spec.names ? this.renderDetailItem('Names', crdData.spec.names, true) : ''}
          ${crdData.spec.versions ? this.renderDetailItem('Versions', crdData.spec.versions, true) : ''}
        </div>` : ''}

        <!-- Status Section (if available) -->
        ${crdData.status ? html`
          <div class="detail-section">
            <h3>Status</h3>
            ${crdData.status.acceptedNames ? this.renderDetailItem('Accepted Names', crdData.status.acceptedNames, true) : ''}
            ${crdData.status.storedVersions ? this.renderDetailItem('Stored Versions', crdData.status.storedVersions, true) : ''}
            ${crdData.status.conditions ? this.renderDetailItem('Conditions', crdData.status.conditions, true) : ''}
          </div>
        ` : ''}
        
        <!-- Labels Section -->
        ${crdData.labels && Object.keys(crdData.labels).length > 0 ? html`
          <div class="detail-section">
            <h3>Labels</h3>
            ${this.renderObjectAsKeyValue(crdData.labels)}
          </div>
        ` : html`
          <div class="detail-section">
            <h3>Labels</h3>
            <div class="detail-item"><span class="detail-value">No labels</span></div>
          </div>
        `}

        <!-- Annotations Section (if available) -->
        ${crdData.annotations && Object.keys(crdData.annotations).length > 0 ? html`
          <div class="detail-section">
            <h3>Annotations</h3>
            ${this.renderObjectAsKeyValue(crdData.annotations)}
          </div>
        ` : ''}

        <!-- Raw Data Section for debugging and completeness -->
        <div class="detail-section">
          <h3>Raw Data</h3>
          <details>
            <summary>View raw CRD data</summary>
            <pre class="raw-data">${JSON.stringify(crdData, null, 2)}</pre>
          </details>
        </div>
      </div>
    `;
  }

renderDeploymentDetailContent(data: any) {
    if (!data) {
      return html`<div class="no-data">No data available</div>`;
    }

    const deploymentData = data.deployment_detail || data;

    console.log('Processing deployment data:', deploymentData);

    return html`
      <div class="detail-sections">
        <!-- Basic Information -->
        <div class="detail-section">
          <h3>Basic Information</h3>
          ${this.renderDetailItem('Name', deploymentData.metadata.name)}
          ${this.renderDetailItem('Namespace', deploymentData.metadata.namespace)}
          ${this.renderDetailItem('UID', deploymentData.metadata.uid)}
          ${this.renderDetailItem('Resource Version', deploymentData.metadata.resourceVersion)}
          ${this.renderDetailItem('Creation Timestamp', deploymentData.metadata.creationTimestamp)}
        </div>

        <!-- Status Information -->
        <div class="detail-section">
          <h3>Status</h3>
          ${this.renderDetailItem('Replicas', deploymentData.status.replicas)}
          ${this.renderDetailItem('Updated Replicas', deploymentData.status.updatedReplicas)}
          ${this.renderDetailItem('Ready Replicas', deploymentData.status.readyReplicas)}
          ${this.renderDetailItem('Unavailable Replicas', deploymentData.status.unavailableReplicas)}
        </div>

        <!-- Strategy -->
        ${deploymentData.spec.strategy ? html`
          <div class="detail-section">
            <h3>Strategy</h3>
            ${this.renderDetailItem('Type', deploymentData.spec.strategy.type)}
            ${deploymentData.spec.strategy.rollingUpdate ? html`
              <div class="detail-item nested">
                <strong class="detail-key">Rolling Update:</strong>
                <div class="nested-content">
                  ${this.renderDetailItem('Max Surge', deploymentData.spec.strategy.rollingUpdate.maxSurge)}
                  ${this.renderDetailItem('Max Unavailable', deploymentData.spec.strategy.rollingUpdate.maxUnavailable)}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Selector -->
        ${deploymentData.spec.selector ? html`
          <div class="detail-section">
            <h3>Selector</h3>
            ${this.renderDetailItem('Match Labels', deploymentData.spec.selector.matchLabels, true)}
          </div>
        ` : ''}

        <!-- Labels -->
        ${deploymentData.metadata.labels ? html`
          <div class="detail-section">
            <h3>Labels</h3>
            ${this.renderObjectAsKeyValue(deploymentData.metadata.labels)}
          </div>
        ` : ''}

        <!-- Annotations -->
        ${deploymentData.metadata.annotations ? html`
          <div class="detail-section">
            <h3>Annotations</h3>
            ${this.renderObjectAsKeyValue(deploymentData.metadata.annotations)}
          </div>
        ` : ''}

        <!-- Pod Template -->
        ${deploymentData.spec.template ? html`
          <div class="detail-section">
            <h3>Pod Template</h3>
            ${deploymentData.spec.template.metadata?.labels ? 
              this.renderDetailItem('Pod Labels', deploymentData.spec.template.metadata.labels, true) : ''}
            ${deploymentData.spec.template.spec?.containers ? html`
              ${deploymentData.spec.template.spec.containers.map((container: any) => html`
                <div class="detail-item nested">
                  <strong class="detail-key">Container:</strong>
                  <div class="nested-content">
                    ${this.renderDetailItem('Name', container.name)}
                    ${this.renderDetailItem('Image', container.image)}
                  </div>
                </div>
              `)}
            ` : ''}
          </div>
        ` : ''}

        <!-- Conditions -->
        ${deploymentData.status.conditions ? html`
          <div class="detail-section">
            <h3>Conditions</h3>
            ${deploymentData.status.conditions.map((condition: any) => html`
              <div class="detail-item nested">
                <strong class="detail-key">${condition.type}:</strong>
                <div class="nested-content">
                  ${this.renderDetailItem('Status', condition.status)}
                  ${this.renderDetailItem('Last Probe Time', condition.lastProbeTime)}
                  ${this.renderDetailItem('Last Transition Time', condition.lastTransitionTime)}
                  ${this.renderDetailItem('Reason', condition.reason)}
                  ${this.renderDetailItem('Message', condition.message)}
                </div>
              </div>
            `)}
          </div>
        ` : ''}

        <!-- Raw Data -->
        <div class="detail-section">
          <h3>Raw Data</h3>
          <details>
            <summary>View raw deployment data</summary>
            <pre class="raw-data">${JSON.stringify(deploymentData, null, 2)}</pre>
          </details>
        </div>
      </div>
    `;
  }
  
renderStatefulSetDetailContent(data: any) {
    if (!data) {
      return html`<div class="no-data">No data available</div>`;
    }

    const statefulSetData = data.statefulset_detail || data;

    console.log('Processing stateful set data:', statefulSetData);

    return html`
      <div class="detail-sections">
        <!-- Basic Information -->
        <div class="detail-section">
          <h3>Basic Information</h3>
          ${this.renderDetailItem('Name', statefulSetData.metadata.name)}
          ${this.renderDetailItem('Namespace', statefulSetData.metadata.namespace)}
          ${this.renderDetailItem('UID', statefulSetData.metadata.uid)}
          ${this.renderDetailItem('Resource Version', statefulSetData.metadata.resourceVersion)}
          ${this.renderDetailItem('Creation Timestamp', statefulSetData.metadata.creationTimestamp)}
        </div>

        <!-- Status Information -->
        <div class="detail-section">
          <h3>Status</h3>
          ${this.renderDetailItem('Replicas', statefulSetData.status.replicas)}
          ${this.renderDetailItem('Ready Replicas', statefulSetData.status.readyReplicas)}
          ${this.renderDetailItem('Current Replicas', statefulSetData.status.currentReplicas)}
          ${this.renderDetailItem('Updated Replicas', statefulSetData.status.updatedReplicas)}
        </div>

        <!-- Update Strategy -->
        ${statefulSetData.spec.updateStrategy ? html`
          <div class="detail-section">
            <h3>Update Strategy</h3>
            ${this.renderDetailItem('Type', statefulSetData.spec.updateStrategy.type)}
            ${statefulSetData.spec.updateStrategy.rollingUpdate ? html`
              <div class="detail-item nested">
                <strong class="detail-key">Rolling Update:</strong>
                <div class="nested-content">
                  ${this.renderDetailItem('Partition', statefulSetData.spec.updateStrategy.rollingUpdate.partition)}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Labels -->
        ${statefulSetData.metadata.labels ? html`
          <div class="detail-section">
            <h3>Labels</h3>
            ${this.renderObjectAsKeyValue(statefulSetData.metadata.labels)}
          </div>
        ` : ''}

        <!-- Annotations -->
        ${statefulSetData.metadata.annotations ? html`
          <div class="detail-section">
            <h3>Annotations</h3>
            ${this.renderObjectAsKeyValue(statefulSetData.metadata.annotations)}
          </div>
        ` : ''}

        <!-- Pod Template -->
        ${statefulSetData.spec.template ? html`
          <div class="detail-section">
            <h3>Pod Template</h3>
            ${statefulSetData.spec.template.metadata?.labels ? 
              this.renderDetailItem('Pod Labels', statefulSetData.spec.template.metadata.labels, true) : ''}
            ${statefulSetData.spec.template.spec?.containers ? html`
              ${statefulSetData.spec.template.spec.containers.map((container: any) => html`
                <div class="detail-item nested">
                  <strong class="detail-key">Container:</strong>
                  <div class="nested-content">
                    ${this.renderDetailItem('Name', container.name)}
                    ${this.renderDetailItem('Image', container.image)}
                  </div>
                </div>
              `)}
            ` : ''}
          </div>
        ` : ''}

        <!-- Raw Data -->
        <div class="detail-section">
          <h3>Raw Data</h3>
          <details>
            <summary>View raw stateful set data</summary>
            <pre class="raw-data">${JSON.stringify(statefulSetData, null, 2)}</pre>
          </details>
        </div>
      </div>
    `;
  }

renderPodDetailContent(data: any) {
    if (!data) {
      return html`<div class="no-data">No data available</div>`;
    }

    const podData = data.pod_detail || data;
    
    console.log('Processing pod data:', podData);

    return html`
      <div class="detail-sections">
        <!-- Basic Information -->
        <div class="detail-section">
          <h3>Basic Information</h3>
          ${this.renderDetailItem('Name', podData.metadata.name)}
          ${this.renderDetailItem('Namespace', podData.metadata.namespace)}
          ${this.renderDetailItem('UID', podData.metadata.uid)}
          ${this.renderDetailItem('Resource Version', podData.metadata.resourceVersion)}
          ${this.renderDetailItem('Creation Timestamp', podData.metadata.creationTimestamp)}
          ${this.renderDetailItem('Age', podData.metadata.creationTimestamp)}
        </div>

        <!-- Status Information -->
        <div class="detail-section">
          <h3>Status</h3>
          ${this.renderDetailItem('Phase', podData.status.phase)}
          ${this.renderDetailItem('QoS Class', podData.status.qosClass)}
          ${this.renderDetailItem('Start Time', podData.status.startTime)}
        </div>

        <!-- Network Information -->
        <div class="detail-section">
          <h3>Network</h3>
          ${this.renderDetailItem('Pod IP', podData.status.podIP)}
          ${this.renderDetailItem('Host IP', podData.status.hostIP)}
          ${this.renderDetailItem('Node', podData.spec.nodeName)}
        </div>

        <!-- Configuration -->
        <div class="detail-section">
          <h3>Configuration</h3>
          ${this.renderDetailItem('Restart Policy', podData.spec.restartPolicy)}
          ${this.renderDetailItem('DNS Policy', podData.spec.dnsPolicy)}
          ${this.renderDetailItem('Service Account', podData.spec.serviceAccountName)}
          ${this.renderDetailItem('Node Selector', podData.spec.nodeSelector, true)}
        </div>

        <!-- Labels -->
        ${podData.metadata.labels ? html`
          <div class="detail-section">
            <h3>Labels</h3>
            ${this.renderObjectAsKeyValue(podData.metadata.labels)}
          </div>
        ` : ''}

        <!-- Annotations -->
        ${podData.metadata.annotations ? html`
          <div class="detail-section">
            <h3>Annotations</h3>
            ${this.renderObjectAsKeyValue(podData.metadata.annotations)}
          </div>
        ` : ''}

        <!-- Containers -->
        ${podData.spec.containers && podData.spec.containers.length > 0 ? html`
          <div class="detail-section">
            <h3>Containers</h3>
            ${podData.spec.containers.map((container: any, index: number) => html`
              <div class="detail-item nested">
                <strong class="detail-key">Container ${index + 1}:</strong>
                <div class="nested-content">
                  ${this.renderDetailItem('Name', container.name)}
                  ${this.renderDetailItem('Image', container.image)}
                  ${this.renderDetailItem('Ready', container.ready)}
                  ${this.renderDetailItem('Restart Count', container.restartCount)}
                  ${this.renderDetailItem('State', container.state?.running?.startedAt)}
                </div>
              </div>
            `)}
          </div>
        ` : ''}

        <!-- Conditions -->
          ${podData.status.conditions && podData.status.conditions.length > 0 ? html`
          <div class="detail-section">
            <h3>Conditions</h3>
            ${podData.status.conditions.map((condition: any) => html`
              <div class="detail-item nested">
                <strong class="detail-key">${condition.type}:</strong>
                <div class="nested-content">
                  ${this.renderDetailItem('Status', condition.status)}
                  ${this.renderDetailItem('Last Probe Time', condition.lastProbeTime)}
                  ${this.renderDetailItem('Last Transition Time', condition.lastTransitionTime)}
                  ${this.renderDetailItem('Reason', condition.reason)}
                  ${this.renderDetailItem('Message', condition.message)}
                </div>
              </div>
            `)}
          </div>
        ` : ''}

        <!-- Raw Data -->
        <div class="detail-section">
          <h3>Raw Data</h3>
          <details>
            <summary>View raw pod data</summary>
            <pre class="raw-data">${JSON.stringify(podData, null, 2)}</pre>
          </details>
        </div>
      </div>
    `;
  }

  renderCronJobDetailContent(data: any) {
    if (!data) {
      return html`<div class="no-data">No data available</div>`;
    }

    const cronJobData = data.cronjob_detail || data;

    console.log('Processing cronjob data:', cronJobData);

    return html`
      <div class="detail-sections">
        <!-- Basic Information -->
        <div class="detail-section">
          <h3>Basic Information</h3>
          ${this.renderDetailItem('Name', cronJobData.metadata.name)}
          ${this.renderDetailItem('Namespace', cronJobData.metadata.namespace)}
          ${this.renderDetailItem('UID', cronJobData.metadata.uid)}
          ${this.renderDetailItem('Resource Version', cronJobData.metadata.resourceVersion)}
          ${this.renderDetailItem('Creation Timestamp', cronJobData.metadata.creationTimestamp)}
        </div>

        <!-- Schedule Information -->
        <div class="detail-section">
          <h3>Schedule</h3>
          ${this.renderDetailItem('Schedule', cronJobData.spec.schedule)}
          ${this.renderDetailItem('Concurrency Policy', cronJobData.spec.concurrencyPolicy)}
          ${this.renderDetailItem('Starting Deadline Seconds', cronJobData.spec.startingDeadlineSeconds)}
          ${this.renderDetailItem('Successful Jobs History Limit', cronJobData.spec.successfulJobsHistoryLimit)}
          ${this.renderDetailItem('Failed Jobs History Limit', cronJobData.spec.failedJobsHistoryLimit)}
        </div>

        <!-- Job Spec -->
        ${cronJobData.spec ? html`
          <div class="detail-section">
            <h3>Job Template Specification</h3>
            ${cronJobData.spec.jobTemplate?.spec?.parallelism !== undefined ? this.renderDetailItem('Parallelism', cronJobData.spec.jobTemplate.spec.parallelism) : ''}
            ${cronJobData.spec.jobTemplate?.spec?.completions !== undefined ? this.renderDetailItem('Completions', cronJobData.spec.jobTemplate.spec.completions) : ''}
            ${cronJobData.spec.jobTemplate?.spec?.activeDeadlineSeconds !== undefined ? this.renderDetailItem('Active Deadline Seconds', cronJobData.spec.jobTemplate.spec.activeDeadlineSeconds) : ''}
            ${cronJobData.spec.jobTemplate?.spec?.backoffLimit !== undefined ? this.renderDetailItem('Backoff Limit', cronJobData.spec.jobTemplate.spec.backoffLimit) : ''}
            ${cronJobData.spec.jobTemplate?.spec?.ttlSecondsAfterFinished !== undefined ? this.renderDetailItem('TTL Seconds After Finished', cronJobData.spec.jobTemplate.spec.ttlSecondsAfterFinished) : ''}
          </div>
        ` : ''}

        <!-- Selector -->
        ${cronJobData.spec?.jobTemplate?.spec?.selector ? html`
          <div class="detail-section">
            <h3>Selector</h3>
            ${this.renderDetailItem('Match Labels', cronJobData.spec.jobTemplate.spec.selector.matchLabels, true)}
          </div>
        ` : ''}

        <!-- Labels -->
        ${cronJobData.metadata.labels && Object.keys(cronJobData.metadata.labels).length > 0 ? html`
          <div class="detail-section">
            <h3>Labels</h3>
            ${this.renderObjectAsKeyValue(cronJobData.metadata.labels)}
          </div>
        ` : ''}

        <!-- Annotations -->
        ${cronJobData.metadata.annotations && Object.keys(cronJobData.metadata.annotations).length > 0 ? html`
          <div class="detail-section">
            <h3>Annotations</h3>
            ${this.renderObjectAsKeyValue(cronJobData.metadata.annotations)}
          </div>
        ` : ''}

        <!-- Pod Template -->
        ${cronJobData.spec?.jobTemplate?.spec?.template ? html`
          <div class="detail-section">
            <h3>Pod Template</h3>
            ${cronJobData.spec.jobTemplate.spec.template.metadata?.labels ? 
              this.renderDetailItem('Pod Labels', cronJobData.spec.jobTemplate.spec.template.metadata.labels, true) : ''}
            ${cronJobData.spec.jobTemplate.spec.template.spec?.containers && cronJobData.spec.jobTemplate.spec.template.spec.containers.length > 0 ? html`
              <div class="detail-item nested">
                <strong class="detail-key">Containers:</strong>
                <div class="nested-content">
                  ${cronJobData.spec.jobTemplate.spec.template.spec.containers.map((container: any, index: number) => html`
                    <div class="detail-item nested">
                      <strong class="detail-key">Container ${index + 1}:</strong>
                      <div class="nested-content">
                        ${this.renderDetailItem('Name', container.name)}
                        ${this.renderDetailItem('Image', container.image)}
                        ${container.command && container.command.length > 0 ? 
                          this.renderDetailItem('Command', container.command.join(' ')) : ''}
                        ${container.args && container.args.length > 0 ? 
                          this.renderDetailItem('Args', container.args.join(' ')) : ''}
                        ${container.env && container.env.length > 0 ? 
                          this.renderDetailItem('Environment Variables', `${container.env.length} variables`) : ''}
                        ${container.resources ? this.renderDetailItem('Resources', container.resources, true) : ''}
                      </div>
                    </div>
                  `)}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Conditions -->
        ${cronJobData.status?.conditions && cronJobData.status.conditions.length > 0 ? html`
          <div class="detail-section">
            <h3>Conditions</h3>
            ${cronJobData.status.conditions.map((condition: any) => html`
              <div class="detail-item nested">
                <strong class="detail-key">${condition.type}:</strong>
                <div class="nested-content">
                  ${this.renderDetailItem('Status', condition.status)}
                  ${this.renderDetailItem('Last Probe Time', condition.lastProbeTime)}
                  ${this.renderDetailItem('Last Transition Time', condition.lastTransitionTime)}
                  ${this.renderDetailItem('Reason', condition.reason)}
                  ${this.renderDetailItem('Message', condition.message)}
                </div>
              </div>
            `)};
          </div>
        ` : ''}

        <!-- Raw Data -->
        <div class="detail-section">
          <h3>Raw Data</h3>
          <details>
            <summary>View raw cronjob data</summary>
            <pre class="raw-data">${JSON.stringify(cronJobData, null, 2)}</pre>
          </details>
        </div>
      </div>
    `;
  }


  renderPvcDetailContent(data: any) {
    if (!data) {
      return html`<div class="no-data">No data available</div>`;
    }

    const pvcData = data.pvc_detail || data;

    console.log('Processing PVC data:', pvcData);

    return html`
      <div class="detail-sections">
        <!-- Basic Information -->
        <div class="detail-section">
          <h3>Basic Information</h3>
          ${this.renderDetailItem('Name', pvcData.metadata.name)}
          ${this.renderDetailItem('Namespace', pvcData.metadata.namespace)}
          ${this.renderDetailItem('UID', pvcData.metadata.uid)}
          ${this.renderDetailItem('Resource Version', pvcData.metadata.resourceVersion)}
          ${this.renderDetailItem('Creation Timestamp', pvcData.metadata.creationTimestamp)}
        </div>

        <!-- Status Information -->
        <div class="detail-section">
          <h3>Status</h3>
          ${this.renderDetailItem('Phase', pvcData.status.phase)}
          ${this.renderDetailItem('Access Modes', pvcData.status.accessModes)}
          ${this.renderDetailItem('Capacity', pvcData.status.capacity?.storage)}
        </div>

        <!-- Spec Information -->
        <div class="detail-section">
          <h3>Specification</h3>
          ${this.renderDetailItem('Storage Class', pvcData.spec.storageClassName)}
          ${this.renderDetailItem('Volume Name', pvcData.spec.volumeName)}
          ${this.renderDetailItem('Volume Mode', pvcData.spec.volumeMode)}
          ${this.renderDetailItem('Access Modes', pvcData.spec.accessModes)}
          ${pvcData.spec.resources?.requests ? html`
            <div class="detail-item nested">
              <strong class="detail-key">Resources:</strong>
              <div class="nested-content">
                ${this.renderDetailItem('Storage Request', pvcData.spec.resources.requests.storage)}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Labels -->
        ${pvcData.metadata.labels ? html`
          <div class="detail-section">
            <h3>Labels</h3>
            ${this.renderObjectAsKeyValue(pvcData.metadata.labels)}
          </div>
        ` : ''}

        <!-- Annotations -->
        ${pvcData.metadata.annotations ? html`
          <div class="detail-section">
            <h3>Annotations</h3>
            ${this.renderObjectAsKeyValue(pvcData.metadata.annotations)}
          </div>
        ` : ''}

        <!-- Events (if available) -->
        ${pvcData.events && pvcData.events.length > 0 ? html`
          <div class="detail-section">
            <h3>Events</h3>
            ${pvcData.events.map((event: any) => html`
              <div class="detail-item nested">
                <strong class="detail-key">${event.type}:</strong>
                <div class="nested-content">
                  ${this.renderDetailItem('Reason', event.reason)}
                  ${this.renderDetailItem('Message', event.message)}
                  ${this.renderDetailItem('Time', event.firstTimestamp)}
                  ${this.renderDetailItem('Count', event.count)}
                </div>
              </div>
            `)}
          </div>
        ` : ''}

        <!-- Raw Data -->
        <div class="detail-section">
          <h3>Raw Data</h3>
          <details>
            <summary>View raw PVC data</summary>
            <pre class="raw-data">${JSON.stringify(pvcData, null, 2)}</pre>
          </details>
        </div>
      </div>
    `;
  }

  renderPvDetailContent(data: any) {
    if (!data) {
      return html`<div class="no-data">No data available</div>`;
    }

    const pvData = data.pv_detail || data;

    console.log('Processing PV data:', pvData);

    return html`
      <div class="detail-sections">
        <!-- Basic Information -->
        <div class="detail-section">
          <h3>Basic Information</h3>
          ${this.renderDetailItem('Name', pvData.metadata.name)}
          ${this.renderDetailItem('UID', pvData.metadata.uid)}
          ${this.renderDetailItem('Resource Version', pvData.metadata.resourceVersion)}
          ${this.renderDetailItem('Creation Timestamp', pvData.metadata.creationTimestamp)}
        </div>

        <!-- Status Information -->
        <div class="detail-section">
          <h3>Status</h3>
          ${this.renderDetailItem('Phase', pvData.status.phase)}
          ${this.renderDetailItem('Message', pvData.status.message)}
          ${this.renderDetailItem('Reason', pvData.status.reason)}
        </div>

        <!-- Spec Information -->
        <div class="detail-section">
          <h3>Specification</h3>
          ${this.renderDetailItem('Storage Class', pvData.spec.storageClassName)}
          ${this.renderDetailItem('Capacity', pvData.spec.capacity?.storage)}
          ${this.renderDetailItem('Access Modes', pvData.spec.accessModes)}
          ${this.renderDetailItem('Volume Mode', pvData.spec.volumeMode)}
          ${this.renderDetailItem('Reclaim Policy', pvData.spec.persistentVolumeReclaimPolicy)}
          ${this.renderDetailItem('Mount Options', pvData.spec.mountOptions)}
        </div>

        <!-- Claim Reference (if bound) -->
        ${pvData.spec.claimRef ? html`
          <div class="detail-section">
            <h3>Claim Reference</h3>
            ${this.renderDetailItem('Name', pvData.spec.claimRef.name)}
            ${this.renderDetailItem('Namespace', pvData.spec.claimRef.namespace)}
            ${this.renderDetailItem('UID', pvData.spec.claimRef.uid)}
          </div>
        ` : ''}

        <!-- Storage Source -->
        <div class="detail-section">
          <h3>Storage Source</h3>
          ${pvData.spec.hostPath ? html`
            <div class="detail-item nested">
              <strong class="detail-key">Host Path:</strong>
              <div class="nested-content">
                ${this.renderDetailItem('Path', pvData.spec.hostPath.path)}
                ${this.renderDetailItem('Type', pvData.spec.hostPath.type)}
              </div>
            </div>
          ` : ''}
          ${pvData.spec.nfs ? html`
            <div class="detail-item nested">
              <strong class="detail-key">NFS:</strong>
              <div class="nested-content">
                ${this.renderDetailItem('Server', pvData.spec.nfs.server)}
                ${this.renderDetailItem('Path', pvData.spec.nfs.path)}
                ${this.renderDetailItem('Read Only', pvData.spec.nfs.readOnly)}
              </div>
            </div>
          ` : ''}
          ${pvData.spec.csi ? html`
            <div class="detail-item nested">
              <strong class="detail-key">CSI:</strong>
              <div class="nested-content">
                ${this.renderDetailItem('Driver', pvData.spec.csi.driver)}
                ${this.renderDetailItem('Volume Handle', pvData.spec.csi.volumeHandle)}
                ${this.renderDetailItem('Read Only', pvData.spec.csi.readOnly)}
                ${pvData.spec.csi.volumeAttributes ? 
                  this.renderDetailItem('Volume Attributes', pvData.spec.csi.volumeAttributes, true) : ''}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Labels -->
        ${pvData.metadata.labels ? html`
          <div class="detail-section">
            <h3>Labels</h3>
            ${this.renderObjectAsKeyValue(pvData.metadata.labels)}
          </div>
        ` : ''}

        <!-- Annotations -->
        ${pvData.metadata.annotations ? html`
          <div class="detail-section">
            <h3>Annotations</h3>
            ${this.renderObjectAsKeyValue(pvData.metadata.annotations)}
          </div>
        ` : ''}

        <!-- Raw Data -->
        <div class="detail-section">
          <h3>Raw Data</h3>
          <details>
            <summary>View raw PV data</summary>
            <pre class="raw-data">${JSON.stringify(pvData, null, 2)}</pre>
          </details>
        </div>
      </div>
    `;
  }

  renderSecretDetailContent(data: any) {
    if (!data) {
      return html`<div class="no-data">No data available</div>`;
    }

    const secretData = data.secret_detail || data;

    console.log('Processing secret data:', secretData);

    return html`
      <div class="detail-sections">
        <!-- Basic Information -->
        <div class="detail-section">
          <h3>Basic Information</h3>
          ${this.renderDetailItem('Name', secretData.metadata.name)}
          ${this.renderDetailItem('Namespace', secretData.metadata.namespace)}
          ${this.renderDetailItem('UID', secretData.metadata.uid)}
          ${this.renderDetailItem('Resource Version', secretData.metadata.resourceVersion)}
          ${this.renderDetailItem('Creation Timestamp', secretData.metadata.creationTimestamp)}
        </div>

        <!-- Type and Data -->
        <div class="detail-section">
          <h3>Secret Information</h3>
          ${this.renderDetailItem('Type', secretData.type)}
          ${this.renderDetailItem('Data Keys', secretData.data ? Object.keys(secretData.data).length : 0)}
          ${secretData.data ? html`
            <div class="detail-item nested">
              <strong class="detail-key">Data Fields:</strong>
              <div class="nested-content">
                ${Object.keys(secretData.data).map((key: string) => html`
                  <div class="detail-item">
                    <strong class="detail-key">${key}:</strong>
                    <span class="detail-value">*** (hidden)</span>
                  </div>
                `)}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Labels -->
        ${secretData.metadata.labels ? html`
          <div class="detail-section">
            <h3>Labels</h3>
            ${this.renderObjectAsKeyValue(secretData.metadata.labels)}
          </div>
        ` : ''}

        <!-- Annotations -->
        ${secretData.metadata.annotations ? html`
          <div class="detail-section">
            <h3>Annotations</h3>
            ${this.renderObjectAsKeyValue(secretData.metadata.annotations)}
          </div>
        ` : ''}

        <!-- Immutable Flag -->
        ${secretData.immutable !== undefined ? html`
          <div class="detail-section">
            <h3>Configuration</h3>
            ${this.renderDetailItem('Immutable', secretData.immutable ? 'Yes' : 'No')}
          </div>
        ` : ''}

        <!-- Raw Data (without showing actual secret values) -->
        <div class="detail-section">
          <h3>Raw Data</h3>
          <details>
            <summary>View raw secret metadata (values hidden)</summary>
            <pre class="raw-data">${JSON.stringify({
              ...secretData,
              data: secretData.data ? Object.keys(secretData.data).reduce((acc: any, key: string) => {
                acc[key] = '*** (base64 encoded)';
                return acc;
              }, {}) : {}
            }, null, 2)}</pre>
          </details>
        </div>
      </div>
    `;
  }

  renderConfigMapDetailContent(data: any) {
    if (!data) {
      return html`<div class="no-data">No data available</div>`;
    }

    const configMapData = data.configmap_detail || data;

    console.log('Processing configmap data:', configMapData);

    return html`
      <div class="detail-sections">
        <!-- Basic Information -->
        <div class="detail-section">
          <h3>Basic Information</h3>
          ${this.renderDetailItem('Name', configMapData.metadata.name)}
          ${this.renderDetailItem('Namespace', configMapData.metadata.namespace)}
          ${this.renderDetailItem('UID', configMapData.metadata.uid)}
          ${this.renderDetailItem('Resource Version', configMapData.metadata.resourceVersion)}
          ${this.renderDetailItem('Creation Timestamp', configMapData.metadata.creationTimestamp)}
        </div>

        <!-- Data -->
        ${configMapData.data ? html`
          <div class="detail-section">
            <h3>Data</h3>
            ${this.renderDetailItem('Number of Keys', Object.keys(configMapData.data).length)}
            ${Object.entries(configMapData.data).map(([key, value]) => html`
              <div class="detail-item nested">
                <strong class="detail-key">${key}:</strong>
                <div class="nested-content">
                  <pre class="raw-data" style="margin: 0; max-height: 200px;">${value}</pre>
                </div>
              </div>
            `)}
          </div>
        ` : ''}

        <!-- Binary Data -->
        ${configMapData.binaryData ? html`
          <div class="detail-section">
            <h3>Binary Data</h3>
            ${this.renderDetailItem('Number of Binary Keys', Object.keys(configMapData.binaryData).length)}
            ${Object.keys(configMapData.binaryData).map(key => html`
              <div class="detail-item">
                <strong class="detail-key">${key}:</strong>
                <span class="detail-value">(binary data)</span>
              </div>
            `)}
          </div>
        ` : ''}

        <!-- Labels -->
        ${configMapData.metadata.labels ? html`
          <div class="detail-section">
            <h3>Labels</h3>
            ${this.renderObjectAsKeyValue(configMapData.metadata.labels)}
          </div>
        ` : ''}

        <!-- Annotations -->
        ${configMapData.metadata.annotations ? html`
          <div class="detail-section">
            <h3>Annotations</h3>
            ${this.renderObjectAsKeyValue(configMapData.metadata.annotations)}
          </div>
        ` : ''}

        <!-- Immutable Flag -->
        ${configMapData.immutable !== undefined ? html`
          <div class="detail-section">
            <h3>Configuration</h3>
            ${this.renderDetailItem('Immutable', configMapData.immutable ? 'Yes' : 'No')}
          </div>
        ` : ''}

        <!-- Raw Data -->
        <div class="detail-section">
          <h3>Raw Data</h3>
          <details>
            <summary>View raw configmap data</summary>
            <pre class="raw-data">${JSON.stringify(configMapData, null, 2)}</pre>
          </details>
        </div>
      </div>
    `;
  }

  renderDetailItem(label: string, value: any, isObject: boolean = false) {
    if (value === null || value === undefined) {
      return html`
        <div class="detail-item">
          <strong class="detail-key">${label}:</strong>
          <span class="detail-value null">null</span>
        </div>
      `;
    }

    if (isObject && typeof value === 'object') {
      return html`
        <div class="detail-item nested">
          <strong class="detail-key">${label}:</strong>
          <div class="nested-content">
            ${this.renderObjectAsKeyValue(value)}
          </div>
        </div>
      `;
    }

    return html`
      <div class="detail-item">
        <strong class="detail-key">${label}:</strong>
        <span class="detail-value">${this.formatValue(value)}</span>
      </div>
    `;
  }

  renderObjectAsKeyValue(obj: any) {
    if (!obj || typeof obj !== 'object') {
      return html`<span class="detail-value null">N/A</span>`;
    }

    const entries = Object.entries(obj);
    if (entries.length === 0) {
      return html`<span class="detail-value null">Empty</span>`;
    }

    return html`
      ${entries.map(([key, value]) => html`
        <div class="detail-item">
          <strong class="detail-key">${key}:</strong>
          <span class="detail-value">${this.formatValue(value)}</span>
        </div>
      `)}
    `;
  }

  formatValue(value: any): string {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return `[${value.length} items]`;
    }
    if (typeof value === 'object' && value !== null) {
      try {
        const str = JSON.stringify(value, null, 2);
        // If it's a short object, show it inline, otherwise show a summary
        if (str.length < 100) {
          return str;
        } else {
          const keys = Object.keys(value);
          return `{${keys.length} properties: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}`;
        }
      } catch {
        return String(value);
      }
    }
    return String(value);
  }

  renderNodeDetailContent(data: any) {
    if (!data) {
      return html`<div class="no-data">No data available</div>`;
    }

    const nodeData = data.node_detail || data;

    console.log('Processing node data:', nodeData);

    return html`
      <div class="detail-sections">
        <!-- Basic Information -->
        <div class="detail-section">
          <h3>Basic Information</h3>
          ${this.renderDetailItem('Name', nodeData.metadata?.name || nodeData.name)}
          ${this.renderDetailItem('UID', nodeData.metadata?.uid)}
          ${this.renderDetailItem('Resource Version', nodeData.metadata?.resourceVersion)}
          ${this.renderDetailItem('Creation Timestamp', nodeData.metadata?.creationTimestamp)}
        </div>

        <!-- Status Information -->
        <div class="detail-section">
          <h3>Status</h3>
          ${nodeData.status?.conditions ? html`
            ${nodeData.status.conditions.map((condition: any) => html`
              <div class="detail-item nested">
                <strong class="detail-key">${condition.type}:</strong>
                <div class="nested-content">
                  ${this.renderDetailItem('Status', condition.status)}
                  ${this.renderDetailItem('Last Heartbeat Time', condition.lastHeartbeatTime)}
                  ${this.renderDetailItem('Last Transition Time', condition.lastTransitionTime)}
                  ${this.renderDetailItem('Reason', condition.reason)}
                  ${this.renderDetailItem('Message', condition.message)}
                </div>
              </div>
            `)}` : ''}
          ${this.renderDetailItem('Phase', nodeData.status?.phase)}
        </div>

        <!-- System Information -->
        <div class="detail-section">
          <h3>System Information</h3>
          ${this.renderDetailItem('OS Image', nodeData.status?.nodeInfo?.osImage || nodeData.osImage)}
          ${this.renderDetailItem('Kernel Version', nodeData.status?.nodeInfo?.kernelVersion || nodeData.kernelVersion)}
          ${this.renderDetailItem('Container Runtime', nodeData.status?.nodeInfo?.containerRuntimeVersion || nodeData.containerRuntime)}
          ${this.renderDetailItem('Kubelet Version', nodeData.status?.nodeInfo?.kubeletVersion || nodeData.version)}
          ${this.renderDetailItem('Kube-Proxy Version', nodeData.status?.nodeInfo?.kubeProxyVersion)}
          ${this.renderDetailItem('Operating System', nodeData.status?.nodeInfo?.operatingSystem)}
          ${this.renderDetailItem('Architecture', nodeData.status?.nodeInfo?.architecture)}
        </div>

        <!-- Addresses -->
        ${nodeData.status?.addresses ? html`
          <div class="detail-section">
            <h3>Addresses</h3>
            ${nodeData.status.addresses.map((address: any) => html`
              <div class="detail-item">
                <strong class="detail-key">${address.type}:</strong>
                <span class="detail-value">${address.address}</span>
              </div>
            `)}
          </div>
        ` : ''}

        <!-- Capacity & Allocatable -->
        ${nodeData.status?.capacity || nodeData.status?.allocatable ? html`
          <div class="detail-section">
            <h3>Resources</h3>
            ${nodeData.status?.capacity ? html`
              <div class="detail-item nested">
                <strong class="detail-key">Capacity:</strong>
                <div class="nested-content">
                  ${this.renderObjectAsKeyValue(nodeData.status.capacity)}
                </div>
              </div>
            ` : ''}
            ${nodeData.status?.allocatable ? html`
              <div class="detail-item nested">
                <strong class="detail-key">Allocatable:</strong>
                <div class="nested-content">
                  ${this.renderObjectAsKeyValue(nodeData.status.allocatable)}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Labels -->
        ${nodeData.metadata?.labels || nodeData.labels ? html`
          <div class="detail-section">
            <h3>Labels</h3>
            ${this.renderObjectAsKeyValue(nodeData.metadata?.labels || nodeData.labels)}
          </div>
        ` : ''}

        <!-- Annotations -->
        ${nodeData.metadata?.annotations || nodeData.annotations ? html`
          <div class="detail-section">
            <h3>Annotations</h3>
            ${this.renderObjectAsKeyValue(nodeData.metadata?.annotations || nodeData.annotations)}
          </div>
        ` : ''}

        <!-- Taints (if any) -->
        ${nodeData.spec?.taints && nodeData.spec.taints.length > 0 ? html`
          <div class="detail-section">
            <h3>Taints</h3>
            ${nodeData.spec.taints.map((taint: any) => html`
              <div class="detail-item nested">
                <strong class="detail-key">${taint.key}:</strong>
                <div class="nested-content">
                  ${this.renderDetailItem('Value', taint.value)}
                  ${this.renderDetailItem('Effect', taint.effect)}
                  ${this.renderDetailItem('Time Added', taint.timeAdded)}
                </div>
              </div>
            `)}
          </div>
        ` : ''}

        <!-- Raw Data -->
        <div class="detail-section">
          <h3>Raw Data</h3>
          <details>
            <summary>View raw node data</summary>
            <pre class="raw-data">${JSON.stringify(nodeData, null, 2)}</pre>
          </details>
        </div>
      </div>
    `;
  }

  // Notification system
  showNotification(type: 'error' | 'success' | 'info' | 'warning', title: string, message: string, duration: number = 5000) {
    const id = ++this.notificationId;
    const notification = {
      id,
      type,
      title,
      message,
      timestamp: Date.now()
    };

    this.notifications = [...this.notifications, notification];
    this.requestUpdate();

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(id);
      }, duration);
    }
  }

  removeNotification(id: number) {
    this.notifications = this.notifications.filter((n: any) => n.id !== id);
    this.requestUpdate();
  }

  renderNotifications() {
    if (this.notifications.length === 0) {
      return null;
    }

    return html`
      <div class="notification-container">
        ${this.notifications.map((notification: any) => html`
          <div class="notification ${notification.type}">
            <div class="notification-icon ${notification.type}">
              ${this.getNotificationIcon(notification.type)}
            </div>
            <div class="notification-content">
              <div class="notification-title">${notification.title}</div>
              <div class="notification-message">${notification.message}</div>
            </div>
            <button class="notification-close" @click=${() => this.removeNotification(notification.id)}>
              ×
            </button>
          </div>
        `)}
      </div>
    `;
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'error': return '⚠️';
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  }

  private getDataForActiveSubmenu(): Array<any> {
    switch (this.activeSubmenu) {
      case 'workloads': return this.workloads || [];
      case 'networks': return this.networks || [];
      case 'storages': return this.storages || [];
      case 'configurations': return this.configurations || [];
      case 'helms': return this.helms || [];
      case 'nodes': return this.nodes || [];
      case 'crds': return this.crds || [];
      default: return [];
    }
  }

  override render() {
    return html`
      <div class="tab-container">
        <h1>${this.renderTitle()}</h1>
        ${this.activeSubmenu === 'workloads' ? this.renderWorkloadTabs() : ''}
        ${this.activeSubmenu === 'networks' ? this.renderNetworkTabs() : ''}
        ${this.activeSubmenu === 'storages' ? this.renderStorageTabs() : ''}
        ${this.activeSubmenu === 'configurations' ? this.renderConfigurationTabs() : ''}
        ${this.activeSubmenu === 'helms' ? this.renderHelmTabs() : ''}
        <div class="search-container">
          <div class="search-controls">
            ${this.activeSubmenu !== 'nodes' && this.activeSubmenu !== 'crds' ? html`
              <div class="namespace-filter">
              <div class="namespace-dropdown">
                <button class="namespace-button" @click=${(e: Event) => this.toggleNamespaceDropdown(e)}>
                  ${this.getSelectedNamespaceDisplayName()}
                  <span class="namespace-arrow ${this.showNamespaceDropdown ? 'open' : ''}">▼</span>
                </button>
                <div class="namespace-dropdown-content ${this.showNamespaceDropdown ? 'show' : ''}">
                  <div class="namespace-search">
                    <input 
                      type="text" 
                      class="namespace-search-input" 
                      .value=${this.namespaceSearchQuery}
                      @input=${this.handleNamespaceSearch}
                      placeholder="Filter namespaces..."
                    />
                  </div>
                  <div class="namespace-options">
                    ${this.getFilteredNamespaces().map((namespace: string) => html`
                      <button class="namespace-option ${namespace === this.selectedNamespace ? 'selected' : ''}"
                        @click=${() => this.selectNamespace(namespace)}>
                        ${namespace}
                      </button>`
                    )}
                    ${this.getFilteredNamespaces().length === 0 ? 
                      html`<div class="no-namespaces">No namespaces found</div>` : ''}
                  </div>
                </div>
              </div>
              </div>
            ` : ''}
            <div class="search-wrapper">
              <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input 
                class="search-input"
                type="text" 
                placeholder="Search..."
                .value=${this.searchQuery}
                @input=${this.handleSearchInput}
              />
            </div>
          </div>
          <button class="btn-create" @click=${() => this.handleCreate()}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create
          </button>
        </div>
        <div class="tab-content">
          ${this.error ? html`
            <div class="error-state">
              <h3>Error</h3>
              <p>${this.error}</p>
            </div>` : this.renderContent()}
        </div>
        ${this.renderPodDetailsDrawer()}
        ${this.renderCrdDetailsDrawer()}
        ${this.renderDeploymentDetailsDrawer()}
        ${this.renderStatefulSetDetailsDrawer()}
        ${this.renderDaemonSetDetailsDrawer()}
        ${this.renderJobDetailsDrawer()}
        ${this.renderCronJobDetailsDrawer()}
        ${this.renderPvcDetailsDrawer()}
        ${this.renderPvDetailsDrawer()}
        ${this.renderSecretDetailsDrawer()}
        ${this.renderConfigMapDetailsDrawer()}
        ${this.renderNodeDetailsDrawer()}
        ${this.renderNotifications()}
        ${this.renderLogsDrawer()}
        ${this.renderCreateDrawer()}
        ${this.renderDeleteModal()}
      </div>
    `;
  }

  renderTitle() {
    const titles: Record<string, string> = {
      workloads: 'Kubernetes Workloads',
      networks: 'Kubernetes Networks',
      storages: 'Kubernetes Storages',
      configurations: 'Kubernetes Configurations',
      helms: 'Kubernetes Helms',
      nodes: 'Kubernetes Nodes',
      crds: 'Kubernetes CRDs'
    };
    return titles[this.activeSubmenu] || 'Kubernetes';
  }

  
  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this.handleRouteChange);
    window.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('click', this.handleNamespaceDropdownOutsideClick);
  }
  
  private handleRouteChange = () => {
    const path = window.location.pathname;
    if (path.includes('/kubernetes/')) {
      const submenu = path.split('/kubernetes/')[1];
      if (submenu && ['workloads', 'networks', 'storages', 'configurations', 'helms', 'nodes', 'crds'].includes(submenu)) {
        this.activeSubmenu = submenu;
      }
    }
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (this.showLogsDrawer) {
        this.showLogsDrawer = false;
        this.logsError = null;
        this.containerLogs = '';
        this.logsSearchTerm = '';
      }
      if (this.showCreateDrawer) {
        this.showCreateDrawer = false;
        this.createResourceYaml = '';
      }
      if (this.showPodDetails) {
        this.showPodDetails = false;
      }
      if (this.showCrdDetails) {
        this.showCrdDetails = false;
      }
      if (this.showDeploymentDetails) {
        this.showDeploymentDetails = false;
      }
      if (this.showStatefulSetDetails) {
        this.showStatefulSetDetails = false;
      }
      if (this.showDaemonSetDetails) {
        this.showDaemonSetDetails = false;
      }
      if (this.showJobDetails) {
        this.showJobDetails = false;
      }
      if (this.showCronJobDetails) {
        this.showCronJobDetails = false;
      }
      if (this.showPvcDetails) {
        this.showPvcDetails = false;
      }
      if (this.showPvDetails) {
        this.showPvDetails = false;
      }
      if (this.showSecretDetails) {
        this.showSecretDetails = false;
      }
      if (this.showConfigMapDetails) {
        this.showConfigMapDetails = false;
      }
      if (this.showNodeDetails) {
        this.showNodeDetails = false;
      }
      if (this.showDeleteModal && !this.isDeleting) {
        this.closeDeleteModal();
      }
      this.requestUpdate();
    }
  };

  private updateActiveSubmenu() {
    // Priority: subRoute property > URL path > default
    if (this.subRoute && ['workloads', 'networks', 'storages', 'configurations', 'helms', 'nodes', 'crds'].includes(this.subRoute)) {
      this.activeSubmenu = this.subRoute;
    } else {
      // Fallback to URL detection
      const path = window.location.pathname;
      if (path.includes('/kubernetes/')) {
        const submenu = path.split('/kubernetes/')[1];
        if (submenu && ['workloads', 'networks', 'storages', 'configurations', 'helms', 'nodes', 'crds'].includes(submenu)) {
          this.activeSubmenu = submenu;
        }
      }
    }
  }

  // Watch for changes to subRoute property
  override updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('subRoute')) {
      this.updateActiveSubmenu();
    }
  }

  initializeMockData() {
    // Workload mock data - Deployments, Services, Pods
    this.workloads = [
      { 
        name: 'nginx-deployment', 
        type: 'Deployment', 
        namespace: 'default', 
        status: 'Running', 
        replicas: '3/3', 
        age: '2d' 
      },
      { 
        name: 'api-gateway', 
        type: 'Deployment', 
        namespace: 'production', 
        status: 'Running', 
        replicas: '2/2', 
        age: '5d' 
      },
      { 
        name: 'redis-deployment', 
        type: 'Deployment', 
        namespace: 'database', 
        status: 'Running', 
        replicas: '1/1', 
        age: '3d' 
      },
      { 
        name: 'web-frontend', 
        type: 'Deployment', 
        namespace: 'frontend', 
        status: 'Running', 
        replicas: '5/5', 
        age: '1w' 
      },
      { 
        name: 'auth-service', 
        type: 'Deployment', 
        namespace: 'auth', 
        status: 'Failed', 
        replicas: '0/2', 
        age: '1h' 
      },
      { 
        name: 'frontend-service', 
        type: 'Service', 
        namespace: 'default', 
        status: 'Active', 
        replicas: '-', 
        age: '1d' 
      },
      { 
        name: 'database-service', 
        type: 'Service', 
        namespace: 'database', 
        status: 'Active', 
        replicas: '-', 
        age: '1w' 
      },
      { 
        name: 'api-loadbalancer', 
        type: 'Service', 
        namespace: 'production', 
        status: 'Active', 
        replicas: '-', 
        age: '2w' 
      },
      { 
        name: 'worker-pod-xyz', 
        type: 'Pod', 
        namespace: 'default', 
        status: 'Pending', 
        replicas: '-', 
        age: '5m' 
      },
      { 
        name: 'nginx-pod-abc', 
        type: 'Pod', 
        namespace: 'default', 
        status: 'Running', 
        replicas: '-', 
        age: '2d' 
      },
      { 
        name: 'redis-pod-def', 
        type: 'Pod', 
        namespace: 'database', 
        status: 'Running', 
        replicas: '-', 
        age: '3d' 
      },
      { 
        name: 'auth-pod-ghi', 
        type: 'Pod', 
        namespace: 'auth', 
        status: 'Error', 
        replicas: '-', 
        age: '30m' 
      },
      { 
        name: 'monitoring-daemon', 
        type: 'DaemonSet', 
        namespace: 'kube-system', 
        status: 'Running', 
        replicas: '3/3', 
        age: '10d' 
      },
      { 
        name: 'log-collector', 
        type: 'DaemonSet', 
        namespace: 'logging', 
        status: 'Running', 
        replicas: '3/3', 
        age: '7d' 
      }
    ];
    
    // Network mock data - Services, Ingress, NetworkPolicies
    this.networks = [
      { 
        name: 'main-ingress', 
        type: 'Ingress', 
        namespace: 'default', 
        status: 'Active', 
        endpoints: 'api.example.com', 
        age: '3d' 
      },
      { 
        name: 'load-balancer', 
        type: 'Service', 
        namespace: 'production', 
        status: 'Active', 
        endpoints: '10.0.1.100:80', 
        age: '7d' 
      },
      { 
        name: 'deny-all-policy', 
        type: 'NetworkPolicy', 
        namespace: 'default', 
        status: 'Enforced', 
        endpoints: '-', 
        age: '1d' 
      },
      { 
        name: 'external-endpoint', 
        type: 'Endpoints', 
        namespace: 'default', 
        status: 'Ready', 
        endpoints: '192.168.1.100:8080', 
        age: '6h' 
      }
    ];
    
    // Storage mock data - PVs, PVCs, StorageClasses
    this.storages = [
      { 
        name: 'mysql-volume', 
        type: 'PersistentVolume', 
        namespace: 'database', 
        status: 'Bound', 
        capacity: '10Gi', 
        accessMode: 'ReadWriteOnce', 
        age: '10d' 
      },
      { 
        name: 'app-data-claim', 
        type: 'PersistentVolumeClaim', 
        namespace: 'default', 
        status: 'Bound', 
        capacity: '5Gi', 
        accessMode: 'ReadWriteOnce', 
        age: '3d' 
      },
      { 
        name: 'redis-data-claim', 
        type: 'PersistentVolumeClaim', 
        namespace: 'database', 
        status: 'Bound', 
        capacity: '2Gi', 
        accessMode: 'ReadWriteOnce', 
        age: '5d' 
      },
      { 
        name: 'log-storage-claim', 
        type: 'PersistentVolumeClaim', 
        namespace: 'logging', 
        status: 'Pending', 
        capacity: '20Gi', 
        accessMode: 'ReadWriteMany', 
        age: '2h' 
      },
      { 
        name: 'media-files-claim', 
        type: 'PersistentVolumeClaim', 
        namespace: 'frontend', 
        status: 'Bound', 
        capacity: '50Gi', 
        accessMode: 'ReadWriteMany', 
        age: '1w' 
      },
      { 
        name: 'fast-ssd', 
        type: 'StorageClass', 
        namespace: '-', 
        status: 'Available', 
        capacity: '-', 
        accessMode: 'ReadWriteOnce', 
        age: '30d' 
      },
      { 
        name: 'standard-hdd', 
        type: 'StorageClass', 
        namespace: '-', 
        status: 'Available', 
        capacity: '-', 
        accessMode: 'ReadWriteOnce', 
        age: '45d' 
      },
      { 
        name: 'network-storage', 
        type: 'StorageClass', 
        namespace: '-', 
        status: 'Available', 
        capacity: '-', 
        accessMode: 'ReadWriteMany', 
        age: '60d' 
      },
      { 
        name: 'backup-storage', 
        type: 'PersistentVolume', 
        namespace: 'backup', 
        status: 'Available', 
        capacity: '100Gi', 
        accessMode: 'ReadWriteMany', 
        age: '15d' 
      },
      { 
        name: 'prometheus-storage', 
        type: 'PersistentVolume', 
        namespace: 'monitoring', 
        status: 'Bound', 
        capacity: '25Gi', 
        accessMode: 'ReadWriteOnce', 
        age: '1w' 
      },
      { 
        name: 'grafana-storage', 
        type: 'PersistentVolume', 
        namespace: 'monitoring', 
        status: 'Bound', 
        capacity: '5Gi', 
        accessMode: 'ReadWriteOnce', 
        age: '1w' 
      },
      { 
        name: 'shared-cache', 
        type: 'PersistentVolume', 
        namespace: 'cache', 
        status: 'Available', 
        capacity: '15Gi', 
        accessMode: 'ReadWriteMany', 
        age: '3d' 
      }
    ];
    
    // Configuration mock data - ConfigMaps, Secrets, ServiceAccounts
    this.configurations = [
      { 
        name: 'app-config', 
        type: 'ConfigMap', 
        namespace: 'default', 
        status: 'Active', 
        keys: '3', 
        age: '2d' 
      },
      { 
        name: 'db-credentials', 
        type: 'Secret', 
        namespace: 'database', 
        status: 'Active', 
        keys: '2', 
        age: '7d' 
      },
      { 
        name: 'api-service-account', 
        type: 'ServiceAccount', 
        namespace: 'default', 
        status: 'Active', 
        keys: '-', 
        age: '5d' 
      },
      { 
        name: 'tls-certificates', 
        type: 'Secret', 
        namespace: 'production', 
        status: 'Active', 
        keys: '4', 
        age: '1d' 
      }
    ];
    
    // Helm mock data - Charts and Releases
    this.helms = [
      { 
        name: 'prometheus-stack', 
        type: 'Release',
        namespace: 'monitoring', 
        revision: '3', 
        status: 'Deployed', 
        chart: 'kube-prometheus-stack-45.7.1', 
        updated: '2024-01-15 10:30:00' 
      },
      { 
        name: 'grafana-dashboard', 
        type: 'Release',
        namespace: 'monitoring', 
        revision: '1', 
        status: 'Deployed', 
        chart: 'grafana-6.50.7', 
        updated: '2024-01-14 14:22:00' 
      },
      { 
        name: 'nginx-ingress', 
        type: 'Release',
        namespace: 'ingress-nginx', 
        revision: '2', 
        status: 'Failed', 
        chart: 'ingress-nginx-4.4.2', 
        updated: '2024-01-16 09:15:00' 
      },
      { 
        name: 'cert-manager', 
        type: 'Release',
        namespace: 'cert-manager', 
        revision: '1', 
        status: 'Pending', 
        chart: 'cert-manager-v1.13.3', 
        updated: '2024-01-16 11:45:00' 
      },
      { 
        name: 'redis-cluster', 
        type: 'Release',
        namespace: 'database', 
        revision: '4', 
        status: 'Deployed', 
        chart: 'redis-17.3.7', 
        updated: '2024-01-10 16:20:00' 
      },
      { 
        name: 'mysql-primary', 
        type: 'Release',
        namespace: 'database', 
        revision: '2', 
        status: 'Deployed', 
        chart: 'mysql-9.4.6', 
        updated: '2024-01-12 09:45:00' 
      },
      { 
        name: 'elasticsearch', 
        type: 'Release',
        namespace: 'logging', 
        revision: '1', 
        status: 'Deployed', 
        chart: 'elasticsearch-19.5.0', 
        updated: '2024-01-13 14:30:00' 
      },
      { 
        name: 'kibana', 
        type: 'Release',
        namespace: 'logging', 
        revision: '1', 
        status: 'Deployed', 
        chart: 'kibana-10.2.3', 
        updated: '2024-01-13 15:15:00' 
      },
      { 
        name: 'wordpress', 
        type: 'Release',
        namespace: 'frontend', 
        revision: '3', 
        status: 'Deployed', 
        chart: 'wordpress-15.2.5', 
        updated: '2024-01-11 11:20:00' 
      },
      { 
        name: 'jenkins', 
        type: 'Release',
        namespace: 'ci-cd', 
        revision: '1', 
        status: 'Failed', 
        chart: 'jenkins-4.2.17', 
        updated: '2024-01-16 13:45:00' 
      },
      { 
        name: 'argocd', 
        type: 'Release',
        namespace: 'argocd', 
        revision: '2', 
        status: 'Deployed', 
        chart: 'argo-cd-5.16.13', 
        updated: '2024-01-09 08:30:00' 
      },
      { 
        name: 'vault', 
        type: 'Release',
        namespace: 'vault', 
        revision: '1', 
        status: 'Pending', 
        chart: 'vault-0.22.1', 
        updated: '2024-01-16 16:00:00' 
      },
      // Chart examples
      { 
        name: 'nginx-chart', 
        type: 'Chart',
        namespace: '-', 
        revision: '-', 
        status: 'Available', 
        chart: 'nginx-1.25.3', 
        updated: '2024-01-10 08:00:00' 
      },
      { 
        name: 'mysql-chart', 
        type: 'Chart',
        namespace: '-', 
        revision: '-', 
        status: 'Available', 
        chart: 'mysql-9.4.6', 
        updated: '2024-01-12 10:00:00' 
      },
      { 
        name: 'redis-chart', 
        type: 'Chart',
        namespace: '-', 
        revision: '-', 
        status: 'Available', 
        chart: 'redis-17.3.7', 
        updated: '2024-01-08 12:00:00' 
      },
      { 
        name: 'postgresql-chart', 
        type: 'Chart',
        namespace: '-', 
        revision: '-', 
        status: 'Available', 
        chart: 'postgresql-12.1.2', 
        updated: '2024-01-14 16:00:00' 
      }
    ];
    
    // Nodes mock data - Since nodes are cluster-level resources (no namespace)
    this.nodes = [
      {
        name: 'minikube',
        status: 'Ready',
        roles: ['control-plane'],
        age: '30d',
        version: 'v1.28.2',
        internalIP: '192.168.49.2',
        externalIP: null,
        osImage: 'Ubuntu 22.04.3 LTS',
        kernelVersion: '5.15.0-76-generic',
        containerRuntime: 'docker://24.0.4',
        labels: {
          'kubernetes.io/arch': 'amd64',
          'kubernetes.io/hostname': 'minikube',
          'kubernetes.io/os': 'linux',
          'minikube.k8s.io/version': 'v1.31.0',
          'node-role.kubernetes.io/control-plane': '',
          'node.kubernetes.io/exclude-from-external-load-balancers': ''
        },
        annotations: {
          'kubeadm.alpha.kubernetes.io/cri-socket': 'unix:///var/run/cri-dockerd.sock',
          'node.alpha.kubernetes.io/ttl': '0',
          'volumes.kubernetes.io/controller-managed-attach-detach': 'true'
        }
      },
      {
        name: 'worker-node-1',
        status: 'Ready',
        roles: ['worker'],
        age: '25d',
        version: 'v1.28.2',
        internalIP: '192.168.1.100',
        externalIP: '203.0.113.10',
        osImage: 'Ubuntu 22.04.3 LTS',
        kernelVersion: '5.15.0-76-generic',
        containerRuntime: 'containerd://1.7.2',
        labels: {
          'kubernetes.io/arch': 'amd64',
          'kubernetes.io/hostname': 'worker-node-1',
          'kubernetes.io/os': 'linux',
          'node-role.kubernetes.io/worker': ''
        },
        annotations: {
          'node.alpha.kubernetes.io/ttl': '0',
          'volumes.kubernetes.io/controller-managed-attach-detach': 'true'
        }
      },
      {
        name: 'worker-node-2',
        status: 'Ready',
        roles: ['worker'],
        age: '20d',
        version: 'v1.28.2',
        internalIP: '192.168.1.101',
        externalIP: '203.0.113.11',
        osImage: 'Ubuntu 22.04.3 LTS',
        kernelVersion: '5.15.0-76-generic',
        containerRuntime: 'containerd://1.7.2',
        labels: {
          'kubernetes.io/arch': 'amd64',
          'kubernetes.io/hostname': 'worker-node-2',
          'kubernetes.io/os': 'linux',
          'node-role.kubernetes.io/worker': ''
        },
        annotations: {
          'node.alpha.kubernetes.io/ttl': '0',
          'volumes.kubernetes.io/controller-managed-attach-detach': 'true'
        }
      }
    ];
  }


  toggleActionMenu(event: MouseEvent, menuId: string) {
    event.stopPropagation();
    
    // Close all other menus first
    this.closeAllMenus();
    
    // Toggle the clicked menu
    const menu = this.shadowRoot?.querySelector(`#${menuId}`);
    if (menu) {
      menu.classList.toggle('show');
    }
    
    // Add click listener to close menu when clicking outside
    if (menu?.classList.contains('show')) {
      setTimeout(() => {
        document.addEventListener('click', this.handleOutsideClick);
      }, 0);
    }
  }

  closeAllMenus() {
    const menus = this.shadowRoot?.querySelectorAll('.action-dropdown');
    menus?.forEach(menu => menu.classList.remove('show'));
    document.removeEventListener('click', this.handleOutsideClick);
  }

  handleOutsideClick = () => {
    this.closeAllMenus();
  }

  async fetchPods() {
    try {
      const data = await Api.get('/kubernetes/pods');
      const pods = data.pods.map((pod: any) => ({
        name: pod.name,
        type: 'Pod',
        namespace: pod.namespace,
        status: pod.status,
        replicas: pod.ready,
        age: pod.age
      }));
      return pods;
    } catch (error) {
      console.error('Failed to fetch pods:', error);
      return [];
    }
  }

  async fetchDeployments() {
    try {
      const data = await Api.get('/kubernetes/deployments');
      const deployments = data.deployments.map((dep: any) => ({
        name: dep.name,
        type: 'Deployment',
        namespace: dep.namespace,
        status: dep.available > 0 ? 'Running' : 'Pending',
        replicas: `${dep.available}/${dep.replicas}`,
        age: dep.age
      }));
      return deployments;
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
      return [];
    }
  }

  async fetchStatefulSets() {
    try {
      const data = await Api.get('/kubernetes/statefulsets');
      const statefulsets = data.statefulsets.map((set: any) => ({
        name: set.name,
        type: 'StatefulSet',
        namespace: set.namespace,
        status: set.ready_replicas > 0 ? 'Running' : 'Pending',
        replicas: `${set.ready_replicas}/${set.replicas}`,
        age: set.age
      }));
      return statefulsets;
    } catch (error) {
      console.error('Failed to fetch stateful sets:', error);
      return [];
    }
  }

  async fetchDaemonSets() {
    try {
      const data = await Api.get('/kubernetes/daemonsets');
      const daemonsets = data.daemonsets.map((ds: any) => ({
        name: ds.name,
        type: 'DaemonSet',
        namespace: ds.namespace,
        status: ds.ready > 0 ? 'Running' : 'Pending',
        replicas: `${ds.ready}/${ds.desired}`,
        age: ds.age
      }));
      return daemonsets;
    } catch (error) {
      console.error('Failed to fetch daemon sets:', error);
      return [];
    }
  }

  async fetchJobs() {
    try {
      const data = await Api.get('/kubernetes/jobs');
      const jobs = data.jobs.map((job: any) => ({
        name: job.name,
        type: 'Job',
        namespace: job.namespace,
        replicas: job.completions,
        age: job.age
      }));
      return jobs;
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      return [];
    }
  }

  async fetchCronJobs() {
    try {
      const data = await Api.get('/kubernetes/cronjobs');
      const cronjobs = data.cronjobs.map((cj: any) => ({
        name: cj.name,
        type: 'CronJob',
        namespace: cj.namespace,
        status: cj.suspended ? 'Suspended' : 'Active',
        replicas: cj.schedule,
        age: cj.age
      }));
      return cronjobs;
    } catch (error) {
      console.error('Failed to fetch cron jobs:', error);
      return [];
    }
  }

  async fetchServices() {
    try {
      const data = await Api.get('/kubernetes/services');
      const services = data.services.map((svc: any) => ({
        name: svc.name,
        type: 'Service',
        namespace: svc.namespace,
        serviceType: svc.type,
        clusterIP: svc.cluster_ip,
        externalIP: svc.external_ip || '-',
        ports: svc.ports,
        age: svc.age,
        labels: svc.labels,
        annotations: svc.annotations
      }));
      return services;
    } catch (error) {
      console.error('Failed to fetch services:', error);
      return [];
    }
  }

  async fetchIngresses() {
    try {
      const data = await Api.get('/kubernetes/ingresses');
      const ingresses = data.ingresses.map((ing: any) => ({
        name: ing.name,
        type: 'Ingress',
        namespace: ing.namespace,
        ingressClass: ing.class || '-',
        hosts: ing.hosts,
        address: ing.address || '-',
        ports: ing.ports,
        age: ing.age,
        labels: ing.labels,
        annotations: ing.annotations
      }));
      return ingresses;
    } catch (error) {
      console.error('Failed to fetch ingresses:', error);
      return [];
    }
  }

  async fetchConfigMaps() {
    try {
      const data = await Api.get('/kubernetes/configmaps');
      this.configurations = data.configmaps.map((map: any) => ({
        name: map.name,
        type: 'ConfigMap',
        namespace: map.namespace,
        status: 'Active',
        keys: map.data,
        age: map.age
      }));
      this.error = null;
    } catch (error) {
      this.error = 'Failed to fetch config maps';
    }
  }

  async fetchSecrets() {
    try {
      const data = await Api.get('/kubernetes/secrets');
      this.configurations = this.configurations.concat(data.secrets.map((sec: any) => ({
        name: sec.name,
        type: 'Secret',
        namespace: sec.namespace,
        status: 'Active',
        keys: sec.data,
        age: sec.age
      })));
      this.error = null;
    } catch (error) {
      this.error = 'Failed to fetch secrets';
    }
  }

  async fetchPvcs() {
    try {
      const response = await Api.get('/kubernetes/pvcs');
      const pvcs = response.data?.pvcs || response.pvcs || [];
      return pvcs.map((pvc: any) => ({
        name: pvc.name,
        type: 'PersistentVolumeClaim',
        namespace: pvc.namespace,
        status: pvc.status || 'Unknown',
        capacity: pvc.capacity || '-',
        accessMode: pvc.access_modes || '-',
        storageClass: pvc.storage_class || '-',
        volume: pvc.volume || '-',
        age: pvc.age || '-'
      }));
    } catch (error) {
      console.error('Failed to fetch PVCs:', error);
      return [];
    }
  }

  async fetchPvs() {
    try {
      const response = await Api.get('/kubernetes/pvs');
      const pvs = response.data?.pvs || response.pvs || [];
      return pvs.map((pv: any) => ({
        name: pv.name,
        type: 'PersistentVolume',
        namespace: '-',  // PVs are not namespaced
        status: pv.status || 'Unknown',
        capacity: pv.capacity || '-',
        accessMode: pv.access_modes || '-',
        reclaimPolicy: pv.reclaim_policy || '-',
        storageClass: pv.storage_class || '-',
        claim: pv.claim || '-',
        age: pv.age || '-'
      }));
    } catch (error) {
      console.error('Failed to fetch PVs:', error);
      return [];
    }
  }

  async fetchHelmReleases() {
    try {
      const data = await Api.get('/kubernetes/helm/releases');
      this.helms = data.releases.map((release: any) => ({
        name: release.name,
        type: 'Release',
        namespace: release.namespace,
        revision: release.version,
        status: release.status,
        chart: `${release.chart} (${release.chart_version})`,
        updated: release.updated
      }));
      this.error = null;
    } catch (error) {
      this.error = 'Failed to fetch helm releases';
    }
  }

  async fetchHelmCharts() {
    try {
      const data = await Api.get('/kubernetes/helm/charts');
      this.helms = this.helms.concat(data.charts.map((chart: any) => ({
        name: chart.name,
        type: 'Chart',
        namespace: '-',
        revision: '-',
        status: 'Available',
        chart: chart.name,
        updated: '-'  // No updated information available for charts
      })));
      this.error = null;
    } catch (error) {
      this.error = 'Failed to fetch helm charts';
    }
  }

  async fetchNodes() {
    try {
      const data = await Api.get('/kubernetes/nodes');
      this.nodes = data.nodes.map((node: any) => ({
        name: node.name,
        type: 'Node',
        status: node.status,
        roles: node.roles,
        age: node.age,
        version: node.version,
        internalIP: node.internalIP,
        externalIP: node.externalIP,
        osImage: node.osImage,
        kernelVersion: node.kernelVersion,
        containerRuntime: node.containerRuntime,
        labels: node.labels,
        annotations: node.annotations
      }));
      this.error = null;
    } catch (error) {
      this.error = 'Failed to fetch nodes';
    }
  }

  async fetchCrds() {
    try {
      const data = await Api.get('/kubernetes/crds');
      this.crds = data.crds.map((crd: any) => ({
        name: crd.name,
        type: 'CRD',
        group: crd.group,
        version: crd.version,
        kind: crd.kind,
        scope: crd.scope,
        age: crd.age
      }));
      this.error = null;
    } catch (error) {
      this.error = 'Failed to fetch CRDs';
    }
  }

  async fetchNamespaces() {
    try {
      const data = await Api.get('/kubernetes/namespaces');
      this.namespaces = data.namespaces.map((ns: any) => ns.name);
      this.error = null;
    } catch (error) {
      console.error('Failed to fetch namespaces:', error);
      // Set some default namespaces if API fails
      this.namespaces = ['default', 'kube-system', 'kube-public'];
    }
  }

  // private handleNamespaceChange(event: Event) {
  //   const target = event.target as HTMLSelectElement;
  //   this.selectedNamespace = target.value;
  //   this.requestUpdate();
  // }

  private toggleNamespaceDropdown(event?: Event) {
    console.log('toggleNamespaceDropdown called, current state:', this.showNamespaceDropdown);
    if (event) {
      event.stopPropagation();
    }
    this.showNamespaceDropdown = !this.showNamespaceDropdown;
    console.log('new state:', this.showNamespaceDropdown);
    if (this.showNamespaceDropdown) {
      this.namespaceSearchQuery = '';
      // Focus on search input after dropdown opens
      setTimeout(() => {
        const searchInput = this.shadowRoot?.querySelector('.namespace-search-input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }, 0);
    }
    this.requestUpdate();
  }

  private handleNamespaceSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.namespaceSearchQuery = target.value.toLowerCase();
    this.requestUpdate();
  }

  private selectNamespace(namespace: string) {
    this.selectedNamespace = namespace;
    this.showNamespaceDropdown = false;
    this.namespaceSearchQuery = '';
    this.requestUpdate();
  }

  private getFilteredNamespaces(): string[] {
    const allNamespaces = ['all', ...this.namespaces];
    if (!this.namespaceSearchQuery.trim()) {
      return allNamespaces;
    }
    return allNamespaces.filter(namespace => 
      namespace.toLowerCase().includes(this.namespaceSearchQuery)
    );
  }

  private getSelectedNamespaceDisplayName(): string {
    return this.selectedNamespace === 'all' ? 'All Namespaces' : this.selectedNamespace;
  }

  private handleNamespaceDropdownOutsideClick = (event: Event) => {
    const dropdown = this.shadowRoot?.querySelector('.namespace-dropdown');
    if (dropdown && !dropdown.contains(event.target as Node)) {
      console.log('Outside click detected, closing dropdown');
      this.showNamespaceDropdown = false;
      this.requestUpdate();
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    console.log('KubernetesTab: connectedCallback called');
    
    this.initializeMockData();
    console.log('KubernetesTab: Mock data initialized, nodes length:', this.nodes.length);
    
    this.updateActiveSubmenu();
    console.log('KubernetesTab: Active submenu after update:', this.activeSubmenu);
    
    // Fetch namespaces and all Kubernetes resources
    this.fetchNamespaces();
    this.fetchAllResources();
    
    window.addEventListener('popstate', this.handleRouteChange);
    window.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('click', this.handleNamespaceDropdownOutsideClick);
    
    // Debug: Force render update
    this.requestUpdate();
  }

  async fetchAllResources() {
    try {
      // Clear existing arrays before fetching
      this.workloads = [];
      this.networks = [];
      this.storages = [];
      this.configurations = [];
      this.helms = [];
      this.nodes = [];
      this.crds = [];
      
      // Fetch all workload resources and combine them
      const [pods, deployments, statefulsets, daemonsets, jobs, cronjobs] = await Promise.all([
        this.fetchPods(),
        this.fetchDeployments(),
        this.fetchStatefulSets(),
        this.fetchDaemonSets(),
        this.fetchJobs(),
        this.fetchCronJobs()
      ]);
      
      // Combine all workload data
      this.workloads = [...pods, ...deployments, ...statefulsets, ...daemonsets, ...jobs, ...cronjobs];
      
      // Fetch network resources (services and ingresses)
      const [services, ingresses] = await Promise.all([
        this.fetchServices(),
        this.fetchIngresses()
      ]);
      this.networks = [...services, ...ingresses];
      
      // Fetch storage resources (PVCs and PVs)
      const [pvcs, pvs] = await Promise.all([
        this.fetchPvcs(),
        this.fetchPvs()
      ]);
      this.storages = [...pvcs, ...pvs];
      
      // Fetch configuration resources
      await Promise.all([
        this.fetchConfigMaps(),
        this.fetchSecrets()
      ]);
      
      // Fetch Helm resources
      await Promise.all([
        this.fetchHelmReleases(),
        this.fetchHelmCharts()
      ]);
      
      // Fetch nodes
      await this.fetchNodes();
      
      // Fetch CRDs
      await this.fetchCrds();
      
      this.error = null;
    } catch (error) {
      console.error('Failed to fetch Kubernetes resources:', error);
      this.error = 'Failed to fetch some Kubernetes resources';
    }
  }

  viewDetails(item: any) {
    switch (item.type) {
      case 'Pod':
        this.viewPodDetails(item);
        break;
      case 'CRD':
        this.viewCrdDetails(item);
        break;
      case 'Deployment':
        this.viewDeploymentDetails(item);
        break;
      case 'StatefulSet':
        this.viewStatefulSetDetails(item);
        break;
      case 'DaemonSet':
        this.viewDaemonSetDetails(item);
        break;
      case 'Job':
        this.viewJobDetails(item);
        break;
      case 'CronJob':
        this.viewCronJobDetails(item);
        break;
      case 'PersistentVolumeClaim':
        this.viewPvcDetails(item);
        break;
      case 'PersistentVolume':
        this.viewPvDetails(item);
        break;
      case 'Secret':
        this.viewSecretDetails(item);
        break;
      case 'ConfigMap':
        this.viewConfigMapDetails(item);
        break;
      case 'Node':
        this.viewNodeDetails(item);
        break;
      default:
        console.log('View details not implemented for type:', item.type);
        this.showNotification(
          'info',
          'Feature Not Available',
          `Detailed view for ${item.type} resources is not implemented yet.`
        );
        break;
    }
  }

  viewPodDetails(pod: any) {
    console.log('Fetching pod details for:', pod.name, 'in namespace:', pod.namespace);
    this.loadingPodDetails = true;
    this.showPodDetails = true;
    this.selectedPod = null;
    this.requestUpdate();
    
    const url = `/kubernetes/pods/${pod.namespace}/${pod.name}`;
    console.log('Making API request to:', url);
    
    Api.get(url)
      .then(response => {
        console.log('Pod details response:', response);
        this.selectedPod = response;
        this.loadingPodDetails = false;
        this.requestUpdate();
      })
      .catch(error => {
        console.error('Failed to fetch pod details:', error);
        this.loadingPodDetails = false;
        this.showPodDetails = false;
        this.requestUpdate();
        this.showNotification(
          'error',
          'Failed to Load Pod Details',
          `Unable to fetch details for pod "${pod.name}": ${error.message || 'Unknown error occurred'}`
        );
      });
  }

  viewCrdDetails(crd: any) {
    console.log('Fetching CRD details for:', crd.name);
    this.loadingCrdDetails = true;
    this.showCrdDetails = true;
    this.selectedCrd = null;
    this.requestUpdate();

    const url = `/kubernetes/crds/${crd.name}`;
    console.log('Making API request to:', url);

    Api.get(url)
      .then(response => {
        console.log('CRD details response:', response);
        this.selectedCrd = response;
        this.loadingCrdDetails = false;
        this.requestUpdate();
      })
      .catch(error => {
        console.error('Failed to fetch CRD details:', error);
        this.loadingCrdDetails = false;
        this.showCrdDetails = false;
        this.requestUpdate();
        this.showNotification(
          'error',
          'Failed to Load CRD Details',
          `Unable to fetch details for CRD "${crd.name}": ${error.message || 'Unknown error occurred'}`
        );
      });
  }

  viewDeploymentDetails(deployment: any) {
    console.log('Fetching deployment details for:', deployment.name, 'in namespace:', deployment.namespace);
    this.loadingDeploymentDetails = true;
    this.showDeploymentDetails = true;
    this.selectedDeployment = null;
    this.requestUpdate();

    const url = `/kubernetes/deployments/${deployment.namespace}/${deployment.name}`;
    console.log('Making API request to:', url);

    Api.get(url)
      .then(response => {
        console.log('Deployment details response:', response);
        this.selectedDeployment = response;
        this.loadingDeploymentDetails = false;
        this.requestUpdate();
      })
      .catch(error => {
        console.error('Failed to fetch deployment details:', error);
        this.loadingDeploymentDetails = false;
        this.showDeploymentDetails = false;
        this.requestUpdate();
        this.showNotification(
          'error',
          'Failed to Load Deployment Details',
          `Unable to fetch details for deployment "${deployment.name}": ${error.message || 'Unknown error occurred'}`
        );
      });
  }

  viewStatefulSetDetails(statefulSet: any) {
    console.log('Fetching statefulset details for:', statefulSet.name, 'in namespace:', statefulSet.namespace);
    this.loadingStatefulSetDetails = true;
    this.showStatefulSetDetails = true;
    this.selectedStatefulSet = null;
    this.requestUpdate();

    const url = `/kubernetes/statefulsets/${statefulSet.namespace}/${statefulSet.name}`;
    console.log('Making API request to:', url);

    Api.get(url)
      .then(response => {
        console.log('StatefulSet details response:', response);
        this.selectedStatefulSet = response;
        this.loadingStatefulSetDetails = false;
        this.requestUpdate();
      })
      .catch(error => {
        console.error('Failed to fetch statefulset details:', error);
        this.loadingStatefulSetDetails = false;
        this.showStatefulSetDetails = false;
        this.requestUpdate();
        this.showNotification(
          'error',
          'Failed to Load StatefulSet Details',
          `Unable to fetch details for statefulset "${statefulSet.name}": ${error.message || 'Unknown error occurred'}`
        );
      });
  }

  viewDaemonSetDetails(daemonSet: any) {
    console.log('Fetching daemonset details for:', daemonSet.name, 'in namespace:', daemonSet.namespace);
    this.loadingDaemonSetDetails = true;
    this.showDaemonSetDetails = true;
    this.selectedDaemonSet = null;
    this.requestUpdate();

    const url = `/kubernetes/daemonsets/${daemonSet.namespace}/${daemonSet.name}`;
    console.log('Making API request to:', url);

    Api.get(url)
      .then(response => {
        console.log('DaemonSet details response:', response);
        this.selectedDaemonSet = response;
        this.loadingDaemonSetDetails = false;
        this.requestUpdate();
      })
      .catch(error => {
        console.error('Failed to fetch daemonset details:', error);
        this.loadingDaemonSetDetails = false;
        this.showDaemonSetDetails = false;
        this.requestUpdate();
        this.showNotification(
          'error',
          'Failed to Load DaemonSet Details',
          `Unable to fetch details for daemonset "${daemonSet.name}": ${error.message || 'Unknown error occurred'}`
        );
      });
  }

  viewJobDetails(job: any) {
    console.log('Fetching job details for:', job.name, 'in namespace:', job.namespace);
    this.loadingJobDetails = true;
    this.showJobDetails = true;
    this.selectedJob = null;
    this.requestUpdate();

    const url = `/kubernetes/jobs/${job.namespace}/${job.name}`;
    console.log('Making API request to:', url);

    Api.get(url)
      .then(response => {
        console.log('Job details response:', response);
        this.selectedJob = response;
        this.loadingJobDetails = false;
        this.requestUpdate();
      })
      .catch(error => {
        console.error('Failed to fetch job details:', error);
        this.loadingJobDetails = false;
        this.showJobDetails = false;
        this.requestUpdate();
        this.showNotification(
          'error',
          'Failed to Load Job Details',
          `Unable to fetch details for job "${job.name}": ${error.message || 'Unknown error occurred'}`
        );
      });
  }

  viewCronJobDetails(cronJob: any) {
    console.log('Fetching cronjob details for:', cronJob.name, 'in namespace:', cronJob.namespace);
    this.loadingCronJobDetails = true;
    this.showCronJobDetails = true;
    this.selectedCronJob = null;
    this.requestUpdate();

    const url = `/kubernetes/cronjobs/${cronJob.namespace}/${cronJob.name}`;
    console.log('Making API request to:', url);

    Api.get(url)
      .then(response => {
        console.log('CronJob details response:', response);
        this.selectedCronJob = response;
        this.loadingCronJobDetails = false;
        this.requestUpdate();
      })
      .catch(error => {
        console.error('Failed to fetch cronjob details:', error);
        this.loadingCronJobDetails = false;
        this.showCronJobDetails = false;
        this.requestUpdate();
        this.showNotification(
          'error',
          'Failed to Load CronJob Details',
          `Unable to fetch details for cronjob "${cronJob.name}": ${error.message || 'Unknown error occurred'}`
        );
      });
  }

  viewPvcDetails(pvc: any) {
    console.log('Fetching PVC details for:', pvc.name, 'in namespace:', pvc.namespace);
    this.loadingPvcDetails = true;
    this.showPvcDetails = true;
    this.selectedPvc = null;
    this.requestUpdate();

    const url = `/kubernetes/pvcs/${pvc.namespace}/${pvc.name}`;
    console.log('Making API request to:', url);

    Api.get(url)
      .then(response => {
        console.log('PVC details response:', response);
        this.selectedPvc = response;
        this.loadingPvcDetails = false;
        this.requestUpdate();
      })
      .catch(error => {
        console.error('Failed to fetch PVC details:', error);
        this.loadingPvcDetails = false;
        this.showPvcDetails = false;
        this.requestUpdate();
        this.showNotification(
          'error',
          'Failed to Load PVC Details',
          `Unable to fetch details for PVC "${pvc.name}": ${error.message || 'Unknown error occurred'}`
        );
      });
  }

  viewPvDetails(pv: any) {
    console.log('Fetching PV details for:', pv.name);
    this.loadingPvDetails = true;
    this.showPvDetails = true;
    this.selectedPv = null;
    this.requestUpdate();

    // PVs are cluster-scoped, so no namespace in the URL
    const url = `/kubernetes/pvs/${pv.name}`;
    console.log('Making API request to:', url);

    Api.get(url)
      .then(response => {
        console.log('PV details response:', response);
        this.selectedPv = response;
        this.loadingPvDetails = false;
        this.requestUpdate();
      })
      .catch(error => {
        console.error('Failed to fetch PV details:', error);
        this.loadingPvDetails = false;
        this.showPvDetails = false;
        this.requestUpdate();
        this.showNotification(
          'error',
          'Failed to Load PV Details',
          `Unable to fetch details for PV "${pv.name}": ${error.message || 'Unknown error occurred'}`
        );
      });
  }

  viewSecretDetails(secret: any) {
    console.log('Fetching secret details for:', secret.name, 'in namespace:', secret.namespace);
    this.loadingSecretDetails = true;
    this.showSecretDetails = true;
    this.selectedSecret = null;
    this.requestUpdate();

    const url = `/kubernetes/secrets/${secret.namespace}/${secret.name}`;
    console.log('Making API request to:', url);

    Api.get(url)
      .then(response => {
        console.log('Secret details response:', response);
        this.selectedSecret = response;
        this.loadingSecretDetails = false;
        this.requestUpdate();
      })
      .catch(error => {
        console.error('Failed to fetch secret details:', error);
        this.loadingSecretDetails = false;
        this.showSecretDetails = false;
        this.requestUpdate();
        this.showNotification(
          'error',
          'Failed to Load Secret Details',
          `Unable to fetch details for secret "${secret.name}": ${error.message || 'Unknown error occurred'}`
        );
      });
  }

  viewConfigMapDetails(configMap: any) {
    console.log('Fetching configmap details for:', configMap.name, 'in namespace:', configMap.namespace);
    this.loadingConfigMapDetails = true;
    this.showConfigMapDetails = true;
    this.selectedConfigMap = null;
    this.requestUpdate();

    const url = `/kubernetes/configmaps/${configMap.namespace}/${configMap.name}`;
    console.log('Making API request to:', url);

    Api.get(url)
      .then(response => {
        console.log('ConfigMap details response:', response);
        this.selectedConfigMap = response;
        this.loadingConfigMapDetails = false;
        this.requestUpdate();
      })
      .catch(error => {
        console.error('Failed to fetch configmap details:', error);
        this.loadingConfigMapDetails = false;
        this.showConfigMapDetails = false;
        this.requestUpdate();
        this.showNotification(
          'error',
          'Failed to Load ConfigMap Details',
          `Unable to fetch details for configmap "${configMap.name}": ${error.message || 'Unknown error occurred'}`
        );
      });
  }

  viewNodeDetails(node: any) {
    console.log('Fetching node details for:', node.name);
    this.loadingNodeDetails = true;
    this.showNodeDetails = true;
    this.selectedNode = null;
    this.requestUpdate();

    // Nodes are cluster-scoped, so no namespace in the URL
    const url = `/kubernetes/nodes/${node.name}`;
    console.log('Making API request to:', url);

    Api.get(url)
      .then(response => {
        console.log('Node details response:', response);
        this.selectedNode = response;
        this.loadingNodeDetails = false;
        this.requestUpdate();
      })
      .catch(error => {
        console.error('Failed to fetch node details:', error);
        this.loadingNodeDetails = false;
        this.showNodeDetails = false;
        this.requestUpdate();
        this.showNotification(
          'error',
          'Failed to Load Node Details',
          `Unable to fetch details for node "${node.name}": ${error.message || 'Unknown error occurred'}`
        );
      });
  }

  editItem(item: any) {
    // Implement edit logic here
    console.log('Editing item:', item);
    this.showNotification(
      'info',
      'Edit Feature',
      `Edit functionality for "${item.name}" is not implemented yet.`
    );
  }

  deleteItem(item: any) {
    this.itemToDelete = item;
    this.showDeleteModal = true;
  }

  async confirmDelete() {
    if (!this.itemToDelete) return;

    this.isDeleting = true;
    const item = this.itemToDelete;

    try {
      // Determine the resource type and API endpoint
      let endpoint = '';
      
      switch (item.type) {
        case 'Pod':
          endpoint = `/kubernetes/pods/${item.namespace}/${item.name}`;
          break;
        case 'Deployment':
          endpoint = `/kubernetes/deployments/${item.namespace}/${item.name}`;
          break;
        case 'StatefulSet':
          endpoint = `/kubernetes/statefulsets/${item.namespace}/${item.name}`;
          break;
        case 'DaemonSet':
          endpoint = `/kubernetes/daemonsets/${item.namespace}/${item.name}`;
          break;
        case 'Job':
          endpoint = `/kubernetes/jobs/${item.namespace}/${item.name}`;
          break;
        case 'CronJob':
          endpoint = `/kubernetes/cronjobs/${item.namespace}/${item.name}`;
          break;
        default:
          throw new Error(`Delete not implemented for ${item.type}`);
      }

      // Call the delete API
      await Api.delete(endpoint);

      // Show success notification
      this.showNotification(
        'success',
        `${item.type} Deleted`,
        `${item.type} "${item.name}" in namespace "${item.namespace}" has been deleted successfully.`
      );

      // Refresh the data
      await this.fetchAllResources();
      
      // Close the modal
      this.closeDeleteModal();
    } catch (error: any) {
      console.error('Failed to delete resource:', error);
      this.showNotification(
        'error',
        'Delete Failed',
        `Failed to delete ${item.type} "${item.name}": ${error.message || 'Unknown error'}`
      );
      this.isDeleting = false;
    }
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.itemToDelete = null;
    this.isDeleting = false;
  }

  renderDeleteModal() {
    if (!this.showDeleteModal || !this.itemToDelete) {
      return '';
    }

    const item = this.itemToDelete;

    return html`
      <div class="modal-overlay" @click=${(e: MouseEvent) => e.target === e.currentTarget && !this.isDeleting && this.closeDeleteModal()}>
        <div class="modal">
          <div class="modal-header">
            <span class="modal-icon warning">⚠️</span>
            <h3 class="modal-title">Confirm Delete</h3>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete this ${item.type.toLowerCase()}?</p>
            <div class="modal-resource-info">
              <div><strong>Type:</strong> ${item.type}</div>
              <div><strong>Name:</strong> ${item.name}</div>
              <div><strong>Namespace:</strong> ${item.namespace || 'N/A'}</div>
            </div>
            <p><strong>This action cannot be undone.</strong></p>
          </div>
          <div class="modal-footer">
            <button 
              class="modal-button cancel" 
              @click=${this.closeDeleteModal}
              ?disabled=${this.isDeleting}
            >
              Cancel
            </button>
            <button 
              class="modal-button delete" 
              @click=${this.confirmDelete}
              ?disabled=${this.isDeleting}
            >
              ${this.isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Workload-specific actions
  handleCreate() {
    console.log('Create button clicked');
    this.showCreateDrawer = true;
    // Pre-populate with a sample YAML template based on the active submenu
    this.createResourceYaml = this.getResourceTemplate();
    // Validate the template
    const validation = this.validateResource(this.createResourceYaml);
    this.isResourceValid = validation.isValid;
    this.validationError = validation.error || '';
    this.requestUpdate();
  }

  private getResourceTemplate(): string {
    // Return a basic template based on the active submenu and tab
    if (this.activeSubmenu === 'workloads') {
      switch (this.activeWorkloadTab) {
        case 'pods':
          return `apiVersion: v1
kind: Pod
metadata:
  name: my-pod
  namespace: default
spec:
  containers:
  - name: nginx
    image: nginx:latest
    ports:
    - containerPort: 80`;
        case 'deployments':
          return `apiVersion: apps/v1
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
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80`;
        case 'statefulsets':
          return `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: my-statefulset
  namespace: default
spec:
  serviceName: my-service
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
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80`;
        case 'daemonsets':
          return `apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: my-daemonset
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: nginx
        image: nginx:latest`;
        case 'jobs':
          return `apiVersion: batch/v1
kind: Job
metadata:
  name: my-job
  namespace: default
spec:
  template:
    spec:
      containers:
      - name: hello
        image: busybox
        command: ['sh', '-c', 'echo "Hello, Kubernetes!" && sleep 30']
      restartPolicy: Never
  backoffLimit: 4`;
        case 'cronjobs':
          return `apiVersion: batch/v1
kind: CronJob
metadata:
  name: my-cronjob
  namespace: default
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: hello
            image: busybox
            command: ['sh', '-c', 'date; echo Hello from the Kubernetes cluster']
          restartPolicy: OnFailure`;
        default:
          return '# Enter your Kubernetes resource YAML here';
      }
    } else if (this.activeSubmenu === 'networks') {
      switch (this.activeNetworkTab) {
        case 'services':
          return `apiVersion: v1
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
      targetPort: 8080
  type: ClusterIP`;
        case 'ingresses':
          return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
  namespace: default
spec:
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: my-service
            port:
              number: 80`;
        default:
          return '# Enter your Kubernetes resource YAML here';
      }
    } else if (this.activeSubmenu === 'storages') {
      switch (this.activeStorageTab) {
        case 'pvc':
          return `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi`;
        case 'pv':
          return `apiVersion: v1
kind: PersistentVolume
metadata:
  name: my-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: /mnt/data`;
        default:
          return '# Enter your Kubernetes resource YAML here';
      }
    } else if (this.activeSubmenu === 'configurations') {
      switch (this.activeConfigurationTab) {
        case 'secrets':
          return `apiVersion: v1
kind: Secret
metadata:
  name: my-secret
  namespace: default
type: Opaque
data:
  username: YWRtaW4=
  password: MWYyZDFlMmU2N2Rm`;
        case 'configmap':
          return `apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config
  namespace: default
data:
  key1: value1
  key2: value2
  app.properties: |
    property1=value1
    property2=value2`;
        default:
          return '# Enter your Kubernetes resource YAML here';
      }
    }
    return '# Enter your Kubernetes resource YAML here';
  }

  private detectFormat(content: string): 'yaml' | 'json' {
    // Trim the content to check
    const trimmed = content.trim();
    
    // Check if it starts with { or [ for JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch (e) {
        // If it fails to parse, it's probably YAML
        return 'yaml';
      }
    }
    
    // Default to YAML
    return 'yaml';
  }

  private validateResource(content: string): { isValid: boolean; error?: string } {
    const trimmed = content.trim();
    
    if (!trimmed) {
      return { isValid: false, error: 'Resource definition cannot be empty' };
    }

    const format = this.detectFormat(trimmed);
    
    if (format === 'json') {
      return this.validateJSON(trimmed);
    } else {
      return this.validateYAML(trimmed);
    }
  }

  private validateJSON(content: string): { isValid: boolean; error?: string } {
    try {
      const parsed = JSON.parse(content);
      
      // Basic Kubernetes resource validation
      if (!parsed.apiVersion) {
        return { isValid: false, error: 'Missing required field: apiVersion' };
      }
      if (!parsed.kind) {
        return { isValid: false, error: 'Missing required field: kind' };
      }
      if (!parsed.metadata) {
        return { isValid: false, error: 'Missing required field: metadata' };
      }
      if (!parsed.metadata.name) {
        return { isValid: false, error: 'Missing required field: metadata.name' };
      }
      
      return { isValid: true };
    } catch (e: any) {
      return { isValid: false, error: `Invalid JSON: ${e.message}` };
    }
  }

  private validateYAML(content: string): { isValid: boolean; error?: string } {
    try {
      // Basic YAML validation without external library
      const lines = content.split('\n');
      let hasApiVersion = false;
      let hasKind = false;
      let hasMetadata = false;
      let hasName = false;
      let inMetadata = false;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('#')) continue;
        
        // Check for required fields
        if (trimmedLine.startsWith('apiVersion:')) {
          hasApiVersion = true;
        } else if (trimmedLine.startsWith('kind:')) {
          hasKind = true;
        } else if (trimmedLine === 'metadata:') {
          hasMetadata = true;
          inMetadata = true;
        } else if (inMetadata && trimmedLine.startsWith('name:')) {
          hasName = true;
          inMetadata = false;
        } else if (inMetadata && !trimmedLine.startsWith(' ') && !trimmedLine.startsWith('\t')) {
          // Left metadata section without finding name
          inMetadata = false;
        }
        
        // Basic syntax checks
        if (trimmedLine.includes(':') && !trimmedLine.includes(': ')) {
          const colonIndex = trimmedLine.indexOf(':');
          if (colonIndex < trimmedLine.length - 1 && trimmedLine[colonIndex + 1] !== ' ') {
            // Check if it's not a time format (HH:MM:SS)
            const beforeColon = trimmedLine.substring(0, colonIndex);
            const afterColon = trimmedLine.substring(colonIndex + 1);
            if (!/^\d+$/.test(beforeColon) || !/^\d+/.test(afterColon)) {
              return { isValid: false, error: `Invalid YAML syntax at line: "${trimmedLine}". Add space after colon.` };
            }
          }
        }
      }
      
      // Check for required fields
      if (!hasApiVersion) {
        return { isValid: false, error: 'Missing required field: apiVersion' };
      }
      if (!hasKind) {
        return { isValid: false, error: 'Missing required field: kind' };
      }
      if (!hasMetadata) {
        return { isValid: false, error: 'Missing required field: metadata' };
      }
      if (!hasName) {
        return { isValid: false, error: 'Missing required field: metadata.name' };
      }
      
      return { isValid: true };
    } catch (e: any) {
      return { isValid: false, error: `Invalid YAML: ${e.message}` };
    }
  }

  private async applyResource() {
    if (!this.createResourceYaml.trim()) {
      this.showNotification(
        'error',
        'Invalid Input',
        'Please enter a valid Kubernetes resource YAML or JSON'
      );
      return;
    }

    try {
      // Detect format
      const format = this.detectFormat(this.createResourceYaml);
      const contentType = format === 'json' ? 'application/json' : 'application/yaml';
      
      console.log('Applying resource with format:', format);
      console.log('Content:', this.createResourceYaml);
      
      // Parse the content to determine resource type
      let resourceData;
      if (format === 'json') {
        resourceData = JSON.parse(this.createResourceYaml.trim());
      } else {
        // Simple YAML parsing to extract kind
        const kindMatch = this.createResourceYaml.match(/^kind:\s*(.+)$/m);
        resourceData = { kind: kindMatch && kindMatch[1] ? kindMatch[1].trim() : '' };
      }
      
      // Determine the API endpoint based on resource kind
      let endpoint = '';
      let resourceTypeName = resourceData.kind || 'resource';
      
      switch (resourceData.kind) {
        case 'Pod':
          endpoint = '/kubernetes/pods';
          break;
        case 'Deployment':
          endpoint = '/kubernetes/deployments';
          break;
        case 'StatefulSet':
          endpoint = '/kubernetes/statefulsets';
          break;
        case 'DaemonSet':
          endpoint = '/kubernetes/daemonsets';
          break;
        case 'Job':
          endpoint = '/kubernetes/jobs';
          break;
        case 'CronJob':
          endpoint = '/kubernetes/cronjobs';
          break;
        case 'Service':
          endpoint = '/kubernetes/services';
          break;
        case 'Ingress':
          endpoint = '/kubernetes/ingresses';
          break;
        case 'PersistentVolumeClaim':
          endpoint = '/kubernetes/pvcs';
          break;
        case 'PersistentVolume':
          endpoint = '/kubernetes/pvs';
          break;
        case 'ConfigMap':
          endpoint = '/kubernetes/configmaps';
          break;
        case 'Secret':
          endpoint = '/kubernetes/secrets';
          break;
        default:
          throw new Error(`Resource type "${resourceData.kind}" is not supported for creation`);
      }
      
      this.showNotification(
        'info',
        'Creating Resource',
        `Creating ${resourceTypeName}...`
      );

      // Send to API
      const response = await Api.postResource(
        endpoint,
        this.createResourceYaml.trim(),
        contentType
      );

      // Success
      this.showCreateDrawer = false;
      this.createResourceYaml = '';
      this.showNotification(
        'success',
        'Resource Created',
        `${resourceTypeName} "${response.metadata?.name || 'resource'}" has been created successfully`
      );
      
      // Refresh the data
      this.fetchAllResources();
    } catch (error: any) {
      console.error('Failed to create resource:', error);
      this.showNotification(
        'error',
        'Creation Failed',
        `Failed to create resource: ${error.message || 'Unknown error'}`
      );
    }
  }

  viewLogs(item: any) {
    console.log('Viewing logs for:', item);
    if (item.type === 'Pod') {
      this.showPodLogs(item);
    } else {
      this.showNotification(
        'info',
        'Logs Viewer',
        `Log viewer for ${item.type} "${item.name}" is not implemented yet.`
      );
    }
  }

  private async showPodLogs(pod: any) {
    try {
      this.logsError = null;
      this.containerLogs = 'Loading logs...';
      this.showLogsDrawer = true;
      
      const response = await Api.get(`/kubernetes/pods/${pod.namespace}/${pod.name}/logs`);
      this.containerLogs = response.logs || 'No logs available';
    } catch (error: any) {
      console.error('Error fetching pod logs:', error);
      this.logsError = error.message || 'Failed to fetch logs';
    }
  }

  private highlightSearchTerm(text: string, term: string): string {
    if (!term || !text) return text;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark style="background-color: #ffeb3b; color: #000; padding: 0 2px;">$1</mark>');
  }

  renderLogsDrawer() {
    if (!this.showLogsDrawer) return html``;
    
    return html`
      <div class="drawer">
        <button class="close-btn" @click=${() => { 
          this.showLogsDrawer = false; 
          this.logsError = null;
          this.containerLogs = '';
          this.logsSearchTerm = '';
        }}>✕</button>
        <div class="drawer-content">
          <div class="logs-header">
            <h2 class="logs-title">Pod Logs</h2>
            <div class="search-wrapper">
              <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                class="search-input"
                type="text"
                placeholder="Search logs..."
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
      </div>
    `;
  }

  renderCreateDrawer() {
    if (!this.showCreateDrawer) return html``;
    
    const detectedFormat = this.detectFormat(this.createResourceYaml);
    
    return html`
      <div class="drawer">
        <button class="close-btn" @click=${() => { 
          this.showCreateDrawer = false; 
          this.createResourceYaml = '';
          this.isResourceValid = false;
          this.validationError = '';
        }}>✕</button>
        <div class="drawer-content">
          <div class="logs-header">
            <h2 class="logs-title">Create Resource</h2>
          </div>
          <div style="display: flex; flex-direction: column; height: calc(100% - 60px);">
            <div style="margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="color: var(--vscode-descriptionForeground);">
                  Enter your Kubernetes resource definition:
                </div>
                <div style="
                  display: inline-flex;
                  align-items: center;
                  padding: 6px 16px;
                  background: ${detectedFormat === 'json' ? 'rgba(55, 148, 255, 0.1)' : 'rgba(137, 209, 133, 0.1)'};
                  border: 1px solid ${detectedFormat === 'json' ? '#3794ff' : '#89d185'};
                  border-radius: 6px;
                  font-size: 13px;
                  font-weight: 600;
                  color: ${detectedFormat === 'json' ? '#3794ff' : '#89d185'};
                  transition: all 0.2s ease;
                ">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 8px;">
                    ${detectedFormat === 'json' ? html`
                      <!-- JSON icon -->
                      <path d="M6 2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-11z"/>
                      <path d="M3.5 6a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5H5V6H3.5z"/>
                      <path d="M11 6v4h1.5a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5H11z"/>
                    ` : html`
                      <!-- YAML icon -->
                      <path d="M2 2v12h12V2H2zm11 11H3V3h10v10z"/>
                      <path d="M5 5h2v1H5V5zm3 0h3v1H8V5zM5 7h1v1H5V7zm2 0h4v1H7V7zM5 9h2v1H5V9zm3 0h3v1H8V9z"/>
                    `}
                  </svg>
                  ${detectedFormat.toUpperCase()} Format Detected
                </div>
              </div>
              <div style="margin-top: 8px; font-size: 12px; color: var(--vscode-descriptionForeground);">
                Supports both YAML and JSON formats. Content type is auto-detected based on your input.
              </div>
            </div>
            ${this.validationError && this.createResourceYaml.trim() ? html`
              <div style="
                margin-bottom: 12px;
                padding: 8px 12px;
                background: rgba(248, 113, 113, 0.1);
                border: 1px solid rgba(248, 113, 113, 0.3);
                border-radius: 4px;
                color: var(--vscode-errorForeground, #f87171);
                font-size: 13px;
                display: flex;
                align-items: center;
                gap: 8px;
              ">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"/>
                  <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                </svg>
                ${this.validationError}
              </div>
            ` : ''}
            <textarea
              style="
                flex: 1;
                width: 100%;
                min-height: 500px;
                padding: 16px;
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                font-size: 14px;
                line-height: 1.6;
                background: var(--vscode-editor-background, #1e1e1e);
                color: var(--vscode-editor-foreground, #d4d4d4);
                border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border, #454545));
                border-radius: 6px;
                resize: vertical;
                outline: none;
                box-sizing: border-box;
                transition: border-color 0.2s;
              "
              .value=${this.createResourceYaml}
              @input=${(e: any) => {
                this.createResourceYaml = e.target.value;
                const validation = this.validateResource(e.target.value);
                this.isResourceValid = validation.isValid;
                this.validationError = validation.error || '';
                this.requestUpdate();
              }}
              @focus=${(e: any) => {
                e.target.style.borderColor = 'var(--vscode-focusBorder, #007acc)';
              }}
              @blur=${(e: any) => {
                e.target.style.borderColor = 'var(--vscode-widget-border, var(--vscode-panel-border, #454545))';
              }}
              placeholder="# Enter your Kubernetes resource YAML or JSON here\n\nExample YAML:\napiVersion: v1\nkind: Pod\nmetadata:\n  name: my-pod\n  namespace: default\nspec:\n  containers:\n  - name: nginx\n    image: nginx:latest\n\nExample JSON:\n{\n  \"apiVersion\": \"v1\",\n  \"kind\": \"Pod\",\n  \"metadata\": {\n    \"name\": \"my-pod\",\n    \"namespace\": \"default\"\n  },\n  \"spec\": {\n    \"containers\": [{\n      \"name\": \"nginx\",\n      \"image\": \"nginx:latest\"\n    }]\n  }\n}"
            ></textarea>
            <div style="margin-top: 16px; display: flex; justify-content: flex-end; gap: 12px;">
              <button 
                class="btn" 
                style="
                  padding: 8px 24px;
                  background: var(--vscode-button-secondaryBackground);
                  color: var(--vscode-button-secondaryForeground);
                  border: 1px solid var(--vscode-button-border);
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 13px;
                  font-weight: 500;
                  transition: all 0.2s;
                "
                @mouseover=${(e: any) => {
                  e.target.style.background = 'var(--vscode-button-secondaryHoverBackground)';
                }}
                @mouseout=${(e: any) => {
                  e.target.style.background = 'var(--vscode-button-secondaryBackground)';
                }}
                @click=${() => {
                  this.showCreateDrawer = false;
                  this.createResourceYaml = '';
                  this.isResourceValid = false;
                  this.validationError = '';
                }}
              >
                Cancel
              </button>
              <button 
                class="btn btn-primary" 
                style="
                  padding: 8px 24px;
                  font-size: 13px;
                  font-weight: 500;
                  ${!this.isResourceValid ? `
                    opacity: 0.5;
                    cursor: not-allowed;
                    background: var(--vscode-button-secondaryBackground);
                  ` : ''}
                "
                ?disabled=${!this.isResourceValid}
                @click=${() => this.isResourceValid && this.applyResource()}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Network-specific actions
  viewEndpoints(item: any) {
    console.log('Viewing endpoints for:', item);
    this.showNotification(
      'info',
      'Endpoint Information',
      `${item.name} endpoints: ${item.endpoints}`
    );
    // In a real app, you would show detailed endpoint information
  }

  // Storage-specific actions
  expandVolume(item: any) {
    console.log('Expanding volume:', item);
    const newSize = prompt(`Enter new size for ${item.name} (current: ${item.capacity}):`);
    if (newSize) {
      this.showNotification(
        'success',
        'Volume Expansion Initiated',
        `Expanding "${item.name}" to ${newSize}. This feature is not fully implemented yet.`
      );
      // In a real app, you would make an API call to expand the volume
    }
  }

  // Configuration-specific actions
  viewKeys(item: any) {
    console.log('Viewing keys for:', item);
    this.showNotification(
      'info',
      'Configuration Keys',
      `"${item.name}" contains ${item.keys} keys. Detailed key viewer is not implemented yet.`
    );
    // In a real app, you would show the actual keys (for ConfigMaps) or key names (for Secrets)
  }

  // Helm-specific actions
  upgradeRelease(item: any) {
    console.log('Upgrading release:', item);
    const newChart = prompt(`Enter new chart version for ${item.name}:`, item.chart);
    if (newChart) {
      this.showNotification(
        'success',
        'Helm Release Upgrade',
        `Upgrading "${item.name}" to ${newChart}. This feature is not fully implemented yet.`
      );
      // In a real app, you would make an API call to upgrade the Helm release
    }
  }

  rollbackRelease(item: any) {
    console.log('Rolling back release:', item);
    const targetRevision = prompt(`Enter revision to rollback to for ${item.name}:`, (parseInt(item.revision) - 1).toString());
    if (targetRevision && !isNaN(parseInt(targetRevision))) {
      this.showNotification(
        'success',
        'Helm Release Rollback',
        `Rolling back "${item.name}" to revision ${targetRevision}. This feature is not fully implemented yet.`
      );
      // In a real app, you would make an API call to rollback the Helm release
    }
  }

  uninstallRelease(item: any) {
    console.log('Uninstalling release:', item);
    if (confirm(`Are you sure you want to uninstall ${item.name}? This action cannot be undone.`)) {
      this.showNotification(
        'success',
        'Helm Release Uninstall',
        `Uninstalling "${item.name}". This feature is not fully implemented yet.`
      );
      // Now activeSubmenu directly matches property names (all plural)
      const currentData = this[this.activeSubmenu as keyof KubernetesTab] as any[];
      if (currentData && Array.isArray(currentData)) {
        const index = currentData.indexOf(item);
        if (index > -1) {
          currentData.splice(index, 1);
          this.requestUpdate();
        }
      }
      // In a real app, you would make an API call to uninstall the Helm release
    }
  }

  // Node-specific actions
  drainNode(node: any) {
    console.log('Draining node:', node);
    if (confirm(`Are you sure you want to drain node ${node.name}? This will evict all pods from the node.`)) {
      this.showNotification(
        'warning',
        'Node Drain Initiated',
        `Draining node "${node.name}". All pods will be evicted. This feature is not fully implemented yet.`
      );
      // In a real app, you would make an API call to drain the node
      // kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
    }
  }

  cordonNode(node: any) {
    console.log('Cordoning node:', node);
    if (confirm(`Are you sure you want to cordon node ${node.name}? This will prevent new pods from being scheduled on this node.`)) {
      this.showNotification(
        'info',
        'Node Cordoned',
        `Node "${node.name}" has been cordoned. No new pods will be scheduled on this node. This feature is not fully implemented yet.`
      );
      // In a real app, you would make an API call to cordon the node
      // kubectl cordon <node-name>
    }
  }
}

customElements.define('kubernetes-tab', KubernetesTab);
