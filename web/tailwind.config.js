/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // VS Code inspired colors
        'vscode': {
          'bg': 'var(--vscode-bg)',
          'bg-light': 'var(--vscode-bg-light)',
          'bg-lighter': 'var(--vscode-bg-lighter)',
          'sidebar': 'var(--vscode-sidebar)',
          'sidebar-hover': 'var(--vscode-sidebar-hover)',
          'sidebar-active': 'var(--vscode-sidebar-active)',
          'titlebar': 'var(--vscode-titlebar)',
          'statusbar': 'var(--vscode-statusbar)',
          'editor': 'var(--vscode-editor-background)',
          'tab': 'var(--vscode-tab)',
          'tab-active': 'var(--vscode-tab-active)',
          'border': 'var(--vscode-border)',
          'text': 'var(--vscode-text)',
          'text-dim': 'var(--vscode-text-dim)',
          'text-bright': 'var(--vscode-text-bright)',
          'accent': 'var(--vscode-accent)',
          'accent-hover': 'var(--vscode-accent-hover)',
          'success': 'var(--vscode-success)',
          'warning': 'var(--vscode-warning)',
          'error': 'var(--vscode-error)',
          'info': 'var(--vscode-info)',
        }
      },
      fontFamily: {
        'mono': ['Consolas', 'Monaco', 'Courier New', 'monospace'],
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      transitionProperty: {
        'width': 'width',
        'spacing': 'margin, padding',
      }
    },
  },
  plugins: [],
}
