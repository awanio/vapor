import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AnsibleService } from '../../services/ansible';
import type { GitSyncRequest } from '../../types/ansible';
import '../modal-dialog';

@customElement('git-import-modal')
export class GitImportModal extends LitElement {
  @property({ type: Boolean })
  open = false;

  @state()
  private url = '';

  @state()
  private branch = '';

  @state()
  private path = '';

  @state()
  private authToken = '';

  @state()
  private sshKey = '';

  @state()
  private syncAsSymlink = false;

  @state()
  private importing = false;

  @state()
  private error?: string;

  static override styles = css`
    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      margin-bottom: 6px;
      color: var(--vscode-foreground, #cccccc);
      font-size: 13px;
    }

    .form-input {
      width: 100%;
      padding: 8px 12px;
      background: var(--vscode-input-background, #3c3c3c);
      color: var(--vscode-input-foreground, #cccccc);
      border: 1px solid var(--vscode-input-border, #3c3c3c);
      border-radius: 4px;
      font-size: 13px;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder, #007acc);
    }

    .form-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
    }

    .error-message {
      color: var(--vscode-errorForeground, #f48771);
      margin-top: 8px;
    }
  `;

  private async importFromGit() {
    if (!this.url) {
      this.error = 'Git repository URL is required';
      return;
    }

    this.importing = true;
    this.error = undefined;

    try {
      const request: GitSyncRequest = {
        url: this.url,
        branch: this.branch || undefined,
        path: this.path || undefined,
        auth_token: this.authToken || undefined,
        ssh_key: this.sshKey || undefined,
        sync_as_symlink: this.syncAsSymlink,
      };

      await AnsibleService.syncFromGit(request);

      this.dispatchEvent(new CustomEvent('import-complete', {
        bubbles: true,
        composed: true,
      }));
      this.close();
    } catch (error) {
      console.error('Git import failed:', error);
      this.error = error instanceof Error ? error.message : 'Failed to import from Git';
    } finally {
      this.importing = false;
    }
  }

  private close() {
    this.dispatchEvent(new CustomEvent('close'));
    this.open = false;
  }

  override render() {
    return html`
      <modal-dialog
        .open=${this.open}
        title="Import from Git Repository"
        @modal-close=${this.close}
      >
        <div class="form-group">
          <label class="form-label" for="git-url">Repository URL</label>
          <input
            id="git-url"
            class="form-input"
            type="text"
            .value=${this.url}
            @input=${(e: Event) => this.url = (e.target as HTMLInputElement).value}
            placeholder="https://github.com/user/repo.git"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="git-branch">Branch</label>
          <input
            id="git-branch"
            class="form-input"
            type="text"
            .value=${this.branch}
            @input=${(e: Event) => this.branch = (e.target as HTMLInputElement).value}
            placeholder="main (default)"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="git-path">Path</label>
          <input
            id="git-path"
            class="form-input"
            type="text"
            .value=${this.path}
            @input=${(e: Event) => this.path = (e.target as HTMLInputElement).value}
            placeholder="/playbooks (optional)"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label" for="git-auth-token">Authentication Token (optional)</label>
          <input
            id="git-auth-token"
            class="form-input"
            type="password"
            .value=${this.authToken}
            @input=${(e: Event) => this.authToken = (e.target as HTMLInputElement).value}
            placeholder="ghp_... or similar"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label" for="git-ssh-key">SSH Private Key (optional)</label>
          <textarea
            id="git-ssh-key"
            class="form-input"
            .value=${this.sshKey}
            @input=${(e: Event) => this.sshKey = (e.target as HTMLTextAreaElement).value}
            rows="4"
            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----\n..."
          ></textarea>
        </div>

        <label class="form-checkbox">
          <input
            type="checkbox"
            .checked=${this.syncAsSymlink}
            @change=${(e: Event) => this.syncAsSymlink = (e.target as HTMLInputElement).checked}
          />
          <span>Sync as symlink</span>
        </label>

        ${this.error ? html`
          <div class="error-message">
            <strong>Error:</strong> ${this.error}
          </div>
        ` : ''}

        <div slot="footer">
          <button class="btn btn-secondary" @click=${this.close}>Cancel</button>
          <button 
            class="btn btn-primary" 
            @click=${this.importFromGit}
            ?disabled=${this.importing}
          >
            ${this.importing ? 'Importing...' : 'Import'}
          </button>
        </div>
      </modal-dialog>
    `;
  }
}

