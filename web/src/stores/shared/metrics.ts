/**
 * Metrics Store - Centralized system metrics management
 * Provides real-time metrics data to all components
 */

import { atom, computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import { wsManager } from './websocket';
import { subscribeToEventsChannel } from './events-stream';
import { perfIncrement, registerPerfGauge } from '../perf-debug';
import type { 
  SystemSummary, 
  CPUInfo, 
  MemoryInfo 
} from '../../types/api';
import type { 
  CPUMetricData, 
  MemoryMetricData, 
  DiskMetricData, 
  NetworkMetricData 
} from '../../types/system';
import { Api } from '../../api';

/**
 * Historical data point for charts
 */
export interface MetricDataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

/**
 * Metric history configuration
 */
export interface MetricHistoryConfig {
  maxPoints: number;
  interval: number; // milliseconds
}

/**
 * System metrics state
 */
export interface MetricsState {
  // Static system info (fetched once)
  systemSummary: SystemSummary | null;
  cpuInfo: CPUInfo | null;
  memoryInfo: MemoryInfo | null;
  
  // Real-time metrics
  currentCpu: CPUMetricData | null;
  currentMemory: MemoryMetricData | null;
  currentDisk: DiskMetricData | null;
  currentNetwork: NetworkMetricData | null;
  
  // Historical data for charts
  cpuHistory: MetricDataPoint[];
  memoryHistory: MetricDataPoint[];
  diskHistory: MetricDataPoint[];
  networkHistory: MetricDataPoint[];
  
  // Connection status
  isConnected: boolean;
  lastUpdate: number | null;
  error: string | null;
}

/**
 * Default history configuration
 */
const DEFAULT_HISTORY_CONFIG: MetricHistoryConfig = {
  maxPoints: 60, // Keep 1 minute of data at 1-second intervals (reduced for memory optimization)
  interval: 1000,
};

// ============================================================================
// Atoms (State)
// ============================================================================

/**
 * System summary information (persisted)
 */
export const $systemSummary = persistentAtom<SystemSummary | null>(
  'vapor.metrics.systemSummary',
  null,
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);

/**
 * CPU information (persisted)
 */
export const $cpuInfo = persistentAtom<CPUInfo | null>(
  'vapor.metrics.cpuInfo',
  null,
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);

/**
 * Memory information (persisted)
 */
export const $memoryInfo = persistentAtom<MemoryInfo | null>(
  'vapor.metrics.memoryInfo',
  null,
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);

/**
 * Current CPU metrics
 */
export const $currentCpu = atom<CPUMetricData | null>(null);

/**
 * Current memory metrics
 */
export const $currentMemory = atom<MemoryMetricData | null>(null);

/**
 * Current disk metrics
 */
export const $currentDisk = atom<DiskMetricData | null>(null);

/**
 * Current network metrics
 */
export const $currentNetwork = atom<NetworkMetricData | null>(null);

/**
 * CPU history for charts
 */
export const $cpuHistory = atom<MetricDataPoint[]>([]);

/**
 * Memory history for charts
 */
export const $memoryHistory = atom<MetricDataPoint[]>([]);

/**
 * Disk history for charts
 */
export const $diskHistory = atom<MetricDataPoint[]>([]);

/**
 * Network history for charts
 */
export const $networkHistory = atom<MetricDataPoint[]>([]);

/**
 * WebSocket connection status
 */
export const $metricsConnected = atom<boolean>(false);

/**
 * Last update timestamp
 */
export const $lastMetricUpdate = atom<number | null>(null);

/**
 * Error state
 */
export const $metricsError = atom<string | null>(null);

// ============================================================================
// Computed Values
// ============================================================================

/**
 * CPU usage percentage (current)
 */
export const $cpuUsage = computed($currentCpu, (cpu) => 
  cpu?.usage_percent ?? 0
);

/**
 * Memory usage percentage (current)
 */
export const $memoryUsage = computed($currentMemory, (memory) => 
  memory?.used_percent ?? 0
);

/**
 * Available memory in bytes
 */
export const $availableMemory = computed($currentMemory, (memory) => 
  memory?.available ?? 0
);

/**
 * System load average
 */
export const $loadAverage = computed($currentCpu, (cpu) => ({
  load1: cpu?.load1 ?? 0,
  load5: cpu?.load5 ?? 0,
  load15: cpu?.load15 ?? 0,
}));

/**
 * CPU usage trend (last 10 points)
 */
export const $cpuTrend = computed($cpuHistory, (history) => {
  if (history.length < 2) return 'stable';
  
  const recent = history.slice(-10);
  const avg = recent.reduce((sum, p) => sum + p.value, 0) / recent.length;
  const latest = recent[recent.length - 1]?.value ?? 0;
  
  if (latest > avg + 10) return 'increasing';
  if (latest < avg - 10) return 'decreasing';
  return 'stable';
});

/**
 * Memory usage trend (last 10 points)
 */
export const $memoryTrend = computed($memoryHistory, (history) => {
  if (history.length < 2) return 'stable';
  
  const recent = history.slice(-10);
  const avg = recent.reduce((sum, p) => sum + p.value, 0) / recent.length;
  const latest = recent[recent.length - 1]?.value ?? 0;
  
  if (latest > avg + 10) return 'increasing';
  if (latest < avg - 10) return 'decreasing';
  return 'stable';
});

/**
 * Critical alerts
 */
export const $metricsAlerts = computed(
  [$cpuUsage, $memoryUsage],
  (cpuUsage, memoryUsage) => {
    const alerts: Array<{ type: 'warning' | 'error'; message: string }> = [];
    
    if (cpuUsage > 90) {
      alerts.push({ type: 'error', message: `CPU usage critical: ${cpuUsage.toFixed(1)}%` });
    } else if (cpuUsage > 75) {
      alerts.push({ type: 'warning', message: `CPU usage high: ${cpuUsage.toFixed(1)}%` });
    }
    
    if (memoryUsage > 90) {
      alerts.push({ type: 'error', message: `Memory usage critical: ${memoryUsage.toFixed(1)}%` });
    } else if (memoryUsage > 75) {
      alerts.push({ type: 'warning', message: `Memory usage high: ${memoryUsage.toFixed(1)}%` });
    }
    
    return alerts;
  }
);

/**
 * Complete metrics state
 */
export const $metricsState = computed(
  [
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
  ],
  (
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
    error
  ): MetricsState => ({
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
  })
);

// ============================================================================
// Actions
// ============================================================================

/**
 * Add data point to history
 */
function addToHistory(
  historyAtom: typeof $cpuHistory,
  value: number,
  maxPoints: number = DEFAULT_HISTORY_CONFIG.maxPoints
): void {
  const history = historyAtom.get();
  const timestamp = Date.now();
  const label = new Date(timestamp).toLocaleTimeString();
  
  // Optimize: mutate existing array instead of creating new one
  const newHistory = history.slice(); // Shallow copy
  newHistory.push({ timestamp, value, label });
  
  // Keep only last N points - remove from beginning if exceeded
  if (newHistory.length > maxPoints) {
    // Remove excess items efficiently
    newHistory.splice(0, newHistory.length - maxPoints);
  }
  
  historyAtom.set(newHistory);
}

/**
 * Update CPU metrics
 */
export function updateCpuMetrics(data: CPUMetricData): void {
  $currentCpu.set(data);
  addToHistory($cpuHistory, data.usage_percent);
  $lastMetricUpdate.set(Date.now());
}

/**
 * Update memory metrics
 */
export function updateMemoryMetrics(data: MemoryMetricData): void {
  $currentMemory.set(data);
  addToHistory($memoryHistory, data.used_percent);
  $lastMetricUpdate.set(Date.now());
}

/**
 * Update disk metrics
 */
export function updateDiskMetrics(data: DiskMetricData): void {
  $currentDisk.set(data);
  // Calculate total disk usage percentage
  if (data && data.disks && data.disks.length > 0) {
    const totalUsage = data.disks.reduce((sum, disk) => sum + disk.used_percent, 0) / data.disks.length;
    addToHistory($diskHistory, totalUsage);
  }
  $lastMetricUpdate.set(Date.now());
}

/**
 * Update network metrics
 */
export function updateNetworkMetrics(data: NetworkMetricData): void {
  $currentNetwork.set(data);
  // Calculate total network throughput
  if (data && data.interfaces && data.interfaces.length > 0) {
    const totalThroughput = data.interfaces.reduce(
      (sum, iface) => sum + iface.rx_bytes_per_sec + iface.tx_bytes_per_sec,
      0
    );
    addToHistory($networkHistory, totalThroughput / 1024 / 1024); // Convert to MB/s
  }
  $lastMetricUpdate.set(Date.now());
}

/**
 * Fetch initial system information
 */
export async function fetchSystemInfo(): Promise<void> {
  // Import auth here to avoid circular dependency
  const { auth } = await import('../../auth');
  
  // Check if user is authenticated before making API calls
  if (!auth.isAuthenticated()) {
    console.log('[MetricsStore] User not authenticated, skipping system info fetch');
    return;
  }
  
  try {
    const [summary, cpu, memory] = await Promise.all([
      Api.get<SystemSummary>('/system/summary'),
      Api.get<CPUInfo>('/system/cpu'),
      Api.get<MemoryInfo>('/system/memory'),
    ]);
    
    $systemSummary.set(summary);
    $cpuInfo.set(cpu);
    $memoryInfo.set(memory);
    $metricsError.set(null);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch system info';
    $metricsError.set(errorMessage);
    console.error('Failed to fetch system info:', error);
  }
}

/**
 * Clear metric history
 */
export function clearMetricHistory(): void {
  $cpuHistory.set([]);
  $memoryHistory.set([]);
  $diskHistory.set([]);
  $networkHistory.set([]);
}

/**
 * Get history for a specific metric
 */
export function getMetricHistory(
  metric: 'cpu' | 'memory' | 'disk' | 'network'
): MetricDataPoint[] {
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

/**
 * Calculate average for a metric over a time period
 */
export function calculateAverage(
  metric: 'cpu' | 'memory' | 'disk' | 'network',
  periodMs: number = 60000 // Default 1 minute
): number {
  const history = getMetricHistory(metric);
  const now = Date.now();
  const cutoff = now - periodMs;
  
  const recentPoints = history.filter(p => p.timestamp >= cutoff);
  if (recentPoints.length === 0) return 0;
  
  return recentPoints.reduce((sum, p) => sum + p.value, 0) / recentPoints.length;
}

// ============================================================================
// WebSocket Integration
// ============================================================================

let unsubscribeMetrics: (() => void) | null = null;

/**
 * Connect to metrics WebSocket
 */
export async function connectMetrics(): Promise<void> {
  // Import auth here to avoid circular dependency
  const { auth } = await import('../../auth');

  // Check if user is authenticated before connecting
  if (!auth.isAuthenticated()) {
    return;
  }

  if (unsubscribeMetrics) {
    // Force reconnect to ensure fresh auth token (shared /ws/events)
    wsManager.forceReconnectShared('events');
    return;
  }

  // Track previous network counters to derive per-second rates when the backend provides cumulative totals
  const lastNetworkSample = new Map<
    string,
    { ts: number; rxBytes: number; txBytes: number; rxPackets: number; txPackets: number }
  >();

  // Subscribe to metrics via the shared /ws/events connection
  unsubscribeMetrics = subscribeToEventsChannel({
    channel: 'metrics',
    routeId: 'metrics-store',
    onConnectionChange: (connected) => {
      $metricsConnected.set(connected);
      if (!connected) {
        // Don't spam errors here; consumers can degrade gracefully.
        $metricsError.set(null);
      }
    },
    onEvent: (payload: any) => {
      // Expected payload (from /ws/events): { kind: 'metrics', data: { cpu, memory, disk, network, timestamp } }
      // Be tolerant of variations: payload may be the data directly.
      const data = payload?.data ?? payload;
      if (!data) return;

      try { perfIncrement('metrics_data'); } catch {}

      // CPU mapping
      if (data.cpu) {
        const la = Array.isArray(data.cpu.load_average) ? data.cpu.load_average : [];
        const perCore = Array.isArray(data.cpu.per_core) ? data.cpu.per_core : [];
        const coresArr = perCore.map((usage: number, idx: number) => ({ core: idx, usage_percent: usage }));

        const cpuData: CPUMetricData = {
          usage_percent: Number(data.cpu.usage ?? 0),
          load1: Number(la[0] ?? 0),
          load5: Number(la[1] ?? 0),
          load15: Number(la[2] ?? 0),
          cores: coresArr,
        };
        updateCpuMetrics(cpuData);
      }

      // Memory mapping
      if (data.memory) {
        const swapTotal = Number(data.memory.swap_total ?? 0);
        const swapUsed = Number(data.memory.swap_used ?? 0);
        const swapUsedPercent = swapTotal > 0 ? (swapUsed / swapTotal) * 100 : 0;

        const memData: MemoryMetricData = {
          total: Number(data.memory.total ?? 0),
          used: Number(data.memory.used ?? 0),
          free: Number(data.memory.free ?? 0),
          available: Number(data.memory.available ?? 0),
          used_percent: Number(data.memory.used_percent ?? 0),
          swap_total: swapTotal,
          swap_used: swapUsed,
          swap_free: Number(data.memory.swap_free ?? 0),
          swap_used_percent: swapUsedPercent,
        };
        updateMemoryMetrics(memData);
      }

      // Disk mapping
      if (Array.isArray(data.disk)) {
        const disks = data.disk.map((d: any) => ({
          device: String(d.device ?? ''),
          mount_point: String(d.mountpoint ?? d.mount_point ?? ''),
          filesystem: String(d.fstype ?? d.filesystem ?? ''),
          total: Number(d.total ?? 0),
          used: Number(d.used ?? 0),
          free: Number(d.free ?? 0),
          used_percent: Number(d.used_percent ?? 0),
        }));

        const diskData: DiskMetricData = { disks };
        updateDiskMetrics(diskData);
      }

      // Network mapping
      if (Array.isArray(data.network)) {
        const now = Date.now();

        const num = (v: any) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : 0;
        };

        const interfaces = data.network.map((n: any) => {
          const name = String(n.interface ?? n.name ?? '');

          // Prefer explicit per-second rates if present
          const rxBytesPerSecProvided = num(
            n.rx_bytes_per_sec ?? n.rxBytesPerSec ?? n.bytes_recv_per_sec ?? n.bytesRecvPerSec,
          );
          const txBytesPerSecProvided = num(
            n.tx_bytes_per_sec ?? n.txBytesPerSec ?? n.bytes_sent_per_sec ?? n.bytesSentPerSec,
          );
          const rxPacketsPerSecProvided = num(
            n.rx_packets_per_sec ?? n.rxPacketsPerSec ?? n.packets_recv_per_sec ?? n.packetsRecvPerSec,
          );
          const txPacketsPerSecProvided = num(
            n.tx_packets_per_sec ?? n.txPacketsPerSec ?? n.packets_sent_per_sec ?? n.packetsSentPerSec,
          );

          // Fallback: derive rates from cumulative counters
          const rxBytesTotal = num(n.bytes_recv ?? n.rx_bytes ?? n.rxBytes ?? n.rxbytes);
          const txBytesTotal = num(n.bytes_sent ?? n.tx_bytes ?? n.txBytes ?? n.txbytes);
          const rxPacketsTotal = num(n.packets_recv ?? n.rx_packets ?? n.rxPackets ?? n.rxpackets);
          const txPacketsTotal = num(n.packets_sent ?? n.tx_packets ?? n.txPackets ?? n.txpackets);

          let rx_bytes_per_sec = rxBytesPerSecProvided;
          let tx_bytes_per_sec = txBytesPerSecProvided;
          let rx_packets_per_sec = rxPacketsPerSecProvided;
          let tx_packets_per_sec = txPacketsPerSecProvided;

          if (
            name &&
            (rx_bytes_per_sec === 0 || tx_bytes_per_sec === 0 || rx_packets_per_sec === 0 || tx_packets_per_sec === 0)
          ) {
            const prev = lastNetworkSample.get(name);
            if (prev) {
              const dt = Math.max(0.001, (now - prev.ts) / 1000);
              const dRxB = rxBytesTotal >= prev.rxBytes ? rxBytesTotal - prev.rxBytes : 0;
              const dTxB = txBytesTotal >= prev.txBytes ? txBytesTotal - prev.txBytes : 0;
              const dRxP = rxPacketsTotal >= prev.rxPackets ? rxPacketsTotal - prev.rxPackets : 0;
              const dTxP = txPacketsTotal >= prev.txPackets ? txPacketsTotal - prev.txPackets : 0;

              if (rx_bytes_per_sec === 0) rx_bytes_per_sec = dRxB / dt;
              if (tx_bytes_per_sec === 0) tx_bytes_per_sec = dTxB / dt;
              if (rx_packets_per_sec === 0) rx_packets_per_sec = dRxP / dt;
              if (tx_packets_per_sec === 0) tx_packets_per_sec = dTxP / dt;
            }

            // Update sample
            lastNetworkSample.set(name, {
              ts: now,
              rxBytes: rxBytesTotal,
              txBytes: txBytesTotal,
              rxPackets: rxPacketsTotal,
              txPackets: txPacketsTotal,
            });
          }

          return {
            name,
            rx_bytes_per_sec,
            tx_bytes_per_sec,
            rx_packets_per_sec,
            tx_packets_per_sec,
            rx_errors: num(n.errin ?? n.rx_errors ?? n.rxErrors),
            tx_errors: num(n.errout ?? n.tx_errors ?? n.txErrors),
            rx_dropped: num(n.dropin ?? n.rx_dropped ?? n.rxDropped),
            tx_dropped: num(n.dropout ?? n.tx_dropped ?? n.txDropped),
          };
        });

        const netData: NetworkMetricData = { interfaces };
        updateNetworkMetrics(netData);
      }

      $metricsError.set(null);
    },
  });

  // Fetch initial system info if not cached
  if (!$systemSummary.get()) {
    fetchSystemInfo();
  }
}

/**
 * Disconnect from metrics WebSocket
 */
export function disconnectMetrics(): void {
  if (unsubscribeMetrics) {
    console.log('[MetricsStore] Disconnecting from metrics WebSocket');
    unsubscribeMetrics();
    unsubscribeMetrics = null;
    $metricsConnected.set(false);
  }
}

/**
 * Initialize metrics store
 */
export async function initializeMetrics(): Promise<void> {
  // Import auth here to avoid circular dependency
  const { auth } = await import('../../auth');
  
  // Only initialize if authenticated
  if (!auth.isAuthenticated()) {
    console.log('[MetricsStore] User not authenticated, skipping initialization');
    return;
  }
  
  console.log('[MetricsStore] Initializing metrics store');
  
  // Fetch system info on init
  await fetchSystemInfo();
  
  // Connect to WebSocket
  await connectMetrics();
}

/**
 * Re-initialize metrics after login
 */
export async function reinitializeMetricsAfterLogin(): Promise<void> {
  console.log('[MetricsStore] Re-initializing after login');
  
  // Clear any existing error state
  $metricsError.set(null);
  $metricsConnected.set(false);
  
  // Disconnect any existing connection
  disconnectMetrics();
  
  // Clear existing metrics data to ensure fresh state
  $currentCpu.set(null);
  $currentMemory.set(null);
  $currentDisk.set(null);
  $currentNetwork.set(null);
  
  // Wait a moment for auth to stabilize
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Initialize with fresh auth
  await initializeMetrics();
}

/**
 * Cleanup metrics store
 */
export function cleanupMetrics(): void {
  disconnectMetrics();
  // Note: We don't clear history here to preserve data across navigation
}

// ============================================================================
// Formatters (Utilities)
// ============================================================================

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format uptime to human readable string
 */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days} days`);
  if (hours > 0) parts.push(`${hours} hours`);
  if (minutes > 0) parts.push(`${minutes} minutes`);
  
  return parts.join(', ') || '0 minutes';
}

/**
 * Export all metrics for debugging
 */
export function exportMetrics(): MetricsState {
  return $metricsState.get();
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupMetrics);
}


// Perf debug gauges for metrics store (optional)
registerPerfGauge(() => {
  const gauges: Record<string, number> = {};
  try {
    const state = $metricsState.get();
    gauges['metrics_cpuHistory'] = state.cpuHistory.length;
    gauges['metrics_memoryHistory'] = state.memoryHistory.length;
    gauges['metrics_diskHistory'] = state.diskHistory.length;
    gauges['metrics_networkHistory'] = state.networkHistory.length;
  } catch {}
  return gauges;
});
