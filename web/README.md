# Vapor Web UI

A modern, VS Code-inspired web interface for Linux system management, built with TypeScript, LitElement, and Tailwind CSS.

## 🚀 Features

- **VS Code-inspired UI**: Dark theme with familiar interface patterns
- **Real-time monitoring**: Live system metrics via WebSocket
- **Comprehensive management**: Network, storage, containers, users, and more
- **Terminal access**: Full terminal emulation in the browser
- **Internationalization**: Support for multiple languages (English and Indonesian)
- **Responsive design**: Works on desktop and mobile devices

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- Go backend server running on port 8080
- Modern web browser with ES6 support

## 🛠️ Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to http://localhost:5173

## 🏗️ Build

To build for production:

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 📁 Project Structure

```
web/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── sidebar-tree.ts
│   │   ├── tab-bar.ts
│   │   ├── modal-dialog.ts
│   │   └── ...
│   ├── views/            # Page/tab components
│   │   ├── dashboard-tab.ts
│   │   ├── network-tab.ts
│   │   ├── storage-tab.ts
│   │   └── ...
│   ├── types/            # TypeScript definitions
│   │   ├── api.d.ts
│   │   └── system.d.ts
│   ├── locales/          # Translation files
│   │   ├── en.json
│   │   └── id.json
│   ├── styles/           # CSS files
│   │   └── tailwind.css
│   ├── auth.ts          # Authentication manager
│   ├── api.ts           # API client utilities
│   ├── i18n.ts          # Internationalization
│   ├── app-root.ts      # Main app component
│   └── main.ts          # Entry point
├── public/              # Static assets
├── index.html          # HTML entry
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript config
├── vite.config.ts      # Vite config
├── tailwind.config.js  # Tailwind config
└── postcss.config.js   # PostCSS config
```

## 🔧 Configuration

### API Endpoint

The API endpoint is configured in `vite.config.ts`. By default, it proxies to `http://localhost:8080`.

### Theme

The app uses a VS Code-inspired dark theme by default. Theme colors are defined in `tailwind.config.js`.

### Languages

To add a new language:
1. Create a new JSON file in `src/locales/`
2. Update the `Locale` type in `src/i18n.ts`
3. Add language option to the settings menu

## 🧩 Key Components

### Authentication (`src/auth.ts`)
- JWT token management
- Auto-refresh on expiration
- WebSocket authentication

### API Client (`src/api.ts`)
- REST API wrapper with auth headers
- WebSocket manager with reconnection
- Error handling

### Components
- **sidebar-tree**: Collapsible navigation tree
- **tab-bar**: VS Code-style tab management
- **modal-dialog**: Reusable modal component
- **status-bar**: Bottom status display

### Views
- **dashboard-tab**: System overview with live metrics
- **network-tab**: Network interface management
- **storage-tab**: Disk and LVM management
- **terminal-tab**: Full terminal emulation
- **logs-tab**: System log viewer
- **users-tab**: User management
- **containers-tab**: Container management

## 🔌 WebSocket Connections

The app uses WebSocket for:
- Real-time system metrics (`/api/v1/ws/metrics`)
- Live log streaming (`/api/v1/ws/logs`)
- Terminal sessions (`/api/v1/ws/terminal`)

## 🧪 Testing

Run tests:
```bash
npm test
```

Run tests with UI:
```bash
npm run test:ui
```

## 🚢 Deployment

1. Build the project:
```bash
npm run build
```

2. Serve the `dist/` directory with your web server
3. Configure your web server to proxy API requests to the Go backend

### Nginx Example

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/dist;
    index index.html;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Proxy WebSocket connections
    location /ws/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 📝 Development Guidelines

1. **Components**: Use LitElement for all components
2. **Styling**: Use Tailwind CSS classes, avoid inline styles
3. **Types**: Define all API responses and component props
4. **i18n**: Use translation keys, never hardcode text
5. **Error Handling**: Always handle API errors gracefully
6. **WebSocket**: Implement reconnection logic for all WS connections

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is part of the Vapor system management suite.
