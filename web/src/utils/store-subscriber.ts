/**
 * Store Subscriber Utility
 * Helper for managing atom subscriptions in LitElement components
 */

import { LitElement } from 'lit';
import { ReadableAtom } from 'nanostores';

export interface StoreSubscription {
  unsubscribe: () => void;
}

/**
 * Mixin for LitElement components that need to subscribe to atom stores
 */
export function StoreSubscriberMixin<T extends new (...args: any[]) => LitElement>(
  Base: T
) {
  class StoreSubscriberMixinClass extends Base {
    #subscriptions: StoreSubscription[] = [];

    /**
     * Subscribe to an atom and trigger component update on changes
     */
    protected subscribeToAtom<V>(
      atom: ReadableAtom<V>,
      callback?: (value: V) => void
    ): StoreSubscription {
      const unsubscribe = atom.subscribe((value) => {
        if (callback) {
          callback(value);
        }
        this.requestUpdate();
      });

      const subscription = { unsubscribe };
      this.#subscriptions.push(subscription);
      return subscription;
    }

    /**
     * Subscribe to multiple atoms at once
     */
    protected subscribeToAtoms(
      atoms: Array<{ atom: ReadableAtom<any>; callback?: (value: any) => void }>
    ): void {
      atoms.forEach(({ atom, callback }) => {
        this.subscribeToAtom(atom, callback);
      });
    }

    override connectedCallback(): void {
      super.connectedCallback();
    }

    override disconnectedCallback(): void {
      super.disconnectedCallback();
      // Clean up all subscriptions
      this.#subscriptions.forEach((sub) => sub.unsubscribe());
      this.#subscriptions = [];
    }
  }
  
  return StoreSubscriberMixinClass as T;
}

/**
 * Simple store subscriber for managing atom subscriptions
 */
export class StoreSubscriber {
  private subscriptions: Array<() => void> = [];

  /**
   * Subscribe to an atom
   */
  subscribe<T>(atom: ReadableAtom<T>, callback: (value: T) => void): void {
    const unsubscribe = atom.subscribe(callback);
    this.subscriptions.push(unsubscribe);
  }

  /**
   * Subscribe to an atom and immediately get its value
   */
  subscribeAndGet<T>(atom: ReadableAtom<T>, callback: (value: T) => void): void {
    callback(atom.get());
    this.subscribe(atom, callback);
  }

  /**
   * Unsubscribe from all atoms
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];
  }

  /**
   * Clean up all subscriptions (alias for unsubscribeAll)
   */
  dispose(): void {
    this.unsubscribeAll();
  }
}
