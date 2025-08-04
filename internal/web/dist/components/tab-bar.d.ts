import { I18nLitElement } from '../i18n-mixin';
interface Tab {
    id: string;
    label: string;
    closable?: boolean;
}
export declare class TabBar extends I18nLitElement {
    tabs: Tab[];
    activeTabId: string;
    static styles: import("lit").CSSResult;
    private handleTabClick;
    private handleTabClose;
    private handleAddTab;
    render(): import("lit-html").TemplateResult<1>;
}
export {};
//# sourceMappingURL=tab-bar.d.ts.map