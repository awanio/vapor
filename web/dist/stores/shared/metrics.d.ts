import type { SystemSummary, CPUInfo, MemoryInfo } from '../../types/api';
import type { CPUMetricData, MemoryMetricData, DiskMetricData, NetworkMetricData } from '../../types/system';
export interface MetricDataPoint {
    timestamp: number;
    value: number;
    label?: string;
}
export interface MetricHistoryConfig {
    maxPoints: number;
    interval: number;
}
export interface MetricsState {
    systemSummary: SystemSummary | null;
    cpuInfo: CPUInfo | null;
    memoryInfo: MemoryInfo | null;
    currentCpu: CPUMetricData | null;
    currentMemory: MemoryMetricData | null;
    currentDisk: DiskMetricData | null;
    currentNetwork: NetworkMetricData | null;
    cpuHistory: MetricDataPoint[];
    memoryHistory: MetricDataPoint[];
    diskHistory: MetricDataPoint[];
    networkHistory: MetricDataPoint[];
    isConnected: boolean;
    lastUpdate: number | null;
    error: string | null;
}
export declare const $systemSummary: import("nanostores").WritableAtom<SystemSummary | null>;
export declare const $cpuInfo: import("nanostores").WritableAtom<CPUInfo | null>;
export declare const $memoryInfo: import("nanostores").WritableAtom<MemoryInfo | null>;
export declare const $currentCpu: import("nanostores").PreinitializedWritableAtom<CPUMetricData | null> & object;
export declare const $currentMemory: import("nanostores").PreinitializedWritableAtom<MemoryMetricData | null> & object;
export declare const $currentDisk: import("nanostores").PreinitializedWritableAtom<DiskMetricData | null> & object;
export declare const $currentNetwork: import("nanostores").PreinitializedWritableAtom<NetworkMetricData | null> & object;
export declare const $cpuHistory: import("nanostores").PreinitializedWritableAtom<MetricDataPoint[]> & object;
export declare const $memoryHistory: import("nanostores").PreinitializedWritableAtom<MetricDataPoint[]> & object;
export declare const $diskHistory: import("nanostores").PreinitializedWritableAtom<MetricDataPoint[]> & object;
export declare const $networkHistory: import("nanostores").PreinitializedWritableAtom<MetricDataPoint[]> & object;
export declare const $metricsConnected: import("nanostores").PreinitializedWritableAtom<boolean> & object;
export declare const $lastMetricUpdate: import("nanostores").PreinitializedWritableAtom<number | null> & object;
export declare const $metricsError: import("nanostores").PreinitializedWritableAtom<string | null> & object;
export declare const $cpuUsage: import("nanostores").ReadableAtom<number>;
export declare const $memoryUsage: import("nanostores").ReadableAtom<number>;
export declare const $availableMemory: import("nanostores").ReadableAtom<number>;
export declare const $loadAverage: import("nanostores").ReadableAtom<{
    load1: number;
    load5: number;
    load15: number;
}>;
export declare const $cpuTrend: import("nanostores").ReadableAtom<"stable" | "increasing" | "decreasing">;
export declare const $memoryTrend: import("nanostores").ReadableAtom<"stable" | "increasing" | "decreasing">;
export declare const $metricsAlerts: import("nanostores").ReadableAtom<{
    type: "warning" | "error";
    message: string;
}[]>;
export declare const $metricsState: import("nanostores").ReadableAtom<MetricsState>;
export declare function updateCpuMetrics(data: CPUMetricData): void;
export declare function updateMemoryMetrics(data: MemoryMetricData): void;
export declare function updateDiskMetrics(data: DiskMetricData): void;
export declare function updateNetworkMetrics(data: NetworkMetricData): void;
export declare function fetchSystemInfo(): Promise<void>;
export declare function clearMetricHistory(): void;
export declare function getMetricHistory(metric: 'cpu' | 'memory' | 'disk' | 'network'): MetricDataPoint[];
export declare function calculateAverage(metric: 'cpu' | 'memory' | 'disk' | 'network', periodMs?: number): number;
export declare function connectMetrics(): Promise<void>;
export declare function disconnectMetrics(): void;
export declare function initializeMetrics(): Promise<void>;
export declare function reinitializeMetricsAfterLogin(): Promise<void>;
export declare function cleanupMetrics(): void;
export declare function formatBytes(bytes: number): string;
export declare function formatUptime(seconds: number): string;
export declare function exportMetrics(): MetricsState;
//# sourceMappingURL=metrics.d.ts.map