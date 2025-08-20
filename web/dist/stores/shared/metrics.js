import { atom, computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import { wsManager } from './websocket';
import { Api } from '../../api';
const DEFAULT_HISTORY_CONFIG = {
    maxPoints: 120,
    interval: 1000,
};
export const $systemSummary = persistentAtom('vapor.metrics.systemSummary', null, {
    encode: JSON.stringify,
    decode: JSON.parse,
});
export const $cpuInfo = persistentAtom('vapor.metrics.cpuInfo', null, {
    encode: JSON.stringify,
    decode: JSON.parse,
});
export const $memoryInfo = persistentAtom('vapor.metrics.memoryInfo', null, {
    encode: JSON.stringify,
    decode: JSON.parse,
});
export const $currentCpu = atom(null);
export const $currentMemory = atom(null);
export const $currentDisk = atom(null);
export const $currentNetwork = atom(null);
export const $cpuHistory = atom([]);
export const $memoryHistory = atom([]);
export const $diskHistory = atom([]);
export const $networkHistory = atom([]);
export const $metricsConnected = atom(false);
export const $lastMetricUpdate = atom(null);
export const $metricsError = atom(null);
export const $cpuUsage = computed($currentCpu, (cpu) => cpu?.usage_percent ?? 0);
export const $memoryUsage = computed($currentMemory, (memory) => memory?.used_percent ?? 0);
export const $availableMemory = computed($currentMemory, (memory) => memory?.available ?? 0);
export const $loadAverage = computed($currentCpu, (cpu) => ({
    load1: cpu?.load1 ?? 0,
    load5: cpu?.load5 ?? 0,
    load15: cpu?.load15 ?? 0,
}));
export const $cpuTrend = computed($cpuHistory, (history) => {
    if (history.length < 2)
        return 'stable';
    const recent = history.slice(-10);
    const avg = recent.reduce((sum, p) => sum + p.value, 0) / recent.length;
    const latest = recent[recent.length - 1]?.value ?? 0;
    if (latest > avg + 10)
        return 'increasing';
    if (latest < avg - 10)
        return 'decreasing';
    return 'stable';
});
export const $memoryTrend = computed($memoryHistory, (history) => {
    if (history.length < 2)
        return 'stable';
    const recent = history.slice(-10);
    const avg = recent.reduce((sum, p) => sum + p.value, 0) / recent.length;
    const latest = recent[recent.length - 1]?.value ?? 0;
    if (latest > avg + 10)
        return 'increasing';
    if (latest < avg - 10)
        return 'decreasing';
    return 'stable';
});
export const $metricsAlerts = computed([$cpuUsage, $memoryUsage], (cpuUsage, memoryUsage) => {
    const alerts = [];
    if (cpuUsage > 90) {
        alerts.push({ type: 'error', message: `CPU usage critical: ${cpuUsage.toFixed(1)}%` });
    }
    else if (cpuUsage > 75) {
        alerts.push({ type: 'warning', message: `CPU usage high: ${cpuUsage.toFixed(1)}%` });
    }
    if (memoryUsage > 90) {
        alerts.push({ type: 'error', message: `Memory usage critical: ${memoryUsage.toFixed(1)}%` });
    }
    else if (memoryUsage > 75) {
        alerts.push({ type: 'warning', message: `Memory usage high: ${memoryUsage.toFixed(1)}%` });
    }
    return alerts;
});
export const $metricsState = computed([
    $systemSummary,
    $cpuInfo,
    $memoryInfo,
    $currentCpu,
    $currentMemory,
    $currentDisk,
    $currentNetwork,
    $cpuHistory,
    $memoryHistory,
    $diskHistory,
    $networkHistory,
    $metricsConnected,
    $lastMetricUpdate,
    $metricsError,
], (systemSummary, cpuInfo, memoryInfo, currentCpu, currentMemory, currentDisk, currentNetwork, cpuHistory, memoryHistory, diskHistory, networkHistory, isConnected, lastUpdate, error) => ({
    systemSummary,
    cpuInfo,
    memoryInfo,
    currentCpu,
    currentMemory,
    currentDisk,
    currentNetwork,
    cpuHistory,
    memoryHistory,
    diskHistory,
    networkHistory,
    isConnected,
    lastUpdate,
    error,
}));
function addToHistory(historyAtom, value, maxPoints = DEFAULT_HISTORY_CONFIG.maxPoints) {
    const history = historyAtom.get();
    const timestamp = Date.now();
    const label = new Date(timestamp).toLocaleTimeString();
    const newHistory = [...history, { timestamp, value, label }];
    if (newHistory.length > maxPoints) {
        newHistory.splice(0, newHistory.length - maxPoints);
    }
    historyAtom.set(newHistory);
}
export function updateCpuMetrics(data) {
    $currentCpu.set(data);
    addToHistory($cpuHistory, data.usage_percent);
    $lastMetricUpdate.set(Date.now());
}
export function updateMemoryMetrics(data) {
    $currentMemory.set(data);
    addToHistory($memoryHistory, data.used_percent);
    $lastMetricUpdate.set(Date.now());
}
export function updateDiskMetrics(data) {
    $currentDisk.set(data);
    if (data && data.disks && data.disks.length > 0) {
        const totalUsage = data.disks.reduce((sum, disk) => sum + disk.used_percent, 0) / data.disks.length;
        addToHistory($diskHistory, totalUsage);
    }
    $lastMetricUpdate.set(Date.now());
}
export function updateNetworkMetrics(data) {
    $currentNetwork.set(data);
    if (data && data.interfaces && data.interfaces.length > 0) {
        const totalThroughput = data.interfaces.reduce((sum, iface) => sum + iface.rx_bytes_per_sec + iface.tx_bytes_per_sec, 0);
        addToHistory($networkHistory, totalThroughput / 1024 / 1024);
    }
    $lastMetricUpdate.set(Date.now());
}
export async function fetchSystemInfo() {
    const { auth } = await import('../../auth');
    if (!auth.isAuthenticated()) {
        console.log('[MetricsStore] User not authenticated, skipping system info fetch');
        return;
    }
    try {
        const [summary, cpu, memory] = await Promise.all([
            Api.get('/system/summary'),
            Api.get('/system/cpu'),
            Api.get('/system/memory'),
        ]);
        $systemSummary.set(summary);
        $cpuInfo.set(cpu);
        $memoryInfo.set(memory);
        $metricsError.set(null);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch system info';
        $metricsError.set(errorMessage);
        console.error('Failed to fetch system info:', error);
    }
}
export function clearMetricHistory() {
    $cpuHistory.set([]);
    $memoryHistory.set([]);
    $diskHistory.set([]);
    $networkHistory.set([]);
}
export function getMetricHistory(metric) {
    switch (metric) {
        case 'cpu':
            return $cpuHistory.get();
        case 'memory':
            return $memoryHistory.get();
        case 'disk':
            return $diskHistory.get();
        case 'network':
            return $networkHistory.get();
        default:
            return [];
    }
}
export function calculateAverage(metric, periodMs = 60000) {
    const history = getMetricHistory(metric);
    const now = Date.now();
    const cutoff = now - periodMs;
    const recentPoints = history.filter(p => p.timestamp >= cutoff);
    if (recentPoints.length === 0)
        return 0;
    return recentPoints.reduce((sum, p) => sum + p.value, 0) / recentPoints.length;
}
let unsubscribeMetrics = null;
export async function connectMetrics() {
    const { auth } = await import('../../auth');
    if (!auth.isAuthenticated()) {
        console.log('[MetricsStore] User not authenticated, skipping WebSocket connection');
        return;
    }
    if (unsubscribeMetrics) {
        console.log('[MetricsStore] Already connected to metrics WebSocket');
        return;
    }
    console.log('[MetricsStore] Connecting to metrics WebSocket');
    unsubscribeMetrics = wsManager.subscribeToShared('metrics', {
        routeId: 'metrics-store',
        handler: (message) => {
            if (message.type === 'auth' && message.payload?.authenticated) {
                console.log('[MetricsStore] Authenticated, subscribing to metrics');
                $metricsConnected.set(true);
                $metricsError.set(null);
                wsManager.send('shared:metrics', { type: 'subscribe' });
                return;
            }
            if (message.type === 'data' && message.payload) {
                const data = message.payload;
                if (data.cpu) {
                    const cpuData = {
                        usage_percent: data.cpu.usage,
                        load1: data.cpu.load_average?.[0] || 0,
                        load5: data.cpu.load_average?.[1] || 0,
                        load15: data.cpu.load_average?.[2] || 0,
                        cores: data.cpu.cores || [],
                    };
                    updateCpuMetrics(cpuData);
                }
                if (data.memory) {
                    updateMemoryMetrics(data.memory);
                }
                if (data.disk) {
                    updateDiskMetrics(data.disk);
                }
                if (data.network) {
                    updateNetworkMetrics(data.network);
                }
            }
            if (message.type === 'error') {
                console.error('[MetricsStore] WebSocket error:', message);
                $metricsError.set(message.payload?.message || 'WebSocket error');
                $metricsConnected.set(false);
            }
        },
        onError: (error) => {
            console.error('[MetricsStore] WebSocket error:', error);
            $metricsError.set(error.message);
            $metricsConnected.set(false);
        },
    });
    if (!$systemSummary.get()) {
        fetchSystemInfo();
    }
}
export function disconnectMetrics() {
    if (unsubscribeMetrics) {
        console.log('[MetricsStore] Disconnecting from metrics WebSocket');
        unsubscribeMetrics();
        unsubscribeMetrics = null;
        $metricsConnected.set(false);
    }
}
export async function initializeMetrics() {
    const { auth } = await import('../../auth');
    if (!auth.isAuthenticated()) {
        console.log('[MetricsStore] User not authenticated, skipping initialization');
        return;
    }
    console.log('[MetricsStore] Initializing metrics store');
    await fetchSystemInfo();
    await connectMetrics();
}
export async function reinitializeMetricsAfterLogin() {
    console.log('[MetricsStore] Re-initializing after login');
    disconnectMetrics();
    await new Promise(resolve => setTimeout(resolve, 100));
    await initializeMetrics();
}
export function cleanupMetrics() {
    disconnectMetrics();
}
export function formatBytes(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
export function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (days > 0)
        parts.push(`${days} days`);
    if (hours > 0)
        parts.push(`${hours} hours`);
    if (minutes > 0)
        parts.push(`${minutes} minutes`);
    return parts.join(', ') || '0 minutes';
}
export function exportMetrics() {
    return $metricsState.get();
}
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeMetrics);
    }
    else {
        initializeMetrics();
    }
    window.addEventListener('beforeunload', cleanupMetrics);
}
//# sourceMappingURL=metrics.js.map