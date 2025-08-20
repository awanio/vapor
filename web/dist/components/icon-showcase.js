var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { icon, renderInlineIcon } from '../utils/icons';
let IconShowcase = class IconShowcase extends LitElement {
    constructor() {
        super(...arguments);
        this.inlineIcons = new Map();
    }
    async connectedCallback() {
        super.connectedCallback();
        const iconNames = ['kubernetes', 'ansible', 'helm', 'docker'];
        for (const name of iconNames) {
            const inlineIcon = await renderInlineIcon(name, { size: 'lg' });
            this.inlineIcons.set(name, inlineIcon);
        }
        this.requestUpdate();
    }
    render() {
        const sizes = ['xs', 'sm', 'md', 'lg', 'xl'];
        return html `
      <h2>Technology Icons Showcase</h2>
      
      <h3>Using img elements (recommended for most cases)</h3>
      <div class="icon-grid">
        ${['kubernetes', 'ansible', 'helm', 'docker', 'terraform', 'jenkins'].map(name => html `
          <div class="icon-item">
            ${icon(name, { size: 'lg' })}
            <span class="icon-name">${name}</span>
          </div>
        `)}
      </div>

      <h3>Different Sizes</h3>
      <div style="display: flex; gap: 1rem; align-items: center;">
        ${sizes.map(size => html `
          <div style="text-align: center;">
            ${icon('kubernetes', { size })}
            <div style="font-size: 0.75rem;">${size}</div>
          </div>
        `)}
      </div>

      <h3>Inline SVG (for color customization)</h3>
      <div style="display: flex; gap: 1rem;">
        ${Array.from(this.inlineIcons.entries()).map(([name, iconTemplate]) => html `
          <div class="icon-item" style="color: var(--vscode-terminal-ansiCyan);">
            ${iconTemplate}
            <span class="icon-name">${name}</span>
          </div>
        `)}
      </div>

      <div class="usage-example">
        <h3>Usage Examples</h3>
        
        <p><strong>In your Lit components:</strong></p>
        
        <p>1. Simple icon:</p>
        <pre class="code">import { icon } from '../utils/icons';

// In your render method:
\${icon('kubernetes', { size: 'md' })}</pre>

        <p>2. Direct path reference:</p>
        <pre class="code">html\`&lt;img src="/icons/tech/ansible.svg" class="w-6 h-6" /&gt;\`</pre>

        <p>3. Inline SVG with color:</p>
        <pre class="code">import { renderInlineIcon } from '../utils/icons';

// In async method:
const k8sIcon = await renderInlineIcon('kubernetes', { size: 'lg' });
// Then use in template: \${k8sIcon}</pre>
      </div>
    `;
    }
};
IconShowcase.styles = css `
    :host {
      display: block;
      padding: 1rem;
    }

    .icon-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .icon-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.5rem;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
    }

    .icon-name {
      margin-top: 0.5rem;
      font-size: 0.75rem;
      text-align: center;
    }

    .usage-example {
      margin-top: 2rem;
      padding: 1rem;
      background: var(--vscode-editor-background);
      border-radius: 4px;
    }

    .code {
      font-family: monospace;
      background: var(--vscode-textCodeBlock-background);
      padding: 0.25rem 0.5rem;
      border-radius: 2px;
    }
  `;
__decorate([
    state()
], IconShowcase.prototype, "inlineIcons", void 0);
IconShowcase = __decorate([
    customElement('icon-showcase')
], IconShowcase);
export { IconShowcase };
//# sourceMappingURL=icon-showcase.js.map