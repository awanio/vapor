import { LitElement, html, css } from 'lit';
import { t } from '../i18n';
import { api } from '../api';

export class NetworkTab extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 16px;
    }

    .network-interface {
      background-color: var(--vscode-bg-light);
      color: var(--vscode-text);
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .interface-stats {
      display: flex;
      flex-direction: column;
    }

    .interface-action {
      background-color: var(--vscode-accent);
      color: white;
      border: none;
      border-radius: 4px;
      padding: 0.5em 1em;
      cursor: pointer;
      text-transform: uppercase;
    }
  `;

  static properties = {
    interfaces: { type: Array }
  };  

  constructor() {
    super();
    this.interfaces = [];
  }

  firstUpdated() {
    this.fetchInterfaces();
  }

  async fetchInterfaces() {
    try {
      const data = await api.get('/network/interfaces');
      this.interfaces = data.interfaces;
    } catch (error) {
      console.error('Error fetching network interfaces:', error);
    }
  }

  toggleInterfaceState(iface) {
    const url = `/network/interfaces/${iface.name}/${iface.state === 'up' ? 'down' : 'up'}`;
    api.put(url).then(() => this.fetchInterfaces()).catch(console.error);
  }

  renderInterface(iface) {
    return html`
      <div class="network-interface">
        <div class="interface-stats">
          <div>${iface.name} (${iface.state})</div>
          <div>${t('network.interfaces.rxBytes')}: ${iface.statistics.rx_bytes}</div>
          <div>${t('network.interfaces.txBytes')}: ${iface.statistics.tx_bytes}</div>
        </div>
        <button class="interface-action" @click="${() => this.toggleInterfaceState(iface)}">
          ${iface.state === 'up' ? t('network.interfaces.bringDown') : t('network.interfaces.bringUp')}
        </button>
      </div>
    `;
  }

  render() {
    return html`
      <h1>${t('network.interfaces.title')}</h1>
      ${this.interfaces.map((iface) => this.renderInterface(iface))}
    `;
  }
}

customElements.define('network-tab', NetworkTab);
