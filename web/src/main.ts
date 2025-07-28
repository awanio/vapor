import './app-root';
import './styles/tailwind.css';
import { i18n } from './i18n';

// Initialize i18n
i18n.init().then(() => {
  console.log('Vapor Web UI initialized');
}).catch((error) => {
  console.error('Failed to initialize i18n:', error);
});
