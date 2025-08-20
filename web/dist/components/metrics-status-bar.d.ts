import { LitElement } from 'lit';
declare const MetricsStatusBar_base: typeof LitElement & (new (...args: any[]) => import("../stores/utils/lit-mixin").StoreConnected);
export declare class MetricsStatusBar extends MetricsStatusBar_base {
    static styles: import("lit").CSSResult;
    private cpuUsage;
    private memoryUsage;
    private availableMemory;
    private loadAverage;
    private metricsConnected;
    private metricsAlerts;
    private getValueClass;
    render(): import("lit-html").TemplateResult<1>;
}
export default MetricsStatusBar;
//# sourceMappingURL=metrics-status-bar.d.ts.map