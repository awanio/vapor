import { defineConfig } from 'vitepress'

export default defineConfig({
  // Server configuration
  vite: {
    server: {
      port: 5174,
      host: true
    }
  },
  
  title: 'Vapor Documentation',
  description: 'Container and Kubernetes Management Platform',
  
  // Enable theme switching with dark as default
  appearance: true,
  
  // Theme configuration
  themeConfig: {
    // Logo
    logo: '/assets/vapor-logo.png',
    
    // Navigation
    nav: [
      { text: 'Guide', link: '/en/01-introduction' },
      { text: 'Installation', link: '/en/02-installation' },
      { text: 'API Reference', link: '/en/13-api-reference' }
    ],
    
    // Sidebar
    sidebar: {
      '/en/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/en/01-introduction' },
            { text: 'Installation', link: '/en/02-installation' },
            { text: 'First Login', link: '/en/03-first-login' }
          ]
        },
        {
          text: 'User Guide',
          items: [
            { text: 'User Interface', link: '/en/04-user-interface' },
            { text: 'Dashboard', link: '/en/05-dashboard' },
            { text: 'Network Management', link: '/en/06-network-management' },
            { text: 'Storage Management', link: '/en/07-storage-management' },
            { text: 'Container Management', link: '/en/08-container-management' },
            { text: 'Kubernetes Management', link: '/en/09-kubernetes-management' }
          ]
        },
        {
          text: 'Administration',
          items: [
            { text: 'User Management', link: '/en/10-user-management' },
            { text: 'System Logs', link: '/en/11-system-logs' },
            { text: 'Terminal Access', link: '/en/12-terminal-access' }
          ]
        },
        {
          text: 'Reference',
          items: [
            { text: 'API Reference', link: '/en/13-api-reference' },
            { text: 'Security', link: '/en/14-security' },
            { text: 'Troubleshooting', link: '/en/15-troubleshooting' }
          ]
        }
      ],
      '/id/': [
        {
          text: 'Mulai',
          items: [
            { text: 'Pendahuluan', link: '/id/01-introduction' },
            { text: 'Instalasi', link: '/id/02-installation' },
            { text: 'Login Pertama', link: '/id/03-first-login' }
          ]
        },
        {
          text: 'Panduan Pengguna',
          items: [
            { text: 'Antarmuka Pengguna', link: '/id/04-user-interface' },
            { text: 'Dashboard', link: '/id/05-dashboard' },
            { text: 'Manajemen Jaringan', link: '/id/06-network-management' },
            { text: 'Manajemen Penyimpanan', link: '/id/07-storage-management' },
            { text: 'Manajemen Container', link: '/id/08-container-management' },
            { text: 'Manajemen Kubernetes', link: '/id/09-kubernetes-management' }
          ]
        },
        {
          text: 'Administrasi',
          items: [
            { text: 'Manajemen Pengguna', link: '/id/10-user-management' },
            { text: 'Log Sistem', link: '/id/11-system-logs' },
            { text: 'Akses Terminal', link: '/id/12-terminal-access' }
          ]
        },
        {
          text: 'Referensi',
          items: [
            { text: 'Referensi API', link: '/id/13-api-reference' },
            { text: 'Keamanan', link: '/id/14-security' },
            { text: 'Pemecahan Masalah', link: '/id/15-troubleshooting' }
          ]
        }
      ]
    },
    
    // Social links
    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-org/vapor' }
    ],
    
    // Search
    search: {
      provider: 'local'
    },
    
    // Footer
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 Vapor'
    }
  },
  
  // Markdown configuration
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    }
  }
})
