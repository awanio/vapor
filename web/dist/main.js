import './styles/tailwind.css';
import { i18n } from './i18n';
import { auth } from './auth';
import { theme } from './theme';
theme.getTheme();
auth.isAuthenticated();
i18n.init().then(() => {
    console.log('i18n initialized, loading app...');
    import('./app-root');
    console.log('Vapor Web UI initialized');
}).catch((error) => {
    console.error('Failed to initialize i18n:', error);
});
//# sourceMappingURL=main.js.map