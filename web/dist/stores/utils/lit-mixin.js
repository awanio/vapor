import { StoreController } from '@nanostores/lit';
export class EnhancedStoreController extends StoreController {
    constructor(host, store, subscription) {
        super(host, store);
        this._store = store;
        this.subscription = subscription;
    }
    hostConnected() {
        super.hostConnected();
        if (this.subscription?.onChange) {
            this._unsubscribe = this._store.subscribe(this.subscription.onChange);
        }
    }
    hostDisconnected() {
        super.hostDisconnected();
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = undefined;
        }
    }
    get value() {
        const rawValue = super.value;
        if (this.subscription?.transform) {
            return this.subscription.transform(rawValue);
        }
        return rawValue;
    }
}
export function StoreMixin(Base, config) {
    class StoreConnectedElement extends Base {
        constructor(...args) {
            super(...args);
            this.storeControllers = new Map();
            this._storeIdCounter = 0;
            this._debug = config?.debug ?? false;
            this._autoUnsubscribe = config?.autoUnsubscribe ?? true;
            if (config?.stores) {
                config.stores.forEach(subscription => {
                    this.subscribeToStore(subscription.store, subscription);
                });
            }
        }
        subscribeToStore(store, subscriptionConfig) {
            const storeId = `store_${++this._storeIdCounter}`;
            if (this._debug) {
                console.log(`[StoreMixin] Subscribing to store: ${storeId}`);
            }
            const controller = new EnhancedStoreController(this, store, subscriptionConfig);
            this.storeControllers.set(storeId, controller);
            if (subscriptionConfig?.property) {
                Object.defineProperty(this, subscriptionConfig.property, {
                    get: () => controller.value,
                    configurable: true,
                });
            }
            return controller;
        }
        unsubscribeFromStore(controller) {
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
        getStoreValue(store) {
            return store.get();
        }
        setStoreValue(store, value) {
            store.set(value);
            if (this._debug) {
                console.log('[StoreMixin] Store value updated:', value);
            }
        }
        cleanupStores() {
            if (this._debug) {
                console.log(`[StoreMixin] Cleaning up ${this.storeControllers.size} store subscriptions`);
            }
            this.storeControllers.clear();
        }
        connectedCallback() {
            super.connectedCallback();
            if (this._debug) {
                console.log('[StoreMixin] Component connected');
            }
        }
        disconnectedCallback() {
            if (this._autoUnsubscribe) {
                this.cleanupStores();
            }
            if (this._debug) {
                console.log('[StoreMixin] Component disconnected');
            }
            super.disconnectedCallback();
        }
        firstUpdated(changedProperties) {
            super.firstUpdated(changedProperties);
            if (this._debug) {
                console.log('[StoreMixin] Component first updated');
            }
        }
    }
    return StoreConnectedElement;
}
export function storeSubscription(store, config) {
    return (target, propertyKey) => {
        const originalConnectedCallback = target.connectedCallback;
        target.connectedCallback = function () {
            if (!this.storeControllers) {
                Object.assign(this, {
                    storeControllers: new Map(),
                    subscribeToStore: StoreMixin.prototype.subscribeToStore,
                    unsubscribeFromStore: StoreMixin.prototype.unsubscribeFromStore,
                    getStoreValue: StoreMixin.prototype.getStoreValue,
                    setStoreValue: StoreMixin.prototype.setStoreValue,
                    cleanupStores: StoreMixin.prototype.cleanupStores,
                });
            }
            const controller = this.subscribeToStore(store, config);
            this[propertyKey] = controller;
            if (originalConnectedCallback) {
                originalConnectedCallback.call(this);
            }
        };
        const originalDisconnectedCallback = target.disconnectedCallback;
        target.disconnectedCallback = function () {
            if (this.cleanupStores) {
                this.cleanupStores();
            }
            if (originalDisconnectedCallback) {
                originalDisconnectedCallback.call(this);
            }
        };
    };
}
export function computedController(host, stores, compute) {
    const computed = createComputedAtom(stores, compute);
    return new EnhancedStoreController(host, computed);
}
function createComputedAtom(stores, compute) {
    const { computed } = require('nanostores');
    return computed(stores, compute);
}
export { StoreController } from '@nanostores/lit';
//# sourceMappingURL=lit-mixin.js.map