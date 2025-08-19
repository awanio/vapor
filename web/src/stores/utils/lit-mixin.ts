/**
 * Store provider mixin for Lit components
 * Provides integration between Nanostores and Lit with proper lifecycle management
 */

import { LitElement, PropertyValueMap } from 'lit';
import { StoreController } from '@nanostores/lit';
import type { ReadableAtom, WritableAtom } from 'nanostores';
import type { Constructor } from 'lit/decorators.js';

/**
 * Store subscription configuration
 */
export interface StoreSubscription<T = any> {
  /**
   * The store atom to subscribe to
   */
  store: ReadableAtom<T> | WritableAtom<T>;
  
  /**
   * Property name to bind the store value to
   */
  property?: string;
  
  /**
   * Callback when store value changes
   */
  onChange?: (value: T) => void;
  
  /**
   * Transform the store value before setting
   */
  transform?: (value: T) => any;
}

/**
 * Store mixin configuration
 */
export interface StoreMixinConfig {
  /**
   * Store subscriptions
   */
  stores?: StoreSubscription[];
  
  /**
   * Enable debug logging
   */
  debug?: boolean;
  
  /**
   * Auto-unsubscribe on disconnect
   */
  autoUnsubscribe?: boolean;
}

/**
 * Store controller with enhanced functionality
 */
export class EnhancedStoreController<T> extends StoreController<T> {
  private subscription?: StoreSubscription<T>;
  private unsubscribe?: () => void;
  
  constructor(
    host: LitElement,
    store: ReadableAtom<T> | WritableAtom<T>,
    subscription?: StoreSubscription<T>
  ) {
    super(host, store);
    this.subscription = subscription;
  }
  
  hostConnected(): void {
    super.hostConnected();
    
    if (this.subscription?.onChange) {
      // Subscribe to store changes
      this.unsubscribe = (this.store as any).subscribe(this.subscription.onChange);
    }
  }
  
  hostDisconnected(): void {
    super.hostDisconnected();
    
    // Clean up subscription
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }
  
  get value(): T {
    const rawValue = super.value;
    
    // Apply transformation if provided
    if (this.subscription?.transform) {
      return this.subscription.transform(rawValue) as any;
    }
    
    return rawValue;
  }
}

/**
 * Interface for components using the store mixin
 */
export interface StoreConnected {
  /**
   * Store controllers managed by this component
   */
  readonly storeControllers: Map<string, EnhancedStoreController<any>>;
  
  /**
   * Subscribe to a store
   */
  subscribeToStore<T>(
    store: ReadableAtom<T> | WritableAtom<T>,
    config?: Partial<StoreSubscription<T>>
  ): EnhancedStoreController<T>;
  
  /**
   * Unsubscribe from a store
   */
  unsubscribeFromStore(controller: EnhancedStoreController<any>): void;
  
  /**
   * Get store value
   */
  getStoreValue<T>(store: ReadableAtom<T> | WritableAtom<T>): T;
  
  /**
   * Set store value (for writable stores)
   */
  setStoreValue<T>(store: WritableAtom<T>, value: T): void;
  
  /**
   * Clean up all store subscriptions
   */
  cleanupStores(): void;
}

/**
 * Store provider mixin for Lit components
 * 
 * @example
 * ```typescript
 * @customElement('my-component')
 * export class MyComponent extends StoreMixin(LitElement) {
 *   // Declare store controllers
 *   private userStore = this.subscribeToStore($user, {
 *     property: 'user',
 *     onChange: (user) => console.log('User changed:', user)
 *   });
 *   
 *   render() {
 *     return html`
 *       <div>User: ${this.userStore.value?.name}</div>
 *     `;
 *   }
 * }
 * ```
 */
export function StoreMixin<T extends Constructor<LitElement>>(
  Base: T,
  config?: StoreMixinConfig
): T & Constructor<StoreConnected> {
  class StoreConnectedElement extends Base implements StoreConnected {
    readonly storeControllers = new Map<string, EnhancedStoreController<any>>();
    private _storeIdCounter = 0;
    private _debug = config?.debug ?? false;
    private _autoUnsubscribe = config?.autoUnsubscribe ?? true;
    
    constructor(...args: any[]) {
      super(...args);
      
      // Initialize configured stores
      if (config?.stores) {
        config.stores.forEach(subscription => {
          this.subscribeToStore(subscription.store, subscription);
        });
      }
    }
    
    /**
     * Subscribe to a store
     */
    subscribeToStore<T>(
      store: ReadableAtom<T> | WritableAtom<T>,
      subscriptionConfig?: Partial<StoreSubscription<T>>
    ): EnhancedStoreController<T> {
      const storeId = `store_${++this._storeIdCounter}`;
      
      if (this._debug) {
        console.log(`[StoreMixin] Subscribing to store: ${storeId}`);
      }
      
      // Create enhanced controller
      const controller = new EnhancedStoreController(
        this as any,
        store,
        subscriptionConfig as StoreSubscription<T>
      );
      
      // Store controller
      this.storeControllers.set(storeId, controller);
      
      // Bind to property if specified
      if (subscriptionConfig?.property) {
        Object.defineProperty(this, subscriptionConfig.property, {
          get: () => controller.value,
          configurable: true,
        });
      }
      
      return controller;
    }
    
    /**
     * Unsubscribe from a store
     */
    unsubscribeFromStore(controller: EnhancedStoreController<any>): void {
      // Find and remove controller
      for (const [id, ctrl] of this.storeControllers.entries()) {
        if (ctrl === controller) {
          if (this._debug) {
            console.log(`[StoreMixin] Unsubscribing from store: ${id}`);
          }
          
          this.storeControllers.delete(id);
          break;
        }
      }
    }
    
    /**
     * Get store value directly
     */
    getStoreValue<T>(store: ReadableAtom<T> | WritableAtom<T>): T {
      return store.get();
    }
    
    /**
     * Set store value (for writable stores)
     */
    setStoreValue<T>(store: WritableAtom<T>, value: T): void {
      store.set(value);
      
      if (this._debug) {
        console.log('[StoreMixin] Store value updated:', value);
      }
    }
    
    /**
     * Clean up all store subscriptions
     */
    cleanupStores(): void {
      if (this._debug) {
        console.log(`[StoreMixin] Cleaning up ${this.storeControllers.size} store subscriptions`);
      }
      
      this.storeControllers.clear();
    }
    
    /**
     * Lifecycle: Connected callback
     */
    connectedCallback(): void {
      super.connectedCallback();
      
      if (this._debug) {
        console.log('[StoreMixin] Component connected');
      }
    }
    
    /**
     * Lifecycle: Disconnected callback
     */
    disconnectedCallback(): void {
      if (this._autoUnsubscribe) {
        this.cleanupStores();
      }
      
      if (this._debug) {
        console.log('[StoreMixin] Component disconnected');
      }
      
      super.disconnectedCallback();
    }
    
    /**
     * Lifecycle: First update
     */
    protected firstUpdated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
      super.firstUpdated(changedProperties);
      
      if (this._debug) {
        console.log('[StoreMixin] Component first updated');
      }
    }
  }
  
  return StoreConnectedElement as T & Constructor<StoreConnected>;
}

/**
 * Decorator for store subscription
 * 
 * @example
 * ```typescript
 * @customElement('my-component')
 * export class MyComponent extends LitElement {
 *   @storeSubscription($user)
 *   private userController!: EnhancedStoreController<User>;
 *   
 *   render() {
 *     return html`<div>${this.userController.value?.name}</div>`;
 *   }
 * }
 * ```
 */
export function storeSubscription<T>(
  store: ReadableAtom<T> | WritableAtom<T>,
  config?: Partial<StoreSubscription<T>>
) {
  return (target: any, propertyKey: string) => {
    const originalConnectedCallback = target.connectedCallback;
    
    target.connectedCallback = function(this: LitElement & StoreConnected) {
      // Initialize store mixin if not already
      if (!this.storeControllers) {
        Object.assign(this, {
          storeControllers: new Map<string, EnhancedStoreController<any>>(),
          subscribeToStore: StoreMixin.prototype.subscribeToStore,
          unsubscribeFromStore: StoreMixin.prototype.unsubscribeFromStore,
          getStoreValue: StoreMixin.prototype.getStoreValue,
          setStoreValue: StoreMixin.prototype.setStoreValue,
          cleanupStores: StoreMixin.prototype.cleanupStores,
        });
      }
      
      // Subscribe to store
      const controller = this.subscribeToStore(store, config);
      (this as any)[propertyKey] = controller;
      
      // Call original connected callback
      if (originalConnectedCallback) {
        originalConnectedCallback.call(this);
      }
    };
    
    const originalDisconnectedCallback = target.disconnectedCallback;
    
    target.disconnectedCallback = function(this: LitElement & StoreConnected) {
      // Cleanup stores
      if (this.cleanupStores) {
        this.cleanupStores();
      }
      
      // Call original disconnected callback
      if (originalDisconnectedCallback) {
        originalDisconnectedCallback.call(this);
      }
    };
  };
}

/**
 * Helper to create computed store controller
 * 
 * @example
 * ```typescript
 * const filteredItems = computedController(
 *   this,
 *   [$items, $filter],
 *   (items, filter) => items.filter(i => i.name.includes(filter))
 * );
 * ```
 */
export function computedController<T, Args extends ReadableAtom<any>[]>(
  host: LitElement,
  stores: Args,
  compute: (...values: { [K in keyof Args]: Args[K] extends ReadableAtom<infer V> ? V : never }) => T
): EnhancedStoreController<T> {
  // Create a computed atom
  const computed = createComputedAtom(stores, compute);
  
  // Return controller for the computed atom
  return new EnhancedStoreController(host, computed);
}

/**
 * Helper to create a computed atom
 */
function createComputedAtom<T, Args extends ReadableAtom<any>[]>(
  stores: Args,
  compute: (...values: any[]) => T
): ReadableAtom<T> {
  const { computed } = require('nanostores');
  return computed(stores, compute);
}

/**
 * Export store controller for direct use
 */
export { StoreController } from '@nanostores/lit';
