import { LitElement } from 'lit';
import { i18n } from './i18n';
export class I18nLitElement extends LitElement {
    connectedCallback() {
        super.connectedCallback();
        this._i18nUnsubscribe = i18n.onChange(() => {
            this.requestUpdate();
        });
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._i18nUnsubscribe) {
            this._i18nUnsubscribe();
            this._i18nUnsubscribe = undefined;
        }
    }
}
//# sourceMappingURL=i18n-mixin.js.map