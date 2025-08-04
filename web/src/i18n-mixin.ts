import { LitElement } from 'lit';
import { i18n } from './i18n';

export class I18nLitElement extends LitElement {
  private _i18nUnsubscribe?: () => void;

  override connectedCallback() {
    super.connectedCallback();
    
    // Subscribe to i18n changes
    this._i18nUnsubscribe = i18n.onChange(() => {
      this.requestUpdate();
    });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    
    // Unsubscribe from i18n changes
    if (this._i18nUnsubscribe) {
      this._i18nUnsubscribe();
      this._i18nUnsubscribe = undefined;
    }
  }
}
