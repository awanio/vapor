import { LitElement, html, css, unsafeCSS, PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import xtermStyles from 'xterm/css/xterm.css?inline';
import { $token } from '../../stores/auth';
import { getWsUrl } from '../../config';

@customElement('container-terminal')
export class ContainerTerminal extends LitElement {
  @property({ type: String }) containerId = '';
  @property({ type: String }) containerName = '';
  @property({ type: String }) runtime = 'docker';

  @query('#terminal-container') containerElement!: HTMLElement;

  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private socket: WebSocket | null = null;
  private resizeObserver: ResizeObserver | null = null;

  static override styles = [
    css`${unsafeCSS(xtermStyles)}`,
    css`
      :host {
        display: block;
        height: 100%;
        width: 100%;
        background-color: #1e1e1e;
        overflow: hidden;
      }
      #terminal-container {
        height: 100%;
        width: 100%;
        padding: 4px;
        box-sizing: border-box;
      }
    `
  ];

  override firstUpdated() {
    this.initTerminal();
  }

  override updated(changedProperties: PropertyValues) {
    if (changedProperties.has('containerId') || changedProperties.has('runtime')) {
      if (this.containerId) {
        if (this.socket) {
          this.disconnect();
          this.terminal?.reset();
        }
        this.connect();
      }
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.disconnect();
    this.terminal?.dispose();
    this.resizeObserver?.disconnect();
  }

  private initTerminal() {
    this.terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      }
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.loadAddon(new WebLinksAddon());

    this.terminal.open(this.containerElement);
    this.fitAddon.fit();

    this.terminal.onData((data) => {
      this.sendInput(data);
    });

    this.terminal.onResize((size) => {
      this.sendResize(size.rows, size.cols);
    });

    this.resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        this.fitAddon?.fit();
        if (this.terminal) {
          this.sendResize(this.terminal.rows, this.terminal.cols);
        }
      });
    });
    this.resizeObserver.observe(this.containerElement);
  }

  private connect() {
    if (!this.containerId) return;
    const queryParams = `?container=${encodeURIComponent(this.containerId)}&runtime=${encodeURIComponent(this.runtime)}`;
    const url = getWsUrl(`/ws/containers/exec${queryParams}`);

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      const name = this.containerName || this.containerId;
      this.terminal?.writeln(`
Connecting to container ${name}...
`);

      const token = $token.get();
      this.sendMessage('auth', { token });
      this.sendMessage('subscribe', { channel: 'container-exec' });

      this.fitAddon?.fit();
      if (this.terminal) {
        this.sendResize(this.terminal.rows, this.terminal.cols);
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (e) {
        console.error('Failed to parse message', e);
      }
    };

    this.socket.onclose = () => {
      this.terminal?.writeln('\r\nConnection closed.\r\n');
    };

    this.socket.onerror = (error) => {
      this.terminal?.writeln('\r\nConnection error.\r\n');
      console.error('WebSocket error', error);
    };
  }

  private disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private sendMessage(type: string, payload: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type,
        payload
      }));
    }
  }

  private sendInput(data: string) {
    this.sendMessage('input', { data });
  }

  private sendResize(rows: number, cols: number) {
    this.sendMessage('resize', { rows, cols });
  }

  private handleMessage(msg: any) {
    switch (msg.type) {
      case 'output':
        if (msg.payload && msg.payload.data) {
          this.terminal?.write(msg.payload.data);
        }
        break;
      case 'error':
        if (msg.payload && msg.payload.message) {
          this.terminal?.writeln(`
Error: ${msg.payload.message}
`);
        }
        break;
    }
  }

  override render() {
    return html`<div id="terminal-container"></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'container-terminal': ContainerTerminal;
  }
}
