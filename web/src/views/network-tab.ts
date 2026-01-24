import { html, css } from 'lit';
import { state, property } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';
import { t } from '../i18n';
import { I18nLitElement } from '../i18n-mixin';
import { api } from '../api';
import type { AddressRequest, NetworkInterface } from '../types/api';
import {
  $filteredInterfaces,
  $filteredBridges,
  $filteredBonds,
  $filteredVlans,
  $selectedInterface,
  $searchQuery,
  $selectedType,
  $bridgeSearchQuery,
  $bondSearchQuery,
  $vlanSearchQuery,
  networkActions,
  initializeNetworkStore,
} from '../stores/network';

// Define BondMode locally until it's exported from api types
type BondMode = 'balance-rr' | 'active-backup' | 'balance-xor' | 'broadcast' | '802.3ad' | 'balance-tlb' | 'balance-alb';
import '../components/modal-dialog';
import '../components/ui/operation-warning';

export class NetworkTab extends I18nLitElement {
  @property({ type: String })
  subRoute: string | null = null;

  // Store controllers
  private interfacesController = new StoreController(this, $filteredInterfaces);
  private bridgesController = new StoreController(this, $filteredBridges);
  private bondsController = new StoreController(this, $filteredBonds);
  private vlansController = new StoreController(this, $filteredVlans);
  private selectedInterfaceController = new StoreController(this, $selectedInterface);
  private searchQueryController = new StoreController(this, $searchQuery);
  private selectedTypeController = new StoreController(this, $selectedType);
  private bridgeSearchController = new StoreController(this, $bridgeSearchQuery);
  private bondSearchController = new StoreController(this, $bondSearchQuery);
  private vlanSearchController = new StoreController(this, $vlanSearchQuery);

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
      border-bottom: 2px solid var(--vscode-border);
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

    .network-interface {
      background-color: var(--surface-1);
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 12px;
      border: 1px solid var(--vscode-border);
    }

    .interface-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .interface-name {
      font-size: 1.1rem;
      font-weight: 500;
    }

    .interface-state {
      padding: 0.25rem 0.75rem;
      border-radius: 16px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .state-up {
      background-color: var(--success-bg);
      color: var(--success);
    }

    .state-down {
      background-color: var(--error-bg);
      color: var(--error);
    }

    .interface-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
    }

    .detail-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-bottom: 0.25rem;
    }

    .detail-value {
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    .interface-actions {
      display: flex;
      gap: 0.5rem;
    }

    .action-button {
      padding: 0.5rem 1rem;
      background-color: var(--surface-2);
      color: var(--text-primary);
      border: 1px solid var(--vscode-border);
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .action-button:hover {
      background-color: var(--surface-3);
      border-color: var(--primary);
    }

    .action-button.primary {
      background-color: var(--primary);
      color: white;
      border-color: var(--primary);
    }

    .action-button.primary:hover {
      background-color: var(--primary-hover);
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }

    .create-form {
      background-color: var(--surface-1);
      padding: 1.5rem;
      border-radius: 6px;
      border: 1px solid var(--vscode-border);
      margin-bottom: 1rem;
    }

    /* Form Styles matching NetworkFormDrawer */
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
      color: var(--vscode-foreground);
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

    .form-label, 
    label {
      font-size: 12px;
      font-weight: 500;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 0; /* Reset margin as .field handles gap */
    }

    .required::after {
      content: ' *';
      color: var(--vscode-inputValidation-errorForeground);
    }

    .form-input,
    .form-select,
    input,
    select {
      width: 100%;
      padding: 6px 8px;
      border-radius: 3px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: 13px;
      font-family: inherit;
      outline: none;
      box-sizing: border-box;
    }

    .form-input:focus,
    .form-select:focus,
    input:focus,
    select:focus {
      border-color: var(--vscode-focusBorder);
    }

    input:disabled,
    select:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    input.error,
    select.error {
      border-color: var(--vscode-inputValidation-errorBorder);
    }

    .error-text {
      color: var(--vscode-inputValidation-errorForeground);
      font-size: 11px;
    }

    .hint {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }

    .checkbox-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }

    .checkbox-row input {
      width: auto;
    }

    .form-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
      margin-top: 1.5rem;
    }

    .form-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
      margin-top: 1.5rem;
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

    h3 {
      font-size: 1.2rem;
      margin: 1.5rem 0 1rem 0;
      color: var(--text-primary);
    }

    .network-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      background-color: var(--vscode-bg-light);
      border: 1px solid var(--vscode-border);
      border-radius: 1px;
      overflow: visible;
      margin-bottom: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .network-table thead {
      background-color: var(--vscode-bg-lighter);
    }

    .network-table th {
      background: var(--vscode-bg-dark);
      color: var(--vscode-text);
      font-weight: 600;
      text-align: left;
      padding: 12px 16px;
      font-size: 0.875rem;
      border-bottom: 1px solid var(--vscode-border);
    }

    .network-table td {
      padding: 12px 16px;
      font-size: 0.875rem;
      color: var(--vscode-text);
      border-bottom: 1px solid var(--vscode-border);
    }

    .network-table tbody tr:last-child td {
      border-bottom: none;
    }

    .network-table tbody tr:hover {
      background-color: var(--surface-0);
    }

    .network-table td.state-up,
    .network-table td.state-down {
      font-weight: 500;
    }

    .network-table td:last-child {
      text-align: right;
    }

    .network-table td button {
      margin-right: 0.5rem;
    }

    .network-table td button:last-child {
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

    .status-icon.up {
      background-color: #4caf50;
      box-shadow: 0 0 4px #4caf50;
    }

    .status-icon.down {
      background-color: #9e9e9e;
    }

    .status-icon[data-tooltip]:hover::after {
      content: attr(data-tooltip);
      position: absolute;
      left: 15px;
      top: 50%;
      transform: translateY(-50%);
      padding: 6px 12px;
      background-color: var(--surface-1);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      font-size: 14px;
      white-space: nowrap;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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
      background-color: var(--surface-1);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      min-width: 150px;
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
      color: var(--text-primary);
      cursor: pointer;
      font-size: 13px;
      transition: background-color 0.2s;
    }

    .action-dropdown button:hover {
      background-color: var(--vscode-list-hoverBackground, rgba(255, 255, 255, 0.08));
    }

    .action-dropdown button.danger {
      color: var(--vscode-error, #f44336);
    }

    .autocomplete-container {
      position: relative;
    }

    .autocomplete-suggestions {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 4px;
      background-color: var(--surface-1);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      max-height: 200px;
      overflow-y: auto;
      z-index: 1001;
    }

    .autocomplete-suggestion {
      padding: 8px 12px;
      cursor: pointer;
      font-size: 13px;
      color: var(--text-primary);
      transition: background-color 0.2s;
    }

    .autocomplete-suggestion:hover,
    .autocomplete-suggestion.selected {
      background-color: var(--vscode-list-hoverBackground, rgba(255, 255, 255, 0.08));
    }

    .autocomplete-suggestion.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .autocomplete-suggestion.disabled:hover {
      background-color: transparent;
    }
    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: 500px;
      max-width: 100%;
      height: 100vh;
      background: var(--vscode-editor-background);
      border-left: 1px solid var(--vscode-border);
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.2);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      animation: slideIn 0.3s ease-out;
    }

    .drawer-header {
      padding: 20px;
      background: var(--vscode-bg-lighter, #252526);
      border-bottom: 1px solid var(--vscode-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .drawer-title {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
      color: var(--vscode-foreground);
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--vscode-foreground);
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 20px;
      transition: background 0.2s;
    }

    .close-btn:hover {
      background: var(--vscode-toolbar-hoverBackground, rgba(255, 255, 255, 0.1));
    }

    .drawer-content {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
    }

    .drawer-footer {
      padding: 16px 20px;
      background: var(--vscode-bg-lighter, #252526);
      border-top: 1px solid var(--vscode-border);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      flex-shrink: 0;
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

    .search-container {
      position: relative;
      display: inline-block;
      width: 200px;
    }

    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      pointer-events: none;
      opacity: 0.5;
    }

    .search-input {
      padding-left: 35px !important;
      width: 100%;
    }

    .ip-addresses-cell {
      position: relative;
    }

    .ip-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .ip-address {
      font-size: 0.85rem;
    }

    .ip-more-indicator {
      font-size: 0.85rem;
      color: var(--primary);
      cursor: pointer;
      font-weight: 500;
    }

    .ip-addresses-cell:hover .ip-list-collapsed {
      display: none;
    }

    .ip-addresses-cell:hover .ip-list-expanded {
      display: flex;
    }

    .ip-list-expanded {
      display: none;
      flex-direction: column;
      gap: 4px;
      position: absolute;
      top: 0;
      left: 0;
      background: var(--surface-1);
      padding: 12px 16px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      z-index: 100;
      min-width: 200px;
      max-height: 300px;
      overflow-y: auto;
    }

    .ip-list-collapsed {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .filter-container {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 12px;
    }

    .type-filter-select {
      padding: 0.5rem 2.5rem 0.5rem 0.75rem;
      background-color: var(--surface-0);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      color: var(--text-primary);
      font-size: 0.875rem;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      min-width: 150px;
    }

    .type-filter-select:hover {
      border-color: var(--primary);
    }

    .type-filter-select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.2);
    }

    }

    .interface-name-link {
      color: var(--primary);
      cursor: pointer;
      text-decoration: none;
      transition: opacity 0.2s;
    }

    .interface-name-link:hover {
      opacity: 0.8;
      text-decoration: underline;
    }

    .details-table {
      width: 100%;
      border-collapse: collapse;
      background-color: var(--surface-0);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 1rem;
    }

    .details-table thead {
      background-color: var(--surface-1);
    }

    .details-table th {
      text-align: left;
      padding: 10px 12px;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-color);
    }

    .details-table td {
      padding: 10px 12px;
      font-size: 0.85rem;
      color: var(--text-primary);
      border-bottom: 1px solid var(--border-color);
    }

    .details-table tbody tr:last-child td {
      border-bottom: none;
    }

    .details-table tbody tr:hover {
      background-color: var(--surface-1);
    }

    .ip-edit-input {
      padding: 0.25rem 0.5rem;
      background-color: var(--surface-0);
      border: 1px solid var(--primary);
      border-radius: 3px;
      color: var(--text-primary);
      font-size: 0.85rem;
      width: 100%;
    }

    .ip-actions {
      display: flex;
      gap: 4px;
    }

    .ip-action-btn {
      padding: 4px 8px;
      background: none;
      border: 1px solid transparent;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }

    .ip-action-btn:hover {
      background-color: var(--surface-2);
      border-color: var(--border-color);
    }

    .ip-action-btn.edit {
      color: var(--primary);
    }

    .ip-action-btn.delete {
      color: var(--error);
    }

    .ip-action-btn.save {
      background-color: var(--primary);
      color: white;
      border-color: var(--primary);
    }

    .ip-action-btn.save:hover {
      background-color: var(--primary-hover);
    }

    .add-ip-form {
      margin-top: 1rem;
      padding: 1rem;
      background-color: var(--surface-0);
      border: 1px solid var(--border-color);
      border-radius: 4px;
    }

    .add-ip-form .form-row {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .add-ip-form .form-row input {
      flex: 1;
    }

    .interface-info-section {
      margin-bottom: 1.5rem;
    }

    .interface-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 0.5rem;
    }

    .info-item {
      padding: 0.75rem;
      background-color: var(--surface-0);
      border: 1px solid var(--border-color);
      border-radius: 4px;
    }

    .info-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-bottom: 0.25rem;
    }

    .info-value {
      font-size: 0.9rem;
      color: var(--text-primary);
      font-weight: 500;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .section-title {
      font-size: 1.1rem;
      font-weight: 500;
      color: var(--text-primary);
    }

    .add-btn {
      padding: 0.4rem 0.8rem;
      background-color: var(--primary);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: background-color 0.2s;
    }

    .add-btn:hover {
      background-color: var(--primary-hover);
    }
  `;

  @state()
  private activeTab = 'interfaces';

  @state()
  private showConfigureDrawer = false;

  @state()
  private showDetailsDrawer = false;

  @state()
  private editingIpIndex: number | null = null;

  @state()
  // private editingIpValue = '';  // TODO: Use for IP editing feature

  @state()
  private showAddIpModal = false;

  @state()
  private showEditIpModal = false;

  @state()
  private editIpAddress = '';

  @state()
  private editIpNetmask = 24;

  @state()
  private editIpGateway = '';

  @state()
  private originalIpAddress = '';

  @state()
  private newIpAddress = '';

  @state()
  private newIpNetmask = 24;

  @state()
  private newIpGateway = '';

  @state()
  private showBridgeDrawer = false;

  @state()
  private isEditingBridge = false;

  @state()
  private editingBridgeName: string | null = null;

  @state()
  private bridgeFormData = {
    name: '',
    interfaces: ''
  };

  @state()
  private showBondDrawer = false;

  @state()
  private isEditingBond = false;

  @state()
  private editingBondName: string | null = null;

  @state()
  private bondFormData = {
    name: '',
    mode: 'balance-rr' as BondMode,
    interfaces: ''
  };

  @state()
  private vlanFormData = {
    interface: '',
    vlanId: 0,
    name: ''
  };

  @state()
  private showVLANDrawer = false;

  @state()
  private interfaceTypes: string[] = [];

  @state()
  private isEditingVlan = false;

  @state()
  private editingVlanName: string | null = null;


  @state()
  private operationWarning: {
    type: 'warning' | 'partial-success' | 'persistence';
    message: string;
    failures?: any[];
    successItems?: string[]
  } | null = null;
  @state()
  private configureNetworkInterface: NetworkInterface | null = null;

  @state()
  private configureFormData = {
    address: '',
    netmask: 24,
    gateway: ''
  };

  @state()
  private showConfirmModal = false;

  @state()
  private confirmAction: (() => void) | null = null;

  @state()
  private confirmTitle = '';

  @state()
  private confirmMessage = '';

  @state()
  private availableInterfacesForBridge: string[] = [];

  @state()
  private showBridgeInterfacesSuggestions = false;

  @state()
  private bridgeInterfaceInputValue = "";

  @state()
  private selectedSuggestionIndex = -1;

  @state()
  private bondInterfaceInputValue = "";

  @state()
  private showBondInterfacesSuggestions = false;

  @state()
  private selectedBondSuggestionIndex = -1;

  @state()
  private vlanInterfaceInputValue = "";

  @state()
  private showVlanInterfacesSuggestions = false;

  @state()
  private selectedVlanSuggestionIndex = -1;

  // Getters for store data
  get interfaces() {
    return this.interfacesController.value || [];
  }

  get bridges() {
    return this.bridgesController.value || [];
  }

  get bonds() {
    return this.bondsController.value || [];
  }

  get vlans() {
    return this.vlansController.value || [];
  }

  get selectedInterface() {
    return this.selectedInterfaceController.value;
  }

  set selectedInterface(value: NetworkInterface | null) {
    networkActions.selectInterface(value);
  }

  get searchQuery() {
    return this.searchQueryController.value || '';
  }

  set searchQuery(value: string) {
    networkActions.setSearchQuery(value);
  }

  get selectedType() {
    return this.selectedTypeController.value || 'all';
  }

  set selectedType(value: string) {
    networkActions.setSelectedType(value);
  }

  get bridgeSearchQuery() {
    return this.bridgeSearchController.value || '';
  }

  set bridgeSearchQuery(value: string) {
    networkActions.setBridgeSearchQuery(value);
  }

  get bondSearchQuery() {
    return this.bondSearchController.value || '';
  }

  set bondSearchQuery(value: string) {
    networkActions.setBondSearchQuery(value);
  }

  get vlanSearchQuery() {
    return this.vlanSearchController.value || '';
  }

  set vlanSearchQuery(value: string) {
    networkActions.setVlanSearchQuery(value);
  }

  constructor() {
    super();
    this.handlePopState = this.handlePopState.bind(this);
  }

  handlePopState() {
    const pathSegments = window.location.pathname.split('/');
    const tab = pathSegments[pathSegments.length - 1];
    if (tab && ['interfaces', 'bridges', 'bonds', 'vlans'].includes(tab)) {
      this.activeTab = tab;
    }
  }

  override firstUpdated() {
    // Initialize the network store
    initializeNetworkStore();

    document.addEventListener('click', this.handleDocumentClick.bind(this));
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('popstate', this.handlePopState);

    // Fetch interface types when component is connected
    this.fetchInterfaceTypes();

    // Initialize tab from URL or subRoute
    const pathSegments = window.location.pathname.split('/');
    const tab = pathSegments[pathSegments.length - 1];
    if (tab && ['interfaces', 'bridges', 'bonds', 'vlans'].includes(tab)) {
      this.activeTab = tab;
    } else {
      this.handleSubRoute();
    }
  }

  override updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);

    // Handle sub-route changes
    if (changedProperties.has('subRoute')) {
      this.handleSubRoute();
    }
  }

  private handleSubRoute() {
    if (this.subRoute && ['interfaces', 'bridges', 'bonds', 'vlans'].includes(this.subRoute)) {
      this.activeTab = this.subRoute;
    } else {
      this.activeTab = 'interfaces'; // Default to interfaces if subRoute is invalid or not set
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleDocumentClick.bind(this));
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('popstate', this.handlePopState);
  }

  async fetchInterfaceTypes() {
    try {
      const response = await api.get('/network/interface-types');
      if (response && response.types) {
        this.interfaceTypes = response.types;
      }
    } catch (error) {
      console.error('Error fetching interface types:', error);
    }
  }

  async fetchAvailableInterfacesForBridge() {
    try {
      const response = await api.get('/network/interfaces?type=device,vlan,bond');
      if (response && response.interfaces) {
        this.availableInterfacesForBridge = response.interfaces.map((iface: NetworkInterface) => iface.name);
      }
    } catch (error) {
      console.error('Error fetching available interfaces:', error);
    }
  }

  handleBridgeInterfaceInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const value = input.value;
    this.bridgeInterfaceInputValue = value;

    // Get the current word being typed (after the last comma)
    const parts = value.split(',').map(p => p.trim());
    const currentWord = (parts[parts.length - 1] || '').toLowerCase();

    // Show suggestions if there's text to search
    this.showBridgeInterfacesSuggestions = currentWord.length > 0;
    this.selectedSuggestionIndex = -1;
  }

  handleBridgeInterfaceKeyDown(e: KeyboardEvent) {
    if (!this.showBridgeInterfacesSuggestions) return;

    const filteredSuggestions = this.getFilteredSuggestions();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedSuggestionIndex = Math.min(
        this.selectedSuggestionIndex + 1,
        filteredSuggestions.length - 1
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedSuggestionIndex = Math.max(this.selectedSuggestionIndex - 1, 0);
    } else if (e.key === 'Enter' && this.selectedSuggestionIndex >= 0) {
      e.preventDefault();
      const selected = filteredSuggestions[this.selectedSuggestionIndex];
      if (selected) this.selectSuggestion(selected);
    } else if (e.key === 'Escape') {
      this.showBridgeInterfacesSuggestions = false;
    }
  }

  getFilteredSuggestions(): string[] {
    const parts = this.bridgeInterfaceInputValue.split(',').map(p => p.trim());
    const currentWord = (parts[parts.length - 1] || '').toLowerCase();
    const alreadySelected = parts.slice(0, -1).map(p => p.toLowerCase());

    return this.availableInterfacesForBridge.filter(name => {
      const nameLower = name.toLowerCase();
      return nameLower.includes(currentWord) && !alreadySelected.includes(nameLower);
    });
  }

  selectSuggestion(interfaceName: string) {
    const parts = this.bridgeInterfaceInputValue.split(',').map(p => p.trim());
    parts[parts.length - 1] = interfaceName;
    this.bridgeInterfaceInputValue = parts.join(', ') + ', ';
    this.bridgeFormData.interfaces = this.bridgeInterfaceInputValue;
    this.showBridgeInterfacesSuggestions = false;
    this.selectedSuggestionIndex = -1;

    // Focus back on input
    const input = document.getElementById('bridge-interfaces') as HTMLInputElement;
    if (input) input.focus();
  }

  closeBridgeInterfacesSuggestions() {
    // Add a small delay to allow click events on suggestions to fire
    setTimeout(() => {
      this.showBridgeInterfacesSuggestions = false;
    }, 200);
  }

  // Bond interface autocomplete methods
  handleBondInterfaceInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.bondInterfaceInputValue = value;

    // Get current word being typed
    const parts = value.split(',').map(p => p.trim());
    const currentWord = parts[parts.length - 1] || '';

    this.showBondInterfacesSuggestions = currentWord.length > 0;
    this.selectedBondSuggestionIndex = -1;
  }

  handleBondInterfaceKeyDown(e: KeyboardEvent) {
    if (!this.showBondInterfacesSuggestions) return;

    const filteredSuggestions = this.getFilteredBondSuggestions();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedBondSuggestionIndex = Math.min(
        this.selectedBondSuggestionIndex + 1,
        filteredSuggestions.length - 1
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedBondSuggestionIndex = Math.max(this.selectedBondSuggestionIndex - 1, 0);
    } else if (e.key === 'Enter' && this.selectedBondSuggestionIndex >= 0) {
      e.preventDefault();
      const selected = filteredSuggestions[this.selectedBondSuggestionIndex];
      if (selected) this.selectBondSuggestion(selected);
    } else if (e.key === 'Escape') {
      this.showBondInterfacesSuggestions = false;
    }
  }

  getFilteredBondSuggestions(): string[] {
    const parts = this.bondInterfaceInputValue.split(',').map(p => p.trim());
    const currentWord = parts[parts.length - 1] || '';
    const alreadySelected = parts.slice(0, -1).map(p => p.toLowerCase());

    return this.availableInterfacesForBridge
      .filter(name =>
        name.toLowerCase().includes(currentWord.toLowerCase()) &&
        !alreadySelected.includes(name.toLowerCase())
      )
      .slice(0, 10);
  }

  selectBondSuggestion(interfaceName: string) {
    const parts = this.bondInterfaceInputValue.split(',').map(p => p.trim());
    parts[parts.length - 1] = interfaceName;
    this.bondInterfaceInputValue = parts.join(', ') + ', ';
    this.bondFormData.interfaces = this.bondInterfaceInputValue;
    this.showBondInterfacesSuggestions = false;
    this.selectedBondSuggestionIndex = -1;

    const input = this.shadowRoot?.querySelector('#bond-interfaces') as HTMLInputElement;
    if (input) input.focus();
  }

  closeBondInterfacesSuggestions() {
    // Add a small delay to allow click events on suggestions to fire
    setTimeout(() => {
      this.showBondInterfacesSuggestions = false;
    }, 200);
  }

  // VLAN interface autocomplete methods (single interface only)
  handleVlanInterfaceInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.vlanInterfaceInputValue = value;

    // Show suggestions if there's input
    this.showVlanInterfacesSuggestions = value.length > 0;
    this.selectedVlanSuggestionIndex = -1;
  }

  handleVlanInterfaceKeyDown(e: KeyboardEvent) {
    if (!this.showVlanInterfacesSuggestions) return;

    const filteredSuggestions = this.getFilteredVlanSuggestions();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedVlanSuggestionIndex = Math.min(
        this.selectedVlanSuggestionIndex + 1,
        filteredSuggestions.length - 1
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedVlanSuggestionIndex = Math.max(this.selectedVlanSuggestionIndex - 1, 0);
    } else if (e.key === 'Enter' && this.selectedVlanSuggestionIndex >= 0) {
      e.preventDefault();
      const selected = filteredSuggestions[this.selectedVlanSuggestionIndex];
      if (selected) this.selectVlanSuggestion(selected);
    } else if (e.key === 'Escape') {
      this.showVlanInterfacesSuggestions = false;
    }
  }

  getFilteredVlanSuggestions(): string[] {
    const currentValue = this.vlanInterfaceInputValue.trim().toLowerCase();

    return this.availableInterfacesForBridge
      .filter(name => name.toLowerCase().includes(currentValue))
      .slice(0, 10);
  }

  selectVlanSuggestion(interfaceName: string) {
    this.vlanInterfaceInputValue = interfaceName;
    this.vlanFormData.interface = interfaceName;
    this.showVlanInterfacesSuggestions = false;
    this.selectedVlanSuggestionIndex = -1;

    const input = this.shadowRoot?.querySelector('#vlan-interface') as HTMLInputElement;
    if (input) input.focus();
  }

  closeVlanInterfacesSuggestions() {
    // Add a small delay to allow click events on suggestions to fire
    setTimeout(() => {
      this.showVlanInterfacesSuggestions = false;
    }, 200);
  }

  handleDocumentClick(e: Event) {
    const target = e.target as Element;
    if (!target.closest('.action-menu')) {
      this.closeAllMenus();
    }
  }

  handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      // Close action dropdowns first
      this.closeAllMenus();

      // Then close drawers if they're open
      if (this.showDetailsDrawer) {
        this.closeDetailsDrawer();
      }
      if (this.showConfigureDrawer) {
        this.closeConfigureDrawer();
      }
      if (this.showBridgeDrawer) {
        this.closeBridgeDrawer();
      }
      if (this.showBondDrawer) {
        this.closeBondDrawer();
      }
      if (this.showVLANDrawer) {
        this.closeVLANDrawer();
      }

      // Close modal if it's open
      if (this.showConfirmModal) {
        this.handleCancel();
      }
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

  async fetchNetworkData() {
    // Fetch all network data using store actions
    networkActions.fetchInterfaces();
    networkActions.fetchBridges();
    networkActions.fetchBonds();
    networkActions.fetchVlans();
  }

  async fetchInterfaces() {
    // Pass the selected type as a query parameter if not 'all'
    const type = this.selectedType !== 'all' ? this.selectedType : undefined;
    await networkActions.fetchInterfaces(type);
  }

  async fetchBridges() {
    await networkActions.fetchBridges();
  }

  async fetchBonds() {
    await networkActions.fetchBonds();
  }

  async fetchVlans() {
    await networkActions.fetchVlans();
  }

  toggleInterfaceState(iface: NetworkInterface) {
    const isUp = iface.state === 'up';
    const title = t(isUp ? 'network.downInterface' : 'network.upInterface');
    const message = t(isUp ? 'network.confirmBringDown' : 'network.confirmBringUp', { name: iface.name });
    this.showConfirmDialog(
      title,
      message,
      async () => {
        await networkActions.toggleInterfaceState(iface);
      }
    );
  }

  async deleteBridge(name: string) {
    this.showConfirmDialog(
      t('network.deleteBridge'),
      t('network.confirmDeleteBridge', { name }),
      async () => {
        await networkActions.deleteBridge(name);
      }
    );
  }

  async deleteBond(name: string) {
    this.showConfirmDialog(
      t('network.deleteBond'),
      t('network.confirmDeleteBond', { name }),
      async () => {
        await networkActions.deleteBond(name);
      }
    );
  }

  async deleteVlan(name: string) {
    this.showConfirmDialog(
      t('network.deleteVlan'),
      t('network.confirmDeleteVlan', { name }),
      async () => {
        await networkActions.deleteVlan(name);
      }
    );
  }


  // Helper to show operation warnings
  showOperationWarning(type: 'warning' | 'partial-success' | 'persistence', message: string, failures?: any[], successItems?: string[]) {
    this.operationWarning = { type, message, failures, successItems };
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      this.operationWarning = null;
    }, 10000);
  }

  dismissOperationWarning() {
    this.operationWarning = null;
  }
  showConfirmDialog(title: string, message: string, action: () => void) {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmAction = action;
    this.showConfirmModal = true;

    this.updateComplete.then(() => {
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

  openVLANDrawer() {
    this.showVLANDrawer = true;
    this.vlanFormData = {
      interface: '',
      vlanId: 0,
      name: ''
    };
    this.vlanInterfaceInputValue = "";
    this.showVlanInterfacesSuggestions = false;
    this.selectedVlanSuggestionIndex = -1;
    this.fetchAvailableInterfacesForBridge();
  }

  closeVLANDrawer() {
    this.showVLANDrawer = false;
    this.isEditingVlan = false;
    this.editingVlanName = null;
    this.vlanFormData = {
      interface: '',
      vlanId: 0,
      name: ''
    };
  }

  handleConfigureAddress(iface: NetworkInterface) {
    this.showVlanInterfacesSuggestions = false;
    this.vlanInterfaceInputValue = "";
    this.selectedVlanSuggestionIndex = -1;
    // Open drawer for configuration without sending any data
    this.configureNetworkInterface = iface;
    this.configureFormData = {
      address: '',
      netmask: 24,
      gateway: ''
    };
    this.showConfigureDrawer = true;
  }

  async submitConfigureAddress() {
    if (!this.configureNetworkInterface || !this.configureFormData.address) {
      return;
    }

    const request: AddressRequest = {
      address: this.configureFormData.address,
      netmask: this.configureFormData.netmask,
      gateway: this.configureFormData.gateway || undefined
    };

    try {
      await api.post(`/network/interfaces/${this.configureNetworkInterface.name}/address`, request);
      this.showConfigureDrawer = false;
      this.configureNetworkInterface = null;
      await this.fetchInterfaces();
    } catch (error) {
      console.error('Error configuring address:', error);
    }
  }

  closeConfigureDrawer() {
    this.showConfigureDrawer = false;
    this.configureNetworkInterface = null;
    this.configureFormData = {
      address: '',
      netmask: 24,
      gateway: ''
    };
  }

  openDetailsDrawer(iface: NetworkInterface) {
    this.selectedInterface = iface;
    this.showDetailsDrawer = true;
    this.editingIpIndex = null;
    this.newIpAddress = '';
    this.newIpNetmask = 24;
    this.newIpGateway = '';
  }

  closeDetailsDrawer() {
    this.showDetailsDrawer = false;
    this.selectedInterface = null;
    this.editingIpIndex = null;
    // this.editingIpValue = '';
    this.newIpAddress = '';
    this.newIpNetmask = 24;
    this.newIpGateway = '';
    this.showEditIpModal = false;
  }

  openEditIpModal(index: number, currentIp: string) {
    this.editingIpIndex = index;
    this.originalIpAddress = currentIp;

    // Parse the IP address and netmask
    const [ip, netmaskStr] = currentIp.split('/');
    this.editIpAddress = ip || currentIp;
    this.editIpNetmask = netmaskStr ? parseInt(netmaskStr) : 24;
    this.editIpGateway = ''; // Gateway is not stored with the IP, so leave empty

    this.showEditIpModal = true;
  }

  closeEditIpModal() {
    this.showEditIpModal = false;
    this.editingIpIndex = null;
    this.editIpAddress = '';
    this.editIpNetmask = 24;
    this.editIpGateway = '';
    this.originalIpAddress = '';
  }

  async saveEditedIp() {
    if (!this.selectedInterface || this.editingIpIndex === null || !this.editIpAddress) {
      return;
    }

    const oldAddress = this.selectedInterface.addresses?.[this.editingIpIndex];
    if (!oldAddress) return;

    try {
      // Use PUT endpoint to update the address
      const request: AddressRequest = {
        address: this.editIpAddress,
        netmask: this.editIpNetmask,
        gateway: this.editIpGateway || undefined
      };

      const response = await networkActions.updateInterfaceAddress(
        this.selectedInterface.name,
        request
      );

      // Handle response warnings if present
      if (response.warning) {
        this.showOperationWarning('warning', response.warning);
      }
      if (response.persistence_warning) {
        this.showOperationWarning('persistence', response.persistence_warning);
      }
      if (response.failed && response.failed.length > 0) {
        this.showOperationWarning('partial-success',
          response.warning || 'Some operations failed',
          response.failed,
          response.successfully_added);
      }

      // Refresh interfaces and update selected interface
      await this.fetchInterfaces();
      const updatedInterface = this.interfaces.find(i => i.name === this.selectedInterface?.name);
      if (updatedInterface) {
        this.selectedInterface = updatedInterface;
      }

      // Close the modal
      this.closeEditIpModal();
    } catch (error) {
      console.error('Error updating IP address:', error);
    }
  }

  async deleteIpAddress(address: string) {
    if (!this.selectedInterface) return;

    this.showConfirmDialog(
      t('network.deleteIpAddress'),
      t('network.confirmDeleteIp', { address }),
      async () => {
        try {
          await api.delete(`/network/interfaces/${this.selectedInterface!.name}/address?address=${encodeURIComponent(address)}`);

          // Refresh interfaces and update selected interface
          await this.fetchInterfaces();
          const updatedInterface = this.interfaces.find(i => i.name === this.selectedInterface?.name);
          if (updatedInterface) {
            this.selectedInterface = updatedInterface;
          }
        } catch (error) {
          console.error('Error deleting IP address:', error);
        }
      }
    );
  }

  openAddIpModal() {
    this.showAddIpModal = true;
    this.newIpAddress = '';
    this.newIpNetmask = 24;
    this.newIpGateway = '';
  }

  closeAddIpModal() {
    this.showAddIpModal = false;
    this.newIpAddress = '';
    this.newIpNetmask = 24;
    this.newIpGateway = '';
  }

  async addNewIpAddress() {
    if (!this.selectedInterface || !this.newIpAddress) {
      return;
    }

    const request: AddressRequest = {
      address: this.newIpAddress,
      netmask: this.newIpNetmask,
      gateway: this.newIpGateway || undefined
    };

    try {
      const response: any = await api.post(`/network/interfaces/${this.selectedInterface.name}/address`, request);


      // Handle warnings if present
      if (response?.warning) {
        this.showOperationWarning('warning', response.warning);
      }
      if (response?.persistence_warning) {
        this.showOperationWarning('persistence', response.persistence_warning);
      }
      // Refresh interfaces and update selected interface
      await this.fetchInterfaces();
      const updatedInterface = this.interfaces.find(i => i.name === this.selectedInterface?.name);
      if (updatedInterface) {
        this.selectedInterface = updatedInterface;
      }

      // Reset form and close modal
      this.closeAddIpModal();
    } catch (error) {
      console.error('Error adding IP address:', error);
    }
  }

  openBridgeDrawer() {
    this.showBridgeDrawer = true;
    this.bridgeFormData = {
      name: '',
      interfaces: ''
    };
    this.bridgeInterfaceInputValue = '';
    this.fetchAvailableInterfacesForBridge();
  }

  closeBridgeDrawer() {
    this.showBridgeDrawer = false;
    this.isEditingBridge = false;
    this.editingBridgeName = null;
    this.bridgeFormData = {
      name: '',
      interfaces: ''
    };
    this.showBridgeInterfacesSuggestions = false;
    this.bridgeInterfaceInputValue = '';
    this.selectedSuggestionIndex = -1;
  }

  openBondDrawer() {
    this.showBondDrawer = true;
    this.bondFormData = {
      name: '',
      mode: 'balance-rr',
      interfaces: ''
    };
    this.bondInterfaceInputValue = "";
    this.showBondInterfacesSuggestions = false;
    this.selectedBondSuggestionIndex = -1;
    this.fetchAvailableInterfacesForBridge();
  }

  closeBondDrawer() {
    this.showBondDrawer = false;
    this.isEditingBond = false;
    this.editingBondName = null;
    this.bondFormData = {
      name: '',
      mode: 'balance-rr' as BondMode,
      interfaces: ''
    };
    this.showBondInterfacesSuggestions = false;
    this.bondInterfaceInputValue = "";
    this.selectedBondSuggestionIndex = -1;
  }
  // Edit methods for Bridge
  openEditBridgeDrawer(bridge: any) {
    this.isEditingBridge = true;
    this.editingBridgeName = bridge.name;
    this.showBridgeDrawer = true;
    // Prefill form with existing data
    const interfacesStr = bridge.interfaces ? bridge.interfaces.join(', ') : '';
    this.bridgeFormData = {
      name: bridge.name,
      interfaces: interfacesStr
    };
    this.bridgeInterfaceInputValue = interfacesStr;
    this.fetchAvailableInterfacesForBridge();
  }

  // Edit methods for Bond
  openEditBondDrawer(bond: any) {
    this.isEditingBond = true;
    this.editingBondName = bond.name;
    this.showBondDrawer = true;
    // Prefill form with existing data
    this.bondFormData = {
      name: bond.name,
      mode: bond.mode || 'balance-rr',
      interfaces: bond.interfaces ? bond.interfaces.join(',') : ''
    };
    const interfacesStr = bond.interfaces ? bond.interfaces.join(", ") : "";
    this.bondInterfaceInputValue = interfacesStr;
  }

  // Edit methods for VLAN
  openEditVlanDrawer(vlan: any) {
    this.isEditingVlan = true;
    this.editingVlanName = vlan.name;
    this.showVLANDrawer = true;
    // Prefill form with existing data
    this.vlanFormData = {
      interface: vlan.interface || '',
      vlanId: vlan.vlan_id || 0,
      name: vlan.name
    };
    this.vlanInterfaceInputValue = vlan.interface || "";
  }

  async handleCreateBridge() {
    if (!this.bridgeFormData.name || !this.bridgeFormData.interfaces) {
      return;
    }

    const request = {
      name: this.bridgeFormData.name,
      interfaces: this.bridgeFormData.interfaces.split(',').map(item => item.trim()).filter(Boolean)
    };
    try {
      let response;
      if (this.isEditingBridge) {
        response = await networkActions.updateBridge(this.editingBridgeName!, { interfaces: request.interfaces });
      } else {
        response = await networkActions.createBridge(request);
      }

      // Handle warnings
      if (response?.warning) {
        this.showOperationWarning('warning', response.warning);
      }
      if (response?.persistence_warning) {
        this.showOperationWarning('persistence', response.persistence_warning);
      }
      if (response?.failed && response.failed.length > 0) {
        this.showOperationWarning('partial-success',
          response.warning || 'Some interfaces failed to add',
          response.failed,
          response.successfully_added);
      }
    } catch (error: any) {
      console.error('Error creating/updating bridge:', error);
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (error.details) {
        errorMessage = `${errorMessage}: ${error.details}`;
      } else if (error.error?.details) {
        errorMessage = `${error.error.message || errorMessage}: ${error.error.details}`;
      }
      this.showOperationWarning('warning', `Failed to save bridge: ${errorMessage}`);
    }
    this.closeBridgeDrawer();
  }

  async handleCreateBond() {
    if (!this.bondFormData.name || !this.bondFormData.mode || !this.bondFormData.interfaces) {
      return;
    }

    const request = {
      name: this.bondFormData.name,
      mode: this.bondFormData.mode,
      interfaces: this.bondFormData.interfaces.split(',').map(item => item.trim()).filter(Boolean)
    };
    try {
      let response;
      if (this.isEditingBond) {
        response = await networkActions.updateBond(this.editingBondName!, { mode: request.mode, interfaces: request.interfaces });
      } else {
        response = await networkActions.createBond(request);
      }

      // Handle warnings
      if (response?.warning) {
        this.showOperationWarning('warning', response.warning);
      }
      if (response?.persistence_warning) {
        this.showOperationWarning('persistence', response.persistence_warning);
      }
      if (response?.failed && response.failed.length > 0) {
        this.showOperationWarning('partial-success',
          response.warning || 'Some interfaces failed to add',
          response.failed,
          response.successfully_added);
      }
    } catch (error: any) {
      console.error('Error creating/updating bond:', error);
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (error.details) {
        errorMessage = `${errorMessage}: ${error.details}`;
      } else if (error.error?.details) {
        errorMessage = `${error.error.message || errorMessage}: ${error.error.details}`;
      }
      this.showOperationWarning('warning', `Failed to save bond: ${errorMessage}`);
    }
    this.closeBondDrawer();
  }

  async handleCreateVLANInterface() {
    if (!this.vlanFormData.interface || this.vlanFormData.vlanId <= 0) {
      return;
    }

    const request = {
      interface: this.vlanFormData.interface,
      vlan_id: this.vlanFormData.vlanId,
      name: this.vlanFormData.name || `${this.vlanFormData.interface}.${this.vlanFormData.vlanId}`
    };
    try {
      let response;
      if (this.isEditingVlan) {
        response = await networkActions.updateVlan(this.editingVlanName!, { vlan_id: request.vlan_id });
      } else {
        response = await networkActions.createVlan(request);
      }

      // Handle warnings
      if (response?.warning) {
        this.showOperationWarning('warning', response.warning);
      }
      if (response?.persistence_warning) {
        this.showOperationWarning('persistence', response.persistence_warning);
      }
      if (response?.failed && response.failed.length > 0) {
        this.showOperationWarning('partial-success',
          response.warning || 'Some operations failed',
          response.failed,
          response.successfully_added);
      }
    } catch (error: any) {
      console.error('Error creating/updating vlan:', error);
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (error.details) {
        errorMessage = `${errorMessage}: ${error.details}`;
      } else if (error.error?.details) {
        errorMessage = `${error.error.message || errorMessage}: ${error.error.details}`;
      }
      this.showOperationWarning('warning', `Failed to save VLAN: ${errorMessage}`);
    }
    this.closeVLANDrawer();
  }

  renderInterface(iface: NetworkInterface) {
    return html`
      <div class="network-interface">
        <div class="interface-header">
          <span class="interface-name">
            ${iface.name}
          </span>
          <span class="interface-state ${iface.state === 'up' ? 'state-up' : 'state-down'}">
            ${iface.state}
          </span>
        </div>
        <div class="interface-details">
          <div class="detail-item">
            <span class="detail-label">${t('network.rxBytes')}</span>
            <span class="detail-value">${iface.statistics.rx_bytes}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">${t('network.txBytes')}</span>
            <span class="detail-value">${iface.statistics.tx_bytes}</span>
          </div>
        </div>
        <div class="interface-actions">
          <button class="action-button primary" @click="${() => this.toggleInterfaceState(iface)}">
            ${t(iface.state === 'up' ? 'network.bringDown' : 'network.bringUp')}
          </button>
          <button class="action-button" @click="${() => this.handleConfigureAddress(iface)}">
            ${t('network.configure')}
          </button>
        </div>
      </div>
    `;
  }

  private getPageTitle() {
    switch (this.activeTab) {
      case 'interfaces':
        return t('network.interfaces');
      case 'bridges':
        return t('network.bridges');
      case 'bonds':
        return t('network.bonds');
      case 'vlans':
        return t('network.vlans');
      default:
        return t('network.title');
    }
  }

  private filterInterfaces() {
    let filtered = this.interfaces;

    // Apply type filter
    if (this.selectedType !== 'all') {
      filtered = filtered.filter(iface => iface.type === this.selectedType);
    }

    // Apply search filter
    if (this.searchQuery) {
      filtered = filtered.filter(iface =>
        iface.name.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    return filtered;
  }

  override render() {
    return html`
      <div class="tab-container">
        <h1>${this.getPageTitle()}</h1>

        ${this.operationWarning ? html`
          <operation-warning
            .type=${this.operationWarning.type}
            .message=${this.operationWarning.message}
            .failures=${this.operationWarning.failures || []}
            .successfulItems=${this.operationWarning.successItems || []}
            @close=${this.dismissOperationWarning}
          ></operation-warning>
        ` : ''}
        <div class="tab-content">
          ${this.activeTab === 'interfaces' ? html`
            <div class="filter-container">
              <select 
                class="type-filter-select"
                .value=${this.selectedType}
                @change=${async (e: Event) => {
          this.selectedType = (e.target as HTMLSelectElement).value;
          await this.fetchInterfaces();
        }}
              >
                <option value="all">All Types</option>
                ${this.interfaceTypes.map(type => html`
                  <option value="${type}">${type}</option>
                `)}
              </select>
              
              <div class="search-container">
                <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input 
                  class="form-input search-input"
                  type="text"
                  placeholder="${t('network.searchInterfaces')}"
                  .value=${this.searchQuery}
                  @input=${(e: Event) => this.searchQuery = (e.target as HTMLInputElement).value}
                />
              </div>
            </div>
${this.interfaces.length > 0 ? html`
              <table class="network-table">
                <thead>
                  <tr>
                    <th>${t('common.name')}</th>
                    <th>${t('common.state')}</th>
                    <th>IPs</th>
                    <th>${t('network.rxBytes')}</th>
                    <th>${t('network.txBytes')}</th>
                    <th>${t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.filterInterfaces().map((iface, index) => html`
                    <tr>
                      <td>
                        <span class="interface-name-link" @click=${() => this.openDetailsDrawer(iface)}>
                          ${iface.name}
                        </span>
                      </td>
                      <td>
                        <div class="status-indicator">
                          <span class="status-icon ${iface.state === 'up' ? 'up' : 'down'}" data-tooltip="${iface.state === 'up' ? 'Up' : 'Down'}"></span>
                        </div>
                      </td>
                      <td class="ip-addresses-cell">
                        ${iface.addresses && iface.addresses.length > 0
            ? iface.addresses.length <= 3
              ? html`
                                <div class="ip-list">
                                  ${iface.addresses.map(addr => html`
                                    <div class="ip-address">${addr}</div>
                                  `)}
                                </div>
                              `
              : html`
                                <div class="ip-list-collapsed">
                                  ${iface.addresses.slice(0, 2).map(addr => html`
                                    <div class="ip-address">${addr}</div>
                                  `)}
                                  <div class="ip-more-indicator">+${iface.addresses.length - 2} more...</div>
                                </div>
                                <div class="ip-list-expanded">
                                  ${iface.addresses.map(addr => html`
                                    <div class="ip-address">${addr}</div>
                                  `)}
                                </div>
                              `
            : html`<span style="color: var(--text-secondary); font-size: 0.85rem;">-</span>`
          }
                      </td>
                      <td>${iface.statistics.rx_bytes}</td>
                      <td>${iface.statistics.tx_bytes}</td>
                      <td>
                        <div class="action-menu">
                          <button class="action-dots" @click=${(e: Event) => this.toggleActionMenu(e, `interface-${index}`)}>⋮</button>
                          <div class="action-dropdown" id="interface-${index}">
                            <button @click=${() => { this.closeAllMenus(); this.toggleInterfaceState(iface); }}>
                              ${iface.state === 'up' ? 'Down' : 'Up'}
                            </button>
                            <button @click=${() => { this.closeAllMenus(); this.handleConfigureAddress(iface); }}>
                              ${t('network.configure')}
                            </button>
                            <button @click=${() => { this.closeAllMenus(); this.openDetailsDrawer(iface); }}>
                              View Details
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  `)}
                </tbody>
              </table>
            ` : html`<div class="empty-state">${t('network.noInterfaces')}</div>`}
          ` : ''}

          ${this.activeTab === 'bridges' ? html`
            <div class="interface-search" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div class="search-container">
                <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input 
                  class="form-input search-input"
                  type="text"
                  placeholder="${t('network.searchBridges')}"
                  .value=${this.bridgeSearchQuery}
                  @input=${(e: Event) => this.bridgeSearchQuery = (e.target as HTMLInputElement).value}
                />
              </div>
              <button class="action-button primary" @click="${this.openBridgeDrawer}">
                ${this.isEditingBridge ? t('common.update') : t('network.createBridge')}
              </button>
            </div>
            
            ${this.bridges.length > 0 ? html`
              <table class="network-table">
                <thead>
                  <tr>
                    <th>${t('common.name')}</th>
                    <th>${t('common.state')}</th>
                    <th>${t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.bridges.filter(bridge => bridge.name.toLowerCase().includes(this.bridgeSearchQuery.toLowerCase())).map((bridge, index) => html`
                    <tr>
                      <td>
                        <span class="interface-name-link" @click=${() => this.openDetailsDrawer(bridge)}>
                          ${bridge.name}
                        </span>
                      </td>
                      <td>
                        <div class="status-indicator">
                          <span class="status-icon ${bridge.state === 'up' ? 'up' : 'down'}" data-tooltip="${bridge.state === 'up' ? 'Up' : 'Down'}"></span>
                        </div>
                      </td>
                      <td>
                        <div class="action-menu">
                          <button class="action-dots" @click=${(e: Event) => this.toggleActionMenu(e, `bridge-${index}`)}>${'⋮'}</button>
                          <div class="action-dropdown" id="bridge-${index}">
                            <button @click=${() => { this.closeAllMenus(); this.openEditBridgeDrawer(bridge); }}>
                              ${t('common.edit')}
                            </button>
                            <button class="danger" @click=${() => { this.closeAllMenus(); this.deleteBridge(bridge.name); }}>
                              ${t('common.delete')}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  `)}
                </tbody>
              </table>
            ` : html`<div class="empty-state">${t('network.noBridges')}</div>`}
          ` : ''}

          ${this.activeTab === 'bonds' ? html`
            <div class="interface-search" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div class="search-container">
                <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input 
                  class="form-input search-input"
                  type="text"
                  placeholder="${t('network.searchBonds')}"
                  .value=${this.bondSearchQuery}
                  @input=${(e: Event) => this.bondSearchQuery = (e.target as HTMLInputElement).value}
                />
              </div>
              <button class="action-button primary" @click="${this.openBondDrawer}">
                ${this.isEditingBond ? t('common.update') : t('network.createBond')}
              </button>
            </div>
            
            ${this.bonds.length > 0 ? html`
              <table class="network-table">
                <thead>
                  <tr>
                    <th>${t('common.name')}</th>
                    <th>${t('common.state')}</th>
                    <th>${t('network.mode')}</th>
                    <th>${t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.bonds.filter(bond => bond.name.toLowerCase().includes(this.bondSearchQuery.toLowerCase())).map((bond, index) => html`
                    <tr>
                      <td>${bond.name}</td>
                      <td>
                        <div class="status-indicator">
                          <span class="status-icon ${bond.state === 'up' ? 'up' : 'down'}" data-tooltip="${bond.state === 'up' ? 'Up' : 'Down'}"></span>
                        </div>
                      </td>
                      <td>${(bond as any).mode || 'N/A'}</td>
                      <td>
                        <div class="action-menu">
                          <button class="action-dots" @click=${(e: Event) => this.toggleActionMenu(e, `bond-${index}`)}>${'⋮'}</button>
                          <div class="action-dropdown" id="bond-${index}">
                            <button @click=${() => { this.closeAllMenus(); this.openEditBondDrawer(bond); }}>
                              ${t('common.edit')}
                            </button>
                            <button class="danger" @click=${() => { this.closeAllMenus(); this.deleteBond(bond.name); }}>
                              ${t('common.delete')}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  `)}
                </tbody>
              </table>
            ` : html`<div class="empty-state">${t('network.noBonds')}</div>`}
          ` : ''}

          ${this.activeTab === 'vlans' ? html`
            <div class="interface-search" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div class="search-container">
                <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input 
                  class="form-input search-input"
                  type="text"
                  placeholder="${t('network.searchVLANs')}"
                  .value=${this.vlanSearchQuery}
                  @input=${(e: Event) => this.vlanSearchQuery = (e.target as HTMLInputElement).value}
                />
              </div>
              <button class="action-button primary" @click="${this.openVLANDrawer}">
                ${this.isEditingVlan ? t('common.update') : t('network.createVLAN')}
              </button>
            </div>
            
            ${this.vlans.length > 0 ? html`
              <table class="network-table">
                <thead>
                  <tr>
                    <th>${t('common.name')}</th>
                    <th>${t('common.state')}</th>
                    <th>${t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.vlans.filter(vlan => vlan.name.toLowerCase().includes(this.vlanSearchQuery.toLowerCase())).map((vlan, index) => html`
                    <tr>
                      <td>${vlan.name}</td>
                      <td>
                        <div class="status-indicator">
                          <span class="status-icon ${vlan.state === 'up' ? 'up' : 'down'}" data-tooltip="${vlan.state === 'up' ? 'Up' : 'Down'}"></span>
                        </div>
                      </td>
                      <td>
                        <div class="action-menu">
                          <button class="action-dots" @click=${(e: Event) => this.toggleActionMenu(e, `vlan-${index}`)}>${'⋮'}</button>
                          <div class="action-dropdown" id="vlan-${index}">
                            <button @click=${() => { this.closeAllMenus(); this.openEditVlanDrawer(vlan); }}>
                              ${t('common.edit')}
                            </button>
                            <button class="danger" @click=${() => { this.closeAllMenus(); this.deleteVlan(vlan.name); }}>
                              ${t('common.delete')}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  `)}
                </tbody>
              </table>
            ` : html`<div class="empty-state">${t('network.noVLANs')}</div>`}
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
          <button class="action-button" @click=${this.handleCancel}>
            ${t('common.cancel')}
          </button>
          <button class="action-button primary" @click=${this.handleConfirm}>
            ${t('common.confirm')}
          </button>
        </div>
      </modal-dialog>

      ${this.showConfigureDrawer ? html`
        <div class="drawer">
          <div class="drawer-header">
            <h2 class="drawer-title">${t('network.configureInterface')}</h2>
            <button class="close-btn" @click="${() => this.closeConfigureDrawer()}">×</button>
          </div>
          <div class="drawer-content">
            ${this.configureNetworkInterface ? html`
              <form id="configure-form" @submit=${(e: Event) => { e.preventDefault(); this.submitConfigureAddress(); }}>
                <div class="section">
                  <div class="field" style="margin-bottom: 16px;">
                    <label>Interface Name</label>
                    <div style="font-size: 13px;">${this.configureNetworkInterface.name}</div>
                  </div>
                  <div class="field" style="margin-bottom: 16px;">
                    <label>Current State</label>
                    <div style="font-size: 13px;">${this.configureNetworkInterface.state}</div>
                  </div>
                  
                  <div class="field">
                    <label class="required" for="address">${t('network.ipAddress')}</label>
                    <input 
                      id="address"
                      type="text" 
                      placeholder="192.168.1.100"
                      .value=${this.configureFormData.address}
                      @input=${(e: Event) => this.configureFormData.address = (e.target as HTMLInputElement).value}
                      required
                    />
                  </div>
                  
                  <div class="field">
                    <label class="required" for="netmask">${t('network.netmaskCidr')}</label>
                    <input 
                      id="netmask"
                      type="number" 
                      min="0" 
                      max="32" 
                      placeholder="24"
                      .value=${this.configureFormData.netmask}
                      @input=${(e: Event) => this.configureFormData.netmask = parseInt((e.target as HTMLInputElement).value) || 24}
                      required
                    />
                  </div>
                  
                  <div class="field">
                    <label for="gateway">${t('network.gatewayOptional')}</label>
                    <input 
                      id="gateway"
                      type="text" 
                      placeholder="192.168.1.1"
                      .value=${this.configureFormData.gateway}
                      @input=${(e: Event) => this.configureFormData.gateway = (e.target as HTMLInputElement).value}
                    />
                  </div>
                </div>
              </form>
            ` : null}
          </div>
          <div class="drawer-footer">
            <button type="button" class="action-button" @click="${() => this.closeConfigureDrawer()}">
              ${t('common.cancel')}
            </button>
            <button type="submit" form="configure-form" class="action-button primary">
              ${t('network.applyConfiguration')}
            </button>
          </div>
        </div>
      ` : null}

      ${this.showBridgeDrawer ? html`
        <div class="drawer">
          <div class="drawer-header">
            <h2 class="drawer-title">${this.isEditingBridge ? t('network.editBridgeTitle') : t('network.createBridgeTitle')}</h2>
            <button class="close-btn" @click="${() => this.closeBridgeDrawer()}">×</button>
          </div>
          <div class="drawer-content">
            <form id="bridge-form" @submit=${(e: Event) => { e.preventDefault(); this.handleCreateBridge(); }}>
              <div class="section">
                <div class="field">
                  <label class="required" for="bridge-name">${t('network.bridgeName')}</label>
                  <input 
                    id="bridge-name"
                    type="text" 
                    placeholder="br0"
                    .value=${this.bridgeFormData.name}
                    @input=${(e: Event) => this.bridgeFormData.name = (e.target as HTMLInputElement).value}
                    required
                    ?disabled=${this.isEditingBridge}
                  />
                </div>
                
                <div class="field">
                  <label class="required" for="bridge-interfaces">${t('network.interfaces')}</label>
                  <div class="autocomplete-container">
                    <input 
                      id="bridge-interfaces"
                      type="text" 
                      placeholder="eth0, eth1"
                      .value=${this.bridgeInterfaceInputValue}
                      @input=${(e: Event) => {
          this.bridgeFormData.interfaces = (e.target as HTMLInputElement).value;
          this.handleBridgeInterfaceInput(e);
        }}
                      @keydown=${(e: KeyboardEvent) => this.handleBridgeInterfaceKeyDown(e)}
                      @blur=${() => this.closeBridgeInterfacesSuggestions()}
                      autocomplete="off"
                      required
                    />
                    ${this.showBridgeInterfacesSuggestions && this.getFilteredSuggestions().length > 0 ? html`
                      <div class="autocomplete-suggestions">
                        ${this.getFilteredSuggestions().map((name, index) => html`
                          <div 
                            class="autocomplete-suggestion ${index === this.selectedSuggestionIndex ? 'selected' : ''}"
                            @mousedown=${(e: Event) => {
            e.preventDefault();
            this.selectSuggestion(name);
          }}
                          >
                            ${name}
                          </div>
                        `)}
                      </div>
                    ` : ''}
                  </div>
                  <div class="hint">
                    ${t('network.commaSeparatedInterfaces')}
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div class="drawer-footer">
            <button type="button" class="action-button" @click="${() => this.closeBridgeDrawer()}">
              ${t('common.cancel')}
            </button>
            <button type="submit" form="bridge-form" class="action-button primary">
              ${this.isEditingBridge ? t('common.update') : t('network.createBridge')}
            </button>
          </div>
        </div>
      ` : null}

      ${this.showBondDrawer ? html`
        <div class="drawer">
          <div class="drawer-header">
            <h2 class="drawer-title">${this.isEditingBond ? t('network.editBondTitle') : t('network.createBondTitle')}</h2>
            <button class="close-btn" @click="${() => this.closeBondDrawer()}">×</button>
          </div>
          <div class="drawer-content">
            <form id="bond-form" @submit=${(e: Event) => { e.preventDefault(); this.handleCreateBond(); }}>
              <div class="section">
                <div class="field">
                  <label class="required" for="bond-name">${t('network.bondName')}</label>
                  <input 
                    id="bond-name"
                    type="text" 
                    placeholder="bond0"
                    .value=${this.bondFormData.name}
                    @input=${(e: Event) => this.bondFormData.name = (e.target as HTMLInputElement).value}
                    required
                    ?disabled=${this.isEditingBond}
                  />
                </div>
                
                <div class="field">
                  <label class="required" for="bond-mode">${t('network.mode')}</label>
                  <select 
                    id="bond-mode"
                    .value=${this.bondFormData.mode}
                    @input=${(e: Event) => this.bondFormData.mode = (e.target as HTMLSelectElement).value as BondMode}
                    required
                  >
                    <option value="balance-rr">balance-rr (Round-robin)</option>
                    <option value="active-backup">active-backup</option>
                    <option value="balance-xor">balance-xor</option>
                    <option value="broadcast">broadcast</option>
                    <option value="802.3ad">802.3ad (LACP)</option>
                    <option value="balance-tlb">balance-tlb</option>
                    <option value="balance-alb">balance-alb</option>
                  </select>
                </div>
                
                <div class="field">
                  <label class="required" for="bond-interfaces">${t('network.interfaces')}</label>
                  <div class="autocomplete-container">
                    <input 
                      id="bond-interfaces"
                      type="text" 
                      placeholder="eth2, eth3"
                      .value=${this.bondInterfaceInputValue}
                      @input=${(e: Event) => {
          this.bondFormData.interfaces = (e.target as HTMLInputElement).value;
          this.handleBondInterfaceInput(e);
        }}
                      @keydown=${(e: KeyboardEvent) => this.handleBondInterfaceKeyDown(e)}
                      @blur=${() => this.closeBondInterfacesSuggestions()}
                      autocomplete="off"
                      required
                    />
                    ${this.showBondInterfacesSuggestions && this.getFilteredBondSuggestions().length > 0 ? html`
                      <div class="autocomplete-suggestions">
                        ${this.getFilteredBondSuggestions().map((name, index) => html`
                          <div 
                            class="autocomplete-suggestion ${index === this.selectedBondSuggestionIndex ? 'selected' : ''}"
                            @mousedown=${(e: Event) => {
            e.preventDefault();
            this.selectBondSuggestion(name);
          }}
                          >
                            ${name}
                          </div>
                        `)}
                      </div>
                    ` : ''}
                  </div>
                  <div class="hint">
                    ${t('network.commaSeparatedInterfaces')}
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div class="drawer-footer">
            <button type="button" class="action-button" @click="${() => this.closeBondDrawer()}">
              ${t('common.cancel')}
            </button>
            <button type="submit" form="bond-form" class="action-button primary">
              ${this.isEditingBond ? t('common.update') : t('network.createBond')}
            </button>
          </div>
        </div>
      ` : null}

      ${this.showVLANDrawer ? html`
        <div class="drawer">
          <div class="drawer-header">
            <h2 class="drawer-title">${this.isEditingVlan ? t('network.editVlanTitle') : t('network.createVlanTitle')}</h2>
            <button class="close-btn" @click="${() => this.closeVLANDrawer()}">×</button>
          </div>
          <div class="drawer-content">
            <form id="vlan-form" @submit=${(e: Event) => { e.preventDefault(); this.handleCreateVLANInterface(); }}>
              <div class="section">
                <div class="field">
                  <label class="required" for="vlan-interface">${t('network.baseInterface')}</label>
                  <div class="autocomplete-container">
                    <input 
                      id="vlan-interface"
                      type="text" 
                      placeholder="eth0"
                      .value=${this.vlanInterfaceInputValue}
                      ?disabled=${this.isEditingVlan}
                      @input=${(e: Event) => {
          this.vlanFormData.interface = (e.target as HTMLInputElement).value;
          this.handleVlanInterfaceInput(e);
        }}
                      @keydown=${(e: KeyboardEvent) => this.handleVlanInterfaceKeyDown(e)}
                      @blur=${() => this.closeVlanInterfacesSuggestions()}
                      autocomplete="off"
                      required
                    />
                    ${this.showVlanInterfacesSuggestions && this.getFilteredVlanSuggestions().length > 0 ? html`
                      <div class="autocomplete-suggestions">
                        ${this.getFilteredVlanSuggestions().map((name, index) => html`
                          <div 
                            class="autocomplete-suggestion ${index === this.selectedVlanSuggestionIndex ? 'selected' : ''}"
                            @mousedown=${(e: Event) => {
            e.preventDefault();
            this.selectVlanSuggestion(name);
          }}
                          >
                            ${name}
                          </div>
                        `)}
                      </div>
                    ` : ''}
                  </div>
                </div>
                
                
                <div class="field">
                  <label class="required" for="vlan-id">${t('network.vlanId')}</label>
                  <input 
                    id="vlan-id"
                    type="number"
                    min="1"
                    max="4094"
                    placeholder="100"
                    .value=${this.vlanFormData.vlanId}
                    @input=${(e: Event) => this.vlanFormData.vlanId = parseInt((e.target as HTMLInputElement).value) || 0}
                    required
                  />
                </div>

                <div class="field">
                  <label for="vlan-name">${t('network.vlanNameOptional')}</label>
                  <input 
                    id="vlan-name"
                    type="text"
                    placeholder="eth0.100"
                    .value=${this.vlanFormData.name}
                    @input=${(e: Event) => this.vlanFormData.name = (e.target as HTMLInputElement).value}
                    ?disabled=${this.isEditingVlan}
                  />
                  <div class="hint">
                    ${t('network.vlanNameDefault', {
            interface: this.vlanFormData.interface || '<interface>',
            vlan_id: this.vlanFormData.vlanId || '<vlan_id>'
          })}
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div class="drawer-footer">
            <button type="button" class="action-button" @click="${() => this.closeVLANDrawer()}">
              ${t('common.cancel')}
            </button>
            <button type="submit" form="vlan-form" class="action-button primary">
              ${this.isEditingVlan ? t('common.update') : t('network.createVLAN')}
            </button>
          </div>
        </div>
      ` : null}

      ${this.showDetailsDrawer && this.selectedInterface ? html`
        <div class="drawer">
          <div class="drawer-header">
            <h2 class="drawer-title">Interface Details: ${this.selectedInterface.name}</h2>
            <button class="close-btn" @click="${() => this.closeDetailsDrawer()}">×</button>
          </div>
          <div class="drawer-content">
            
            <!-- Interface Information Section -->
            <div class="interface-info-section">
              <div class="interface-info-grid">
                <div class="info-item">
                  <div class="info-label">Status</div>
                  <div class="info-value">
                    <span class="interface-state ${this.selectedInterface.state === 'up' ? 'state-up' : 'state-down'}">
                      ${this.selectedInterface.state}
                    </span>
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-label">Type</div>
                  <div class="info-value">${this.selectedInterface.type || 'Unknown'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">MAC Address</div>
                  <div class="info-value">${this.selectedInterface.mac || 'N/A'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">MTU</div>
                  <div class="info-value">${this.selectedInterface.mtu || 'N/A'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">RX Bytes</div>
                  <div class="info-value">${this.selectedInterface.statistics.rx_bytes}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">TX Bytes</div>
                  <div class="info-value">${this.selectedInterface.statistics.tx_bytes}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">RX Packets</div>
                  <div class="info-value">${this.selectedInterface.statistics.rx_packets}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">TX Packets</div>
                  <div class="info-value">${this.selectedInterface.statistics.tx_packets}</div>
                </div>
              </div>
            </div>

            <!-- IP Addresses Section -->
            <div class="section-header">
              <h3 class="section-title">IP Addresses</h3>
              <button class="add-btn" @click="${() => this.openAddIpModal()}">
                + Add IP
              </button>
            </div>

            <!-- IP Addresses Table -->
            ${this.selectedInterface.addresses && this.selectedInterface.addresses.length > 0 ? html`
              <table class="details-table">
                <thead>
                  <tr>
                    <th>IP Address</th>
                    <th style="text-align: right;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.selectedInterface.addresses.map((address, index) => html`
                    <tr>
                      <td>${address}</td>
                      <td style="text-align: right;">
                        <div class="action-menu">
                          <button class="action-dots" @click=${(e: Event) => this.toggleActionMenu(e, `ip-${index}`)}>
                            ⋮
                          </button>
                          <div class="action-dropdown" id="ip-${index}">
                            <button @click=${() => { this.closeAllMenus(); this.openEditIpModal(index, address); }}>
                              Edit
                            </button>
                            <button class="danger" @click=${() => { this.closeAllMenus(); this.deleteIpAddress(address); }}>
                              Delete
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  `)}
                </tbody>
              </table>
            ` : html`
              <div class="empty-state" style="padding: 2rem; text-align: center;">
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">No IP addresses configured</p>
                <button class="action-button primary" @click="${() => this.openAddIpModal()}">
                  Add First IP Address
                </button>
              </div>
            `}

            <!-- Member Interfaces Section (for bridges/bonds) -->
            ${this.selectedInterface.interfaces && this.selectedInterface.interfaces.length > 0 ? html`
              <div class="section-header" style="margin-top: 2rem;">
                <h3 class="section-title">Member Interfaces</h3>
              </div>
              <table class="details-table">
                <thead>
                  <tr>
                    <th>Interface Name</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.selectedInterface.interfaces.map(ifaceName => html`
                    <tr>
                      <td>${ifaceName}</td>
                    </tr>
                  `)}
                </tbody>
              </table>
            ` : ''}
          </div>
          <div class="drawer-footer">
            <button class="action-button" @click="${() => this.closeDetailsDrawer()}">
              Close
            </button>
            <button class="action-button ${this.selectedInterface.state === 'up' ? '' : 'primary'}" 
                    @click="${() => { this.toggleInterfaceState(this.selectedInterface!); this.closeDetailsDrawer(); }}">
              ${this.selectedInterface.state === 'up' ? 'Bring Down' : 'Bring Up'}
            </button>
          </div>
        </div>
      ` : null}

      <!-- Add IP Modal -->
      <modal-dialog
        ?open=${this.showAddIpModal}
        .title="Add IP Address"
        size="medium"
        .showFooter=${false}
        @modal-close=${() => this.closeAddIpModal()}
      >
        <form @submit=${(e: Event) => { e.preventDefault(); this.addNewIpAddress(); }}>
          <div class="section">
            <div class="field">
              <label class="required" for="modal-ip-address">IP Address</label>
              <input 
                id="modal-ip-address"
                type="text" 
                placeholder="192.168.1.100"
                .value=${this.newIpAddress}
                @input=${(e: Event) => this.newIpAddress = (e.target as HTMLInputElement).value}
                required
                autofocus
              />
            </div>
            
            <div class="field">
              <label class="required" for="modal-netmask">Netmask (CIDR)</label>
              <input 
                id="modal-netmask"
                type="number" 
                min="0" 
                max="32" 
                placeholder="24"
                .value=${this.newIpNetmask}
                @input=${(e: Event) => this.newIpNetmask = parseInt((e.target as HTMLInputElement).value) || 24}
                required
              />
            </div>
            
            <div class="field">
              <label for="modal-gateway">Gateway (Optional)</label>
              <input 
                id="modal-gateway"
                type="text" 
                placeholder="192.168.1.1"
                .value=${this.newIpGateway}
                @input=${(e: Event) => this.newIpGateway = (e.target as HTMLInputElement).value}
              />
            </div>
          </div>
          
          <div slot="footer" style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button" class="action-button" @click=${() => this.closeAddIpModal()}>
              ${t('common.cancel')}
            </button>
            <button type="submit" class="action-button primary">
              Add IP Address
            </button>
          </div>
        </form>
      </modal-dialog>

      <!-- Edit IP Modal -->
      <modal-dialog
        ?open=${this.showEditIpModal}
        .title="Edit IP Address"
        size="medium"
        .showFooter=${false}
        @modal-close=${() => this.closeEditIpModal()}
      >
        <form @submit=${(e: Event) => { e.preventDefault(); this.saveEditedIp(); }}>
          <div class="section">
            <div class="field">
              <label class="required" for="edit-ip-address">IP Address</label>
              <input 
                id="edit-ip-address"
                type="text" 
                placeholder="192.168.1.100"
                .value=${this.editIpAddress}
                @input=${(e: Event) => this.editIpAddress = (e.target as HTMLInputElement).value}
                required
                autofocus
              />
            </div>
            
            <div class="field">
              <label class="required" for="edit-netmask">Netmask (CIDR)</label>
              <input 
                id="edit-netmask"
                type="number" 
                min="0" 
                max="32" 
                placeholder="24"
                .value=${this.editIpNetmask}
                @input=${(e: Event) => this.editIpNetmask = parseInt((e.target as HTMLInputElement).value) || 24}
                required
              />
            </div>
            
            <div class="field">
              <label for="edit-gateway">Gateway (Optional)</label>
              <input 
                id="edit-gateway"
                type="text" 
                placeholder="192.168.1.1"
                .value=${this.editIpGateway}
                @input=${(e: Event) => this.editIpGateway = (e.target as HTMLInputElement).value}
              />
            </div>
          </div>

          <div class="field" style="background-color: var(--surface-0); padding: 0.75rem; border-radius: 4px; border: 1px solid var(--border-color);">
            <div class="info-label" style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Original IP Address</div>
            <div class="info-value" style="font-size: 0.9rem; color: var(--text-primary);">${this.originalIpAddress}</div>
          </div>
          
          <div slot="footer" style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button" class="action-button" @click=${() => this.closeEditIpModal()}>
              ${t('common.cancel')}
            </button>
            <button type="submit" class="action-button primary">
              Save Changes
            </button>
          </div>
        </form>
      </modal-dialog>
    `;
  }
}

customElements.define('network-tab', NetworkTab);
