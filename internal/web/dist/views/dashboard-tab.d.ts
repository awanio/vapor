import { I18nLitElement } from '../i18n-mixin';
import type { SystemSummary, CPUInfo, MemoryInfo } from '../types/api';
import type { CPUMetricData, MemoryMetricData } from '../types/system';
export declare class DashboardTab extends I18nLitElement {
    systemSummary: SystemSummary | null;
    cpuInfo: CPUInfo | null;
    memoryInfo: MemoryInfo | null;
    currentCpuData: CPUMetricData | null;
    currentMemoryData: MemoryMetricData | null;
    wsConnected: boolean;
    wsError: string | null;
    static styles: import("lit").CSSResult;
    private cpuChart;
    private memoryChart;
    private diskChart;
    private networkChart;
    private wsManager;
    connectedCallback(): void;
    disconnectedCallback(): void;
    firstUpdated(): void;
    private fetchInitialData;
    private initWebSocket;
    private cleanup;
    private updateCpuChart;
    private updateMemoryChart;
    private updateDiskChart;
    private updateNetworkChart;
    private formatBytes;
    private formatUptime;
    private initCharts;
    render(): import("lit-html").TemplateResult<1>;
}
//# sourceMappingURL=dashboard-tab.d.ts.map