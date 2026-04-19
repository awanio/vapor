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
        // Carbon Design System token aliases
        'vscode': {
          'bg': 'var(--cds-background)',
          'bg-light': 'var(--cds-layer-01)',
          'bg-lighter': 'var(--cds-layer-02)',
          'sidebar': 'var(--cds-layer-01)',
          'sidebar-hover': 'var(--vscode-sidebar-hover)',
          'sidebar-active': 'var(--vscode-sidebar-active)',
          'titlebar': 'var(--cds-background)',
          'statusbar': 'var(--cds-button-primary)',
          'editor': 'var(--cds-background)',
          'tab': 'var(--cds-layer-01)',
          'tab-active': 'var(--cds-background)',
          'border': 'var(--cds-border-subtle)',
          'text': 'var(--cds-text-primary)',
          'text-dim': 'var(--cds-text-secondary)',
          'text-bright': 'var(--vscode-text-bright)',
          'accent': 'var(--cds-button-primary)',
          'accent-hover': 'var(--cds-button-primary-hover)',
          'success': 'var(--cds-support-success)',
          'warning': 'var(--cds-support-warning)',
          'error': 'var(--cds-support-error)',
          'info': 'var(--cds-support-info)',
        }
      },
      fontFamily: {
        'sans': ['"Helvetica Neue"', 'Arial', '"Segoe UI"', 'Helvetica', 'sans-serif'],
        'mono': ['"SF Mono"', 'Menlo', 'Consolas', '"Liberation Mono"', 'monospace'],
        'serif': ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
      },
      spacing: {
        // Carbon 8px grid / spacing scale
        '0.5': '2px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '24px',
        '6': '32px',
        '7': '40px',
        '8': '48px',
      },
      borderRadius: {
        'none': '0px',
        'tag': '24px',
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
