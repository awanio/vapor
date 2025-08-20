import { LitElement } from 'lit';
import { StoreController } from '@nanostores/lit';
import type { ReadableAtom, WritableAtom } from 'nanostores';
type Constructor<T = {}> = new (...args: any[]) => T;
export interface StoreSubscription<T = any> {
    store: ReadableAtom<T> | WritableAtom<T>;
    property?: string;
    onChange?: (value: T) => void;
    transform?: (value: T) => any;
}
export interface StoreMixinConfig {
    stores?: StoreSubscription[];
    debug?: boolean;
    autoUnsubscribe?: boolean;
}
export declare class EnhancedStoreController<T> extends StoreController<T> {
    private subscription?;
    private _unsubscribe?;
    private _store;
    constructor(host: LitElement, store: ReadableAtom<T> | WritableAtom<T>, subscription?: StoreSubscription<T>);
    hostConnected(): void;
    hostDisconnected(): void;
    get value(): T;
}
export interface StoreConnected {
    readonly storeControllers: Map<string, EnhancedStoreController<any>>;
    subscribeToStore<T>(store: ReadableAtom<T> | WritableAtom<T>, config?: Partial<StoreSubscription<T>>): EnhancedStoreController<T>;
    unsubscribeFromStore(controller: EnhancedStoreController<any>): void;
    getStoreValue<T>(store: ReadableAtom<T> | WritableAtom<T>): T;
    setStoreValue<T>(store: WritableAtom<T>, value: T): void;
    cleanupStores(): void;
}
export declare function StoreMixin<T extends Constructor<LitElement>>(Base: T, config?: StoreMixinConfig): T & Constructor<StoreConnected>;
export declare function storeSubscription<T>(store: ReadableAtom<T> | WritableAtom<T>, config?: Partial<StoreSubscription<T>>): (target: any, propertyKey: string) => void;
export declare function computedController<T, Args extends ReadableAtom<any>[]>(host: LitElement, stores: Args, compute: (...values: {
    [K in keyof Args]: Args[K] extends ReadableAtom<infer V> ? V : never;
}) => T): EnhancedStoreController<T>;
export { StoreController } from '@nanostores/lit';
//# sourceMappingURL=lit-mixin.d.ts.map