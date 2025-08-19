/**
 * Vapor WebUI State Management System
 * Main exports for the store system
 */

// Export types
export * from './types';

// Export utilities
export { createStore, type StoreFactoryOptions, type CrudStore } from './utils/factory';
export { 
  createApiClient, 
  createCrudApi, 
  ApiError,
  type ApiConfig,
  type ApiRequestOptions,
  type StoreApiClient,
  PollingManager,
} from './utils/api';

// Import pollingManager and wsManager for internal use
import { pollingManager } from './utils/api';
import { wsManager } from './shared/websocket';

export {
  StoreMixin,
  storeSubscription,
  computedController,
  EnhancedStoreController,
  StoreController,
  type StoreSubscription,
  type StoreMixinConfig,
  type StoreConnected,
} from './utils/lit-mixin';

// Export WebSocket manager
export {
  wsManager,
  $connectionHealth,
  $activeConnections,
  $totalConnections,
} from './shared/websocket';

// Export Metrics store
export * from './shared/metrics';

// Export Terminal store
export * from './shared/terminal';

// Re-export nanostores core functions for convenience
export { atom, computed, map } from 'nanostores';
export { persistentAtom, persistentMap } from '@nanostores/persistent';

/**
 * Store initialization helper
 * Call this once when the app starts to initialize the store system
 */
export function initializeStores(config?: {
  debug?: boolean;
  wsAutoConnect?: boolean;
}): void {
  const { debug = false, wsAutoConnect = true } = config || {};
  
  if (debug) {
    console.log('[Stores] Initializing store system');
    
    // Enable debug mode for WebSocket manager
    (wsManager as any).debug = true;
    
    // Log store changes in development
    if (process.env.NODE_ENV === 'development') {
      window.addEventListener('websocket:event', (event: any) => {
        console.log('[WebSocket Event]', event.detail);
      });
    }
  }
  
  // Auto-connect to metrics WebSocket if enabled
  if (wsAutoConnect) {
    // This will be used by metric components
    console.log('[Stores] WebSocket auto-connect enabled');
  }
  
  // Listen for auth events to clear stores
  window.addEventListener('auth:logout', () => {
    if (debug) {
      console.log('[Stores] Auth logout detected, cleaning up');
    }
    
    // Close all WebSocket connections
    wsManager.closeAll();
    
    // Stop all polling
    pollingManager.stopAll();
  });
  
  if (debug) {
    console.log('[Stores] Store system initialized');
  }
}

/**
 * Store cleanup helper
 * Call this when the app is unmounting
 */
export function cleanupStores(): void {
  // Close all WebSocket connections
  wsManager.closeAll();
  
  // Stop all polling
  pollingManager.stopAll();
  
  console.log('[Stores] Store system cleaned up');
}
