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
          'bg': '#1e1e1e',
          'bg-light': '#252526',
          'bg-lighter': '#2d2d30',
          'sidebar': '#252526',
          'sidebar-hover': '#2a2d2e',
          'sidebar-active': '#094771',
          'titlebar': '#3c3c3c',
          'statusbar': '#007acc',
          'editor': '#1e1e1e',
          'tab': '#2d2d30',
          'tab-active': '#1e1e1e',
          'border': '#464647',
          'text': '#cccccc',
          'text-dim': '#969696',
          'text-bright': '#ffffff',
          'accent': '#007acc',
          'accent-hover': '#1a85c7',
          'success': '#4ec9b0',
          'warning': '#dcdcaa',
          'error': '#f48771',
          'info': '#3794ff',
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
