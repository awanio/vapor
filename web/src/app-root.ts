import { LitElement, html, css, property } from 'lit';
import { t } from './i18n';

class AppRoot extends LitElement {
  @property({ type: Boolean }) sidebarCollapsed = false;

  static styles = css`
    :host {
      display: block;
      height: 100vh;
      background-color: var(--vscode-bg);
      color: var(--vscode-text);
      font-family: var(--vscode-font);
    }
  
    .app-header {
      background-color: var(--vscode-titlebar);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      height: 40px;
    }

    .app-content {
      display: flex;
      height: calc(100vh - 40px);
    }

    .sidebar {
      width: 250px;
      background-color: var(--vscode-sidebar);
      transition: width 0.3s ease-in-out; /* Smoothly transition width */
    }

    .sidebar.collapsed {
      width: 50px;
    }

    .main {
      flex: 1;
      overflow: auto;
      background-color: var(--vscode-bg);
      color: var(--vscode-text);
    }
  `;

  render() {
    return html`
      <!-- App Header -->
      <header class="app-header">
        <div>${t('app.title')}</div>
        <button @click="${this.toggleSidebar}">${this.sidebarCollapsed ? 'Expand' : 'Collapse'} Sidebar</button>
      </header>

      <!-- App Content -->
      <div class="app-content">
        <!-- Sidebar -->
        <nav class="sidebar ${this.sidebarCollapsed ? 'collapsed' : ''}">
          <!-- Sidebar content -->
        </nav>

        <!-- Main Content -->
        <main class="main">
          <!-- Main content -->
        </main>
      </div>
    `;
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
}

customElements.define('app-root', AppRoot);
