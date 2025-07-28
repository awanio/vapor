import './styles/tailwind.css';
import { i18n } from './i18n';
import { auth } from './auth';
import { theme } from './theme';

// Initialize theme first to apply saved preference
theme.getTheme();

// Initialize auth to ensure it loads tokens from localStorage
// Force auth initialization by accessing it
auth.isAuthenticated();

// Then import app-root which will check auth status
import('./app-root');

// Initialize i18n
i18n.init().then(() => {
  console.log('Vapor Web UI initialized');
}).catch((error) => {
  console.error('Failed to initialize i18n:', error);
});
