import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { Api } from '../api.js';

class KubernetesTab extends LitElement {
  @property({ type: String }) activeSubmenu = 'workloads';
  @property({ type: String }) subRoute: string | null = null;
  @property({ type: Array }) workloads = [];
  @property({ type: Array }) networks = [];
  @property({ type: Array }) storages = [];
  @property({ type: Array }) configurations = [];
  @property({ type: Array }) helms = [];
  @property({ type: Array }) nodes = [];
  @property({ type: Array }) crds = [];
  @property({ type: String }) error = null;
  @property({ type: String }) activeWorkloadTab = 'pods';
  @property({ type: String }) activeStorageTab = 'pvc';
  @property({ type: String }) activeConfigurationTab = 'secrets';
  @property({ type: String }) activeHelmTab = 'releases';
  @property({ type: Boolean }) showPodDetails = false;
  @property({ type: Object }) selectedPod = null;
  @property({ type: Boolean }) loadingPodDetails = false;
  @property({ type: Boolean }) showCrdDetails = false;
  @property({ type: Object }) selectedCrd = null;
  @property({ type: Boolean }) loadingCrdDetails = false;
  @property({ type: Boolean }) showDeploymentDetails = false;
  @property({ type: Object }) selectedDeployment = null;
  @property({ type: Boolean }) loadingDeploymentDetails = false;
  @property({ type: Boolean }) showStatefulSetDetails = false;
  @property({ type: Object }) selectedStatefulSet = null;
  @property({ type: Boolean }) loadingStatefulSetDetails = false;
  @property({ type: Boolean }) showDaemonSetDetails = false;
  @property({ type: Object }) selectedDaemonSet = null;
  @property({ type: Boolean }) loadingDaemonSetDetails = false;
  @property({ type: Array }) namespaces = [];
  @property({ type: String }) selectedNamespace = 'all';
  @property({ type: Boolean }) showNamespaceDropdown = false;
  @property({ type: String }) namespaceSearchQuery = '';
  @property({ type: Array }) notifications = [];
  @property({ type: Number }) notificationId = 0;

  static styles = css`
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
      background: var(--vscode-accent);
      color: white;
    }

    .btn-primary:hover {
      background: var(--vscode-accent-hover);
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
      margin-bottom: 1.5rem;
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
      const allData = this[this.activeSubmenu] || [];
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

  renderWorkloadTable(data) {
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
          ${data.map((item, index) => html`
            <tr>
              <td>
                ${(item.type === 'Pod' || item.type === 'Deployment' || item.type === 'StatefulSet' || item.type === 'DaemonSet')
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
                  <button class="action-dots" @click=${(e) => this.toggleActionMenu(e, `k8s-workload-${index}`)}>⋮</button>
                  <div class="action-dropdown" id="k8s-workload-${index}">
                    <button @click=${() => { this.closeAllMenus(); this.viewDetails(item); }}>View Details</button>
                    <button @click=${() => { this.closeAllMenus(); this.scalePods(item); }}>Scale</button>
                    <button @click=${() => { this.closeAllMenus(); this.viewLogs(item); }}>View Logs</button>
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

  renderNetworksTable(data) {
    return html`
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Namespace</th>
            <th>Status</th>
            <th>Endpoints</th>
            <th>Age</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((item, index) => html`
            <tr>
              <td>${item.name}</td>
              <td>${item.type}</td>
              <td>${item.namespace}</td>
              <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
              <td>${item.endpoints}</td>
              <td>${item.age}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e) => this.toggleActionMenu(e, `k8s-networks-${index}`)}>⋮</button>
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
  }

  renderStorageTable(data) {
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
          ${data.map((item, index) => html`
            <tr>
              <td>${item.name}</td>
              <td>${item.type}</td>
              <td>${item.namespace}</td>
              <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
              <td>${item.capacity}</td>
              <td>${item.accessMode}</td>
              <td>${item.age}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e) => this.toggleActionMenu(e, `k8s-storage-${index}`)}>⋮</button>
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

  renderConfigurationsTable(data) {
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
          ${data.map((item, index) => html`
            <tr>
              <td>${item.name}</td>
              <td>${item.type}</td>
              <td>${item.namespace}</td>
              <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
              <td>${item.keys}</td>
              <td>${item.age}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e) => this.toggleActionMenu(e, `k8s-configurations-${index}`)}>⋮</button>
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

  renderHelmTable(data) {
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
          ${data.map((item, index) => html`
            <tr>
              <td>${item.name}</td>
              <td>${item.namespace}</td>
              <td>${item.revision}</td>
              <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
              <td>${item.chart}</td>
              <td>${item.updated}</td>
              <td>
                <div class="action-menu">
                  <button class="action-dots" @click=${(e) => this.toggleActionMenu(e, `k8s-helm-${index}`)}>⋮</button>
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

  renderNodesTable(data) {
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
            <th>Labels</th>
            <th>Annotations</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((node, index) => html`
            <tr>
              <td>${node.name}</td>
              <td>${node.status}</td>
              <td>${Array.isArray(node.roles) ? node.roles.join(', ') : (node.roles || '-')}</td>
              <td>${node.age}</td>
              <td>${node.version}</td>
              <td>${node.internalIP}</td>
              <td>${node.externalIP || '-'}</td>
              <td>${node.osImage}</td>
              <td>${node.kernelVersion}</td>
              <td>${node.containerRuntime}</td>
              <td>${this.renderObjectAsKeyValue(node.labels)}</td>
              <td>${this.renderObjectAsKeyValue(node.annotations)}</td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  renderCrdTable(data) {
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
          ${data.map((crd, index) => html`
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
                  <button class="action-dots" @click=${(e) => this.toggleActionMenu(e, `k8s-crd-${index}`)}>⋮</button>
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
    let data = this[this.activeSubmenu] || [];
    
    // If viewing workloads, filter by active workload tab
    if (this.activeSubmenu === 'workloads') {
      data = this.getFilteredWorkloadData();
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
      data = data.filter(item => item.namespace === this.selectedNamespace);
    }
    
    // Apply search query filter
    if (this.searchQuery) {
      data = data.filter(item => JSON.stringify(item).toLowerCase().includes(this.searchQuery));
    }
    
    return data;
  }

  private getFilteredWorkloadData(): Array<any> {
    const allWorkloads = this.workloads || [];
    
    switch (this.activeWorkloadTab) {
      case 'pods':
        return allWorkloads.filter(item => item.type === 'Pod');
      case 'deployments':
        return allWorkloads.filter(item => item.type === 'Deployment');
      case 'statefulsets':
        return allWorkloads.filter(item => item.type === 'StatefulSet');
      case 'daemonsets':
        return allWorkloads.filter(item => item.type === 'DaemonSet');
      case 'jobs':
        return allWorkloads.filter(item => item.type === 'Job');
      case 'cronjobs':
        return allWorkloads.filter(item => item.type === 'CronJob');
      default:
        return allWorkloads;
    }
  }

  private getFilteredStorageData(): Array<any> {
    const allStorages = this.storages || [];
    
    switch (this.activeStorageTab) {
      case 'pvc':
        return allStorages.filter(item => item.type === 'PersistentVolumeClaim');
      case 'pv':
        return allStorages.filter(item => item.type === 'PersistentVolume');
      default:
        return allStorages;
    }
  }

  private getFilteredConfigurationData(): Array<any> {
    const allConfigurations = this.configurations || [];
    
    switch (this.activeConfigurationTab) {
      case 'secrets':
        return allConfigurations.filter(item => item.type === 'Secret');
      case 'configmap':
        return allConfigurations.filter(item => item.type === 'ConfigMap');
      default:
        return allConfigurations;
    }
  }

  private getFilteredHelmData(): Array<any> {
    const allHelms = this.helms || [];
    
    switch (this.activeHelmTab) {
      case 'releases':
        return allHelms.filter(item => item.type === 'Release');
      case 'charts':
        return allHelms.filter(item => item.type === 'Chart');
      default:
        return allHelms;
    }
  }

  private handleWorkloadTabClick(tab: string) {
    this.activeWorkloadTab = tab;
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
          <button class="close-button" @click="${() => this.showPodDetails = false}">&#x2715;</button>
          <h2>Pod Details</h2>
          <div class="loading-state">Loading pod details...</div>
        </div>
      `;
    }

    return html`
      <div class="pod-details-drawer">
        <button class="close-button" @click="${() => this.showPodDetails = false}">&#x2715;</button>
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
          <button class="close-button" @click="${() => this.showCrdDetails = false}">&#x2715;</button>
          <h2>CRD Details</h2>
          <div class="loading-state">Loading CRD details...</div>
        </div>
      `;
    }

    return html`
      <div class="pod-details-drawer crd-details-drawer">
        <button class="close-button" @click="${() => this.showCrdDetails = false}">&#x2715;</button>
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
          <button class="close-button" @click="${() => this.showDeploymentDetails = false}">&#x2715;</button>
          <h2>Deployment Details</h2>
          <div class="loading-state">Loading deployment details...</div>
        </div>
      `;
    }

    return html`
      <div class="pod-details-drawer crd-details-drawer">
        <button class="close-button" @click="${() => this.showDeploymentDetails = false}">&#x2715;</button>
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
          <button class="close-button" @click="${() => this.showStatefulSetDetails = false}">&#x2715;</button>
          <h2>StatefulSet Details</h2>
          <div class="loading-state">Loading statefulset details...</div>
        </div>
      `;
    }

    return html`
      <div class="pod-details-drawer">
        <button class="close-button" @click="${() => this.showStatefulSetDetails = false}">&#x2715;</button>
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
          <button class="close-button" @click="${() => this.showDaemonSetDetails = false}">&#x2715;</button>
          <h2>DaemonSet Details</h2>
          <div class="loading-state">Loading daemonset details...</div>
        </div>
      `;
    }

    return html`
      <div class="pod-details-drawer">
        <button class="close-button" @click="${() => this.showDaemonSetDetails = false}">&#x2715;</button>
        <h2>DaemonSet Details</h2>
        <div class="pod-details-content">
          ${this.renderDaemonSetDetailContent(this.selectedDaemonSet)}
        </div>
      </div>
    `;
  }

  renderStatefulSetDetailContent(data: any) {
    if (!data) {
      return html`<div class="no-data">No data available</div>`;
    }

    // Handle API response structure
    const statefulSetData = data.statefulset_detail || data;

    console.log('Processing statefulset data:', statefulSetData);

    return html`
      <div class="detail-sections">
        <!-- Basic Information -->
        <div class="detail-section">
          <h3>Basic Information</h3>
          ${this.renderDetailItem('Name', statefulSetData.name)}
          ${this.renderDetailItem('Namespace', statefulSetData.namespace)}
          ${this.renderDetailItem('UID', statefulSetData.uid)}
          ${this.renderDetailItem('Resource Version', statefulSetData.resourceVersion)}
          ${this.renderDetailItem('Creation Timestamp', statefulSetData.creationTimestamp)}
          ${this.renderDetailItem('Age', statefulSetData.age)}
          ${this.renderDetailItem('Generation', statefulSetData.generation)}
        </div>

        <!-- Status Information -->
        <div class="detail-section">
          <h3>Status</h3>
          ${this.renderDetailItem('Replicas', statefulSetData.replicas)}
          ${this.renderDetailItem('Ready Replicas', statefulSetData.readyReplicas)}
          ${this.renderDetailItem('Current Replicas', statefulSetData.currentReplicas)}
          ${this.renderDetailItem('Updated Replicas', statefulSetData.updatedReplicas)}
          ${this.renderDetailItem('Observed Generation', statefulSetData.observedGeneration)}
        </div>

        <!-- Update Strategy -->
        ${statefulSetData.updateStrategy ? html`
          <div class="detail-section">
            <h3>Update Strategy</h3>
            ${this.renderDetailItem('Type', statefulSetData.updateStrategy.type)}
            ${statefulSetData.updateStrategy.rollingUpdate ? html`
              <div class="detail-item nested">
                <strong class="detail-key">Rolling Update:</strong>
                <div class="nested-content">
                  ${this.renderDetailItem('Partition', statefulSetData.updateStrategy.rollingUpdate.partition)}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Selector -->
        ${statefulSetData.selector ? html`
          <div class="detail-section">
            <h3>Selector</h3>
            ${this.renderDetailItem('Match Labels', statefulSetData.selector.matchLabels, true)}
          </div>
        ` : ''}

        <!-- Labels -->
        ${statefulSetData.labels && Object.keys(statefulSetData.labels).length > 0 ? html`
          <div class="detail-section">
            <h3>Labels</h3>
            ${this.renderObjectAsKeyValue(statefulSetData.labels)}
          </div>
        ` : ''}

        <!-- Annotations -->
        ${statefulSetData.annotations && Object.keys(statefulSetData.annotations).length > 0 ? html`
          <div class="detail-section">
            <h3>Annotations</h3>
            ${this.renderObjectAsKeyValue(statefulSetData.annotations)}
          </div>
        ` : ''}

        <!-- Template -->
        ${statefulSetData.template ? html`
          <div class="detail-section">
            <h3>Pod Template</h3>
            ${statefulSetData.template.metadata?.labels ? 
              this.renderDetailItem('Pod Labels', statefulSetData.template.metadata.labels, true) : ''}
            ${statefulSetData.template.spec?.containers && statefulSetData.template.spec.containers.length > 0 ? html`
              <div class="detail-item nested">
                <strong class="detail-key">Containers:</strong>
                <div class="nested-content">
                  ${statefulSetData.template.spec.containers.map((container, index) => html`
                    <div class="detail-item nested">
                      <strong class="detail-key">Container ${index + 1}:</strong>
                      <div class="nested-content">
                        ${this.renderDetailItem('Name', container.name)}
                        ${this.renderDetailItem('Image', container.image)}
                        ${container.ports && container.ports.length > 0 ? 
                          this.renderDetailItem('Ports', container.ports.map(p => `${p.containerPort}/${p.protocol || 'TCP'}`).join(', ')) : ''}
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
        ${statefulSetData.conditions && statefulSetData.conditions.length > 0 ? html`
          <div class="detail-section">
            <h3>Conditions</h3>
            ${statefulSetData.conditions.map((condition) => html`
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
            `)}
          </div>
        ` : ''}

        <!-- Raw Data -->
        <div class="detail-section">
          <h3>Raw Data</h3>
          <details>
            <summary>View raw statefulset data</summary>
            <pre class="raw-data">${JSON.stringify(statefulSetData, null, 2)}</pre>
          </details>
        </div>
      </div>
    `;
  }

  renderDaemonSetDetailContent(data: any) {
    if (!data) {
      return html`<div class="no-data">No data available</div>`;
    }

    // Handle API response structure
    const daemonSetData = data.daemonset_detail || data;

    console.log('Processing daemonset data:', daemonSetData);

    return html`
      <div class="detail-sections">
        <!-- Basic Information -->
        <div class="detail-section">
          <h3>Basic Information</h3>
          ${this.renderDetailItem('Name', daemonSetData.name)}
          ${this.renderDetailItem('Namespace', daemonSetData.namespace)}
          ${this.renderDetailItem('UID', daemonSetData.uid)}
          ${this.renderDetailItem('Resource Version', daemonSetData.resourceVersion)}
          ${this.renderDetailItem('Creation Timestamp', daemonSetData.creationTimestamp)}
          ${this.renderDetailItem('Age', daemonSetData.age)}
          ${this.renderDetailItem('Generation', daemonSetData.generation)}
        </div>

        <!-- Status Information -->
        <div class="detail-section">
          <h3>Status</h3>
          ${this.renderDetailItem('Current Number Scheduled', daemonSetData.currentNumberScheduled)}
          ${this.renderDetailItem('Desired Number Scheduled', daemonSetData.desiredNumberScheduled)}
          ${this.renderDetailItem('Number Ready', daemonSetData.numberReady)}
          ${this.renderDetailItem('Number Available', daemonSetData.numberAvailable)}
          ${this.renderDetailItem('Number Unavailable', daemonSetData.numberUnavailable)}
          ${this.renderDetailItem('Number Misscheduled', daemonSetData.numberMisscheduled)}
          ${this.renderDetailItem('Updated Number Scheduled', daemonSetData.updatedNumberScheduled)}
          ${this.renderDetailItem('Observed Generation', daemonSetData.observedGeneration)}
        </div>

        <!-- Update Strategy -->
        ${daemonSetData.updateStrategy ? html`
          <div class="detail-section">
            <h3>Update Strategy</h3>
            ${this.renderDetailItem('Type', daemonSetData.updateStrategy.type)}
            ${daemonSetData.updateStrategy.rollingUpdate ? html`
              <div class="detail-item nested">
                <strong class="detail-key">Rolling Update:</strong>
                <div class="nested-content">
                  ${this.renderDetailItem('Max Unavailable', daemonSetData.updateStrategy.rollingUpdate.maxUnavailable)}
                  ${this.renderDetailItem('Max Surge', daemonSetData.updateStrategy.rollingUpdate.maxSurge)}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Selector -->
        ${daemonSetData.selector ? html`
          <div class="detail-section">
            <h3>Selector</h3>
            ${this.renderDetailItem('Match Labels', daemonSetData.selector.matchLabels, true)}
          </div>
        ` : ''}

        <!-- Labels -->
        ${daemonSetData.labels && Object.keys(daemonSetData.labels).length > 0 ? html`
          <div class="detail-section">
            <h3>Labels</h3>
            ${this.renderObjectAsKeyValue(daemonSetData.labels)}
          </div>
        ` : ''}

        <!-- Annotations -->
        ${daemonSetData.annotations && Object.keys(daemonSetData.annotations).length > 0 ? html`
          <div class="detail-section">
            <h3>Annotations</h3>
            ${this.renderObjectAsKeyValue(daemonSetData.annotations)}
          </div>
        ` : ''}

        <!-- Template -->
        ${daemonSetData.template ? html`
          <div class="detail-section">
            <h3>Pod Template</h3>
            ${daemonSetData.template.metadata?.labels ? 
              this.renderDetailItem('Pod Labels', daemonSetData.template.metadata.labels, true) : ''}
            ${daemonSetData.template.spec?.containers && daemonSetData.template.spec.containers.length > 0 ? html`
              <div class="detail-item nested">
                <strong class="detail-key">Containers:</strong>
                <div class="nested-content">
                  ${daemonSetData.template.spec.containers.map((container, index) => html`
                    <div class="detail-item nested">
                      <strong class="detail-key">Container ${index + 1}:</strong>
                      <div class="nested-content">
                        ${this.renderDetailItem('Name', container.name)}
                        ${this.renderDetailItem('Image', container.image)}
                        ${container.ports && container.ports.length > 0 ? 
                          this.renderDetailItem('Ports', container.ports.map(p => `${p.containerPort}/${p.protocol || 'TCP'}`).join(', ')) : ''}
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
        ${daemonSetData.conditions && daemonSetData.conditions.length > 0 ? html`
          <div class="detail-section">
            <h3>Conditions</h3>
            ${daemonSetData.conditions.map((condition) => html`
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
            `)}
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

    // Handle the actual API response structure where data might be under 'deployment_detail' key
    const deploymentData = data.deployment_detail || data;
    
    console.log('Processing deployment data:', deploymentData);

    return html`
      <div class="detail-sections">
        <!-- Basic Information -->
        <div class="detail-section">
          <h3>Basic Information</h3>
          ${this.renderDetailItem('Name', deploymentData.name)}
          ${this.renderDetailItem('Namespace', deploymentData.namespace)}
          ${this.renderDetailItem('UID', deploymentData.uid)}
          ${this.renderDetailItem('Resource Version', deploymentData.resourceVersion)}
          ${this.renderDetailItem('Creation Timestamp', deploymentData.creationTimestamp)}
          ${this.renderDetailItem('Age', deploymentData.age)}
          ${this.renderDetailItem('Generation', deploymentData.generation)}
        </div>

        <!-- Spec Information -->
        ${deploymentData.spec ? html`
          <div class="detail-section">
            <h3>Specification</h3>
            ${this.renderDetailItem('Replicas', deploymentData.spec.replicas)}
            ${this.renderDetailItem('Revision History Limit', deploymentData.spec.revisionHistoryLimit)}
            ${this.renderDetailItem('Progress Deadline Seconds', deploymentData.spec.progressDeadlineSeconds)}
          </div>
        ` : ''}

        <!-- Status Information -->
        ${deploymentData.status ? html`
          <div class="detail-section">
            <h3>Status</h3>
            ${this.renderDetailItem('Observed Generation', deploymentData.status.observedGeneration)}
            ${this.renderDetailItem('Replicas', deploymentData.status.replicas)}
            ${this.renderDetailItem('Updated Replicas', deploymentData.status.updatedReplicas)}
            ${this.renderDetailItem('Ready Replicas', deploymentData.status.readyReplicas)}
            ${this.renderDetailItem('Available Replicas', deploymentData.status.availableReplicas)}
            ${this.renderDetailItem('Unavailable Replicas', deploymentData.status.unavailableReplicas)}
          </div>
        ` : ''}

        <!-- Strategy -->
        ${deploymentData.spec?.strategy ? html`
          <div class="detail-section">
            <h3>Deployment Strategy</h3>
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
        ${deploymentData.spec?.selector ? html`
          <div class="detail-section">
            <h3>Selector</h3>
            ${this.renderDetailItem('Match Labels', deploymentData.spec.selector.matchLabels, true)}
          </div>
        ` : ''}

        <!-- Labels -->
        ${deploymentData.labels && Object.keys(deploymentData.labels).length > 0 ? html`
          <div class="detail-section">
            <h3>Labels</h3>
            ${this.renderObjectAsKeyValue(deploymentData.labels)}
          </div>
        ` : ''}

        <!-- Annotations -->
        ${deploymentData.annotations && Object.keys(deploymentData.annotations).length > 0 ? html`
          <div class="detail-section">
            <h3>Annotations</h3>
            ${this.renderObjectAsKeyValue(deploymentData.annotations)}
          </div>
        ` : ''}

        <!-- Pod Template -->
        ${deploymentData.spec?.template ? html`
          <div class="detail-section">
            <h3>Pod Template</h3>
            
            <!-- Pod Template Labels -->
            ${deploymentData.spec.template.metadata?.labels ? 
              this.renderDetailItem('Pod Labels', deploymentData.spec.template.metadata.labels, true) : ''}
            
            <!-- Pod Template Spec -->
            ${deploymentData.spec.template.spec ? html`
              <!-- Service Account -->
              ${this.renderDetailItem('Service Account', deploymentData.spec.template.spec.serviceAccountName)}
              ${this.renderDetailItem('DNS Policy', deploymentData.spec.template.spec.dnsPolicy)}
              ${this.renderDetailItem('Restart Policy', deploymentData.spec.template.spec.restartPolicy)}
              ${this.renderDetailItem('Termination Grace Period', deploymentData.spec.template.spec.terminationGracePeriodSeconds + 's')}
              ${this.renderDetailItem('Scheduler Name', deploymentData.spec.template.spec.schedulerName)}
              
              <!-- Security Context -->
              ${deploymentData.spec.template.spec.securityContext ? html`
                <div class="detail-item nested">
                  <strong class="detail-key">Security Context:</strong>
                  <div class="nested-content">
                    ${this.renderDetailItem('FS Group', deploymentData.spec.template.spec.securityContext.fsGroup)}
                    ${deploymentData.spec.template.spec.securityContext.seccompProfile ? 
                      this.renderDetailItem('Seccomp Profile', deploymentData.spec.template.spec.securityContext.seccompProfile.type) : ''}
                  </div>
                </div>
              ` : ''}
              
              <!-- Affinity -->
              ${deploymentData.spec.template.spec.affinity ? html`
                <div class="detail-item nested">
                  <strong class="detail-key">Affinity:</strong>
                  <div class="nested-content">
                    ${deploymentData.spec.template.spec.affinity.podAntiAffinity ? 
                      this.renderDetailItem('Pod Anti-Affinity', 'Configured', false) : ''}
                  </div>
                </div>
              ` : ''}
              
              <!-- Volumes -->
              ${deploymentData.spec.template.spec.volumes && deploymentData.spec.template.spec.volumes.length > 0 ? html`
                <div class="detail-item nested">
                  <strong class="detail-key">Volumes:</strong>
                  <div class="nested-content">
                    ${deploymentData.spec.template.spec.volumes.map((volume, index) => html`
                      <div class="detail-item">
                        <strong class="detail-key">${volume.name}:</strong>
                        <span class="detail-value">
                          ${volume.persistentVolumeClaim ? 
                            `PVC: ${volume.persistentVolumeClaim.claimName}` : 
                            this.formatValue(volume)}
                        </span>
                      </div>
                    `)}
                  </div>
                </div>
              ` : ''}
              
              <!-- Containers -->
              ${deploymentData.spec.template.spec.containers && deploymentData.spec.template.spec.containers.length > 0 ? html`
                <div class="detail-item nested">
                  <strong class="detail-key">Containers:</strong>
                  <div class="nested-content">
                    ${deploymentData.spec.template.spec.containers.map((container, index) => html`
                      <div class="detail-item nested">
                        <strong class="detail-key">Container ${index + 1}: ${container.name}</strong>
                        <div class="nested-content">
                          ${this.renderDetailItem('Image', container.image)}
                          ${this.renderDetailItem('Image Pull Policy', container.imagePullPolicy)}
                          
                          <!-- Ports -->
                          ${container.ports && container.ports.length > 0 ? html`
                            <div class="detail-item nested">
                              <strong class="detail-key">Ports:</strong>
                              <div class="nested-content">
                                ${container.ports.map(port => html`
                                  <div class="detail-item">
                                    <strong class="detail-key">${port.name || 'Port'}:</strong>
                                    <span class="detail-value">${port.containerPort}/${port.protocol || 'TCP'}</span>
                                  </div>
                                `)}
                              </div>
                            </div>
                          ` : ''}
                          
                          <!-- Environment Variables -->
                          ${container.env && container.env.length > 0 ? html`
                            <div class="detail-item nested">
                              <strong class="detail-key">Environment Variables:</strong>
                              <div class="nested-content">
                                ${container.env.map(env => html`
                                  <div class="detail-item">
                                    <strong class="detail-key">${env.name}:</strong>
                                    <span class="detail-value">
                                      ${env.value !== undefined ? env.value : 
                                        (env.valueFrom ? 
                                          (env.valueFrom.secretKeyRef ? 
                                            `Secret: ${env.valueFrom.secretKeyRef.name}[${env.valueFrom.secretKeyRef.key}]` :
                                            (env.valueFrom.configMapKeyRef ?
                                              `ConfigMap: ${env.valueFrom.configMapKeyRef.name}[${env.valueFrom.configMapKeyRef.key}]` :
                                              'ValueFrom'))
                                          : 'null')}
                                    </span>
                                  </div>
                                `)}
                              </div>
                            </div>
                          ` : ''}
                          
                          <!-- Resources -->
                          ${container.resources ? html`
                            <div class="detail-item nested">
                              <strong class="detail-key">Resources:</strong>
                              <div class="nested-content">
                                ${container.resources.limits ? html`
                                  <div class="detail-item nested">
                                    <strong class="detail-key">Limits:</strong>
                                    <div class="nested-content">
                                      ${this.renderObjectAsKeyValue(container.resources.limits)}
                                    </div>
                                  </div>
                                ` : ''}
                                ${container.resources.requests ? html`
                                  <div class="detail-item nested">
                                    <strong class="detail-key">Requests:</strong>
                                    <div class="nested-content">
                                      ${this.renderObjectAsKeyValue(container.resources.requests)}
                                    </div>
                                  </div>
                                ` : ''}
                              </div>
                            </div>
                          ` : ''}
                          
                          <!-- Volume Mounts -->
                          ${container.volumeMounts && container.volumeMounts.length > 0 ? html`
                            <div class="detail-item nested">
                              <strong class="detail-key">Volume Mounts:</strong>
                              <div class="nested-content">
                                ${container.volumeMounts.map(mount => html`
                                  <div class="detail-item">
                                    <strong class="detail-key">${mount.name}:</strong>
                                    <span class="detail-value">
                                      ${mount.mountPath}${mount.subPath ? ` (subPath: ${mount.subPath})` : ''}
                                    </span>
                                  </div>
                                `)}
                              </div>
                            </div>
                          ` : ''}
                          
                          <!-- Probes -->
                          ${container.livenessProbe ? html`
                            <div class="detail-item nested">
                              <strong class="detail-key">Liveness Probe:</strong>
                              <div class="nested-content">
                                ${container.livenessProbe.httpGet ? html`
                                  ${this.renderDetailItem('Type', 'HTTP GET')}
                                  ${this.renderDetailItem('Path', container.livenessProbe.httpGet.path)}
                                  ${this.renderDetailItem('Port', container.livenessProbe.httpGet.port)}
                                  ${this.renderDetailItem('Scheme', container.livenessProbe.httpGet.scheme)}
                                ` : ''}
                                ${this.renderDetailItem('Initial Delay', container.livenessProbe.initialDelaySeconds + 's')}
                                ${this.renderDetailItem('Timeout', container.livenessProbe.timeoutSeconds + 's')}
                                ${this.renderDetailItem('Period', container.livenessProbe.periodSeconds + 's')}
                                ${this.renderDetailItem('Success Threshold', container.livenessProbe.successThreshold)}
                                ${this.renderDetailItem('Failure Threshold', container.livenessProbe.failureThreshold)}
                              </div>
                            </div>
                          ` : ''}
                          
                          ${container.readinessProbe ? html`
                            <div class="detail-item nested">
                              <strong class="detail-key">Readiness Probe:</strong>
                              <div class="nested-content">
                                ${container.readinessProbe.httpGet ? html`
                                  ${this.renderDetailItem('Type', 'HTTP GET')}
                                  ${this.renderDetailItem('Path', container.readinessProbe.httpGet.path)}
                                  ${this.renderDetailItem('Port', container.readinessProbe.httpGet.port)}
                                  ${this.renderDetailItem('Scheme', container.readinessProbe.httpGet.scheme)}
                                ` : ''}
                                ${this.renderDetailItem('Initial Delay', container.readinessProbe.initialDelaySeconds + 's')}
                                ${this.renderDetailItem('Timeout', container.readinessProbe.timeoutSeconds + 's')}
                                ${this.renderDetailItem('Period', container.readinessProbe.periodSeconds + 's')}
                                ${this.renderDetailItem('Success Threshold', container.readinessProbe.successThreshold)}
                                ${this.renderDetailItem('Failure Threshold', container.readinessProbe.failureThreshold)}
                              </div>
                            </div>
                          ` : ''}
                          
                          <!-- Security Context -->
                          ${container.securityContext ? html`
                            <div class="detail-item nested">
                              <strong class="detail-key">Security Context:</strong>
                              <div class="nested-content">
                                ${this.renderDetailItem('Run As User', container.securityContext.runAsUser)}
                                ${this.renderDetailItem('Run As Non-Root', container.securityContext.runAsNonRoot)}
                                ${this.renderDetailItem('Read-Only Root Filesystem', container.securityContext.readOnlyRootFilesystem)}
                                ${this.renderDetailItem('Allow Privilege Escalation', container.securityContext.allowPrivilegeEscalation)}
                                ${container.securityContext.capabilities ? html`
                                  <div class="detail-item nested">
                                    <strong class="detail-key">Capabilities:</strong>
                                    <div class="nested-content">
                                      ${container.securityContext.capabilities.drop ? 
                                        this.renderDetailItem('Drop', container.securityContext.capabilities.drop.join(', ')) : ''}
                                      ${container.securityContext.capabilities.add ? 
                                        this.renderDetailItem('Add', container.securityContext.capabilities.add.join(', ')) : ''}
                                    </div>
                                  </div>
                                ` : ''}
                              </div>
                            </div>
                          ` : ''}
                        </div>
                      </div>
                    `)}
                  </div>
                </div>
              ` : ''}
            ` : ''}
          </div>
        ` : ''}

        <!-- Conditions -->
        ${deploymentData.status?.conditions && deploymentData.status.conditions.length > 0 ? html`
          <div class="detail-section">
            <h3>Conditions</h3>
            ${deploymentData.status.conditions.map((condition) => html`
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
            `)}
          </div>
        ` : ''}

        <!-- Raw Data Section for debugging -->
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

renderPodDetailContent(data: any) {
    if (!data) {
      return html`<div class="no-data">No data available</div>`;
    }

    // Handle the actual API response structure where data is under 'pod_detail' key
    const podData = data.pod_detail || data;
    
    console.log('Processing pod data:', podData);

    return html`
      <div class="detail-sections">
        <!-- Basic Information -->
        <div class="detail-section">
          <h3>Basic Information</h3>
          ${this.renderDetailItem('Name', podData.name)}
          ${this.renderDetailItem('Namespace', podData.namespace)}
          ${this.renderDetailItem('UID', podData.uid)}
          ${this.renderDetailItem('Resource Version', podData.resourceVersion)}
          ${this.renderDetailItem('Creation Timestamp', podData.creationTimestamp)}
          ${this.renderDetailItem('Age', podData.age)}
        </div>

        <!-- Status Information -->
        <div class="detail-section">
          <h3>Status</h3>
          ${this.renderDetailItem('Status', podData.status)}
          ${this.renderDetailItem('Phase', podData.phase)}
          ${this.renderDetailItem('QoS Class', podData.qosClass)}
          ${this.renderDetailItem('Start Time', podData.startTime)}
        </div>

        <!-- Network Information -->
        <div class="detail-section">
          <h3>Network</h3>
          ${this.renderDetailItem('Pod IP', podData.ip)}
          ${this.renderDetailItem('Host IP', podData.hostIP)}
          ${this.renderDetailItem('Node', podData.node)}
        </div>

        <!-- Configuration -->
        <div class="detail-section">
          <h3>Configuration</h3>
          ${this.renderDetailItem('Restart Policy', podData.restartPolicy)}
          ${this.renderDetailItem('DNS Policy', podData.dnsPolicy)}
          ${this.renderDetailItem('Service Account', podData.serviceAccount)}
          ${this.renderDetailItem('Node Selector', podData.nodeSelector, true)}
        </div>

        <!-- Labels -->
        ${podData.labels ? html`
          <div class="detail-section">
            <h3>Labels</h3>
            ${this.renderObjectAsKeyValue(podData.labels)}
          </div>
        ` : ''}

        <!-- Annotations -->
        ${podData.annotations ? html`
          <div class="detail-section">
            <h3>Annotations</h3>
            ${this.renderObjectAsKeyValue(podData.annotations)}
          </div>
        ` : ''}

        <!-- Containers -->
        ${podData.containers && podData.containers.length > 0 ? html`
          <div class="detail-section">
            <h3>Containers</h3>
            ${podData.containers.map((container, index) => html`
              <div class="detail-item nested">
                <strong class="detail-key">Container ${index + 1}:</strong>
                <div class="nested-content">
                  ${this.renderDetailItem('Name', container.name)}
                  ${this.renderDetailItem('Image', container.image)}
                  ${this.renderDetailItem('Ready', container.ready)}
                  ${this.renderDetailItem('Restart Count', container.restartCount)}
                  ${this.renderDetailItem('State', container.state)}
                </div>
              </div>
            `)}
          </div>
        ` : ''}

        <!-- Conditions -->
        ${podData.conditions && podData.conditions.length > 0 ? html`
          <div class="detail-section">
            <h3>Conditions</h3>
            ${podData.conditions.map((condition, index) => html`
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
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.requestUpdate();
  }

  renderNotifications() {
    if (this.notifications.length === 0) {
      return null;
    }

    return html`
      <div class="notification-container">
        ${this.notifications.map(notification => html`
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

  render() {
    return html`
      <div class="tab-container">
        <h1>${this.renderTitle()}</h1>
        ${this.activeSubmenu === 'workloads' ? this.renderWorkloadTabs() : ''}
        ${this.activeSubmenu === 'storages' ? this.renderStorageTabs() : ''}
        ${this.activeSubmenu === 'configurations' ? this.renderConfigurationTabs() : ''}
        ${this.activeSubmenu === 'helms' ? this.renderHelmTabs() : ''}
        <div class="search-container">
          ${this.activeSubmenu !== 'nodes' && this.activeSubmenu !== 'crds' ? html`
            <div class="namespace-filter">
            <div class="namespace-dropdown">
              <button class="namespace-button" @click=${(e) => this.toggleNamespaceDropdown(e)}>
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
                  ${this.getFilteredNamespaces().map(namespace => html`
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
        ${this.renderNotifications()}
      </div>
    `;
  }

  renderTitle() {
    const titles = {
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

  
  disconnectedCallback() {
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


  toggleActionMenu(event, menuId) {
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
      const pods = data.pods.map(pod => ({
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
      const deployments = data.deployments.map(dep => ({
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
      const statefulsets = data.statefulsets.map(set => ({
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
      const daemonsets = data.daemonsets.map(ds => ({
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
      const jobs = data.jobs.map(job => ({
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
      const cronjobs = data.cronjobs.map(cj => ({
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
      this.networks = data.services.map(svc => ({
        name: svc.name,
        type: svc.type,
        namespace: svc.namespace,
        status: 'Active',
        endpoints: svc.cluster_ip,
        age: svc.age
      }));
      this.error = null;
    } catch (error) {
      this.error = 'Failed to fetch services';
    }
  }

  async fetchConfigMaps() {
    try {
      const data = await Api.get('/kubernetes/configmaps');
      this.configurations = data.configmaps.map(map => ({
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
      this.configurations = this.configurations.concat(data.secrets.map(sec => ({
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

  async fetchHelmReleases() {
    try {
      const data = await Api.get('/kubernetes/helm/releases');
      this.helms = data.releases.map(release => ({
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
      this.helms = this.helms.concat(data.charts.map(chart => ({
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
      this.nodes = data.nodes.map(node => ({
        name: node.name,
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
      this.crds = data.crds.map(crd => ({
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
      this.namespaces = data.namespaces.map(ns => ns.name);
      this.error = null;
    } catch (error) {
      console.error('Failed to fetch namespaces:', error);
      // Set some default namespaces if API fails
      this.namespaces = ['default', 'kube-system', 'kube-public'];
    }
  }

  private handleNamespaceChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedNamespace = target.value;
    this.requestUpdate();
  }

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

  connectedCallback() {
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
      
      // Fetch network resources (services)
      await this.fetchServices();
      
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

  viewDetails(item) {
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
      default:
        console.log('View details not implemented for type:', item.type);
        this.showNotification(
          'info',
          'Feature Not Available',
          `Detailed view for ${item.type} resources is not implemented yet. Only Pod, Deployment, CRD, and StatefulSet details are currently supported.`
        );
        break;
    }
  }

  viewPodDetails(pod) {
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

  viewCrdDetails(crd) {
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

  viewDeploymentDetails(deployment) {
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

  viewStatefulSetDetails(statefulSet) {
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

  viewDaemonSetDetails(daemonSet) {
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

  editItem(item) {
    // Implement edit logic here
    console.log('Editing item:', item);
    this.showNotification(
      'info',
      'Edit Feature',
      `Edit functionality for "${item.name}" is not implemented yet.`
    );
  }

  deleteItem(item) {
    // Implement delete logic here
    console.log('Deleting item:', item);
    if (confirm(`Are you sure you want to delete ${item.name || item.id}?`)) {
      // Now activeSubmenu directly matches property names (all plural)
      const currentData = this[this.activeSubmenu];
      if (currentData) {
        const index = currentData.indexOf(item);
        if (index > -1) {
          currentData.splice(index, 1);
          this.requestUpdate();
        }
      }
    }
  }

  // Workload-specific actions
  scalePods(item) {
    console.log('Scaling pods for:', item);
    const replicas = prompt(`Enter new replica count for ${item.name}:`, '3');
    if (replicas && !isNaN(replicas)) {
      this.showNotification(
        'success',
        'Scaling Initiated',
        `Scaling "${item.name}" to ${replicas} replicas. This feature is not fully implemented yet.`
      );
      // In a real app, you would make an API call here
    }
  }

  viewLogs(item) {
    console.log('Viewing logs for:', item);
    this.showNotification(
      'info',
      'Logs Viewer',
      `Log viewer for "${item.name}" is not implemented yet.`
    );
    // In a real app, you would open a logs viewer or modal
  }

  // Network-specific actions
  viewEndpoints(item) {
    console.log('Viewing endpoints for:', item);
    this.showNotification(
      'info',
      'Endpoint Information',
      `${item.name} endpoints: ${item.endpoints}`
    );
    // In a real app, you would show detailed endpoint information
  }

  // Storage-specific actions
  expandVolume(item) {
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
  viewKeys(item) {
    console.log('Viewing keys for:', item);
    this.showNotification(
      'info',
      'Configuration Keys',
      `"${item.name}" contains ${item.keys} keys. Detailed key viewer is not implemented yet.`
    );
    // In a real app, you would show the actual keys (for ConfigMaps) or key names (for Secrets)
  }

  // Helm-specific actions
  upgradeRelease(item) {
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

  rollbackRelease(item) {
    console.log('Rolling back release:', item);
    const targetRevision = prompt(`Enter revision to rollback to for ${item.name}:`, (parseInt(item.revision) - 1).toString());
    if (targetRevision && !isNaN(targetRevision)) {
      this.showNotification(
        'success',
        'Helm Release Rollback',
        `Rolling back "${item.name}" to revision ${targetRevision}. This feature is not fully implemented yet.`
      );
      // In a real app, you would make an API call to rollback the Helm release
    }
  }

  uninstallRelease(item) {
    console.log('Uninstalling release:', item);
    if (confirm(`Are you sure you want to uninstall ${item.name}? This action cannot be undone.`)) {
      this.showNotification(
        'success',
        'Helm Release Uninstall',
        `Uninstalling "${item.name}". This feature is not fully implemented yet.`
      );
      // Now activeSubmenu directly matches property names (all plural)
      const currentData = this[this.activeSubmenu];
      if (currentData) {
        const index = currentData.indexOf(item);
        if (index > -1) {
          currentData.splice(index, 1);
          this.requestUpdate();
        }
      }
      // In a real app, you would make an API call to uninstall the Helm release
    }
  }
}

customElements.define('kubernetes-tab', KubernetesTab);
