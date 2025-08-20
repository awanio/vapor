import { LitElement, TemplateResult } from 'lit';
import '../ui/status-badge.js';
export declare class ResourceDetailView extends LitElement {
    resource: any;
    static styles: import("lit").CSSResult;
    render(): TemplateResult<1>;
    private renderMetadata;
    private renderSpec;
    private renderStatus;
    private renderData;
    private renderAdditionalSections;
    private renderObject;
    private renderProperty;
    private renderConditions;
    private renderValue;
    private getValueClass;
    private formatKey;
    private formatTimestamp;
    private isTimestamp;
    private renderObjectAsDetailItems;
    private renderPodDetails;
    private renderDetailItem;
    private renderNestedObject;
    private renderContainerDetails;
    private renderConditionDetails;
}
declare global {
    interface HTMLElementTagNameMap {
        'resource-detail-view': ResourceDetailView;
    }
}
//# sourceMappingURL=resource-detail-view.d.ts.map