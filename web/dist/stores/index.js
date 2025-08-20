export * from './types';
export { createStore } from './utils/factory';
export { createApiClient, createCrudApi, ApiError, PollingManager, } from './utils/api';
import { pollingManager } from './utils/api';
import { wsManager } from './shared/websocket';
export { StoreMixin, storeSubscription, computedController, EnhancedStoreController, StoreController, } from './utils/lit-mixin';
export { wsManager, $connectionHealth, $activeConnections, $totalConnections, } from './shared/websocket';
export * from './shared/metrics';
export * from './shared/terminal';
export { atom, computed, map } from 'nanostores';
export { persistentAtom, persistentMap } from '@nanostores/persistent';
export function initializeStores(config) {
    const { debug = false, wsAutoConnect = true } = config || {};
    if (debug) {
        console.log('[Stores] Initializing store system');
        wsManager.debug = true;
        if (process.env.NODE_ENV === 'development') {
            window.addEventListener('websocket:event', (event) => {
                console.log('[WebSocket Event]', event.detail);
            });
        }
    }
    if (wsAutoConnect) {
        console.log('[Stores] WebSocket auto-connect enabled');
    }
    window.addEventListener('auth:logout', () => {
        if (debug) {
            console.log('[Stores] Auth logout detected, cleaning up');
        }
        wsManager.closeAll();
        pollingManager.stopAll();
    });
    if (debug) {
        console.log('[Stores] Store system initialized');
    }
}
export function cleanupStores() {
    wsManager.closeAll();
    pollingManager.stopAll();
    console.log('[Stores] Store system cleaned up');
}
//# sourceMappingURL=index.js.map