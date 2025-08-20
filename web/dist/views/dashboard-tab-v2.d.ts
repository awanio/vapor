import { I18nLitElement } from '../i18n-mixin';
declare const DashboardTabV2_base: typeof I18nLitElement & (new (...args: any[]) => import("../stores/utils/lit-mixin").StoreConnected);
export declare class DashboardTabV2 extends DashboardTabV2_base {
    static styles: import("lit").CSSResult;
    private cpuChart;
    private memoryChart;
    private systemSummary;
    private cpuInfo;
    private memoryInfo;
    private currentCpu;
    private currentMemory;
    private cpuHistory;
    private memoryHistory;
    private metricsConnected;
    private metricsError;
    private cpuUsage;
    private memoryUsage;
    private cpuTrend;
    private memoryTrend;
    private metricsAlerts;
    connectedCallback(): void;
    disconnectedCallback(): void;
    firstUpdated(): void;
    updated(changedProperties: Map<string, any>): void;
    private cleanup;
    private initCharts;
    private updateChartsFromHistory;
    private renderTrendIndicator;
    render(): import("lit-html").TemplateResult<1>;
}
export {};
//# sourceMappingURL=dashboard-tab-v2.d.ts.map