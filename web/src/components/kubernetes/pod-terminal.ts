import { LitElement, html, css, unsafeCSS, PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import xtermStyles from 'xterm/css/xterm.css?inline';
import {  } from '../../stores/auth';

@customElement('pod-terminal')
export class PodTerminal extends LitElement {
  @property({ type: String }) pod = '';
  @property({ type: String }) namespace = '';
  @property({ type: String }) container = '';

  @query('#terminal-container') containerElement!: HTMLElement;

  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private socket: WebSocket | null = null;
  private resizeObserver: ResizeObserver | null = null;

  static styles = [
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

  firstUpdated() {
    this.initTerminal();
  }

  updated(changedProperties: PropertyValues) {
    if (changedProperties.has('pod') || changedProperties.has('namespace') || changedProperties.has('container')) {
      if (this.pod && this.namespace) {
        // If terminal is already initialized, just connect
        // But if pod changed, we might need to reconnect
        if (this.socket) {
          this.disconnect();
          this.terminal?.reset();
        }
        this.connect();
      }
    }
  }

  disconnectedCallback() {
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
      // Debounce fit
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
    if (!this.pod || !this.namespace) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // Query params for Pod Exec
    const url = `${protocol}//${host}/ws/kubernetes/pods/exec?pod=${this.pod}&namespace=${this.namespace}&container=${this.container || ''}`;

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.terminal?.writeln('\r\nConnecting to pod...\r\n');
      
      // 1. Send Auth
      const token = .get();
      this.sendMessage('auth', { token });

      // 2. Send Subscribe to trigger Start
      // Wait a bit for auth? No, hub handles messages sequentially.
      // But hub.go checks authenticated for Subscribe.
      // So we can send them in order.
      // The channel name doesn't matter much for pod-exec as logic is in Subscribe handlerType check
      // but let's use 'pod-exec' as channel name to be consistent or just empty if not used.
      this.sendMessage('subscribe', { channel: 'pod-exec' });
      
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

    this.socket.onclose = (event) => {
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
            this.terminal?.writeln(`\r\nError: ${msg.payload.message}\r\n`);
        }
        break;
      // Handle other types if needed
    }
  }

  render() {
    return html`<div id="terminal-container"></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pod-terminal': PodTerminal;
  }
}
