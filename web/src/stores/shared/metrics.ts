/**
 * Metrics Store - Centralized system metrics management
 * Provides real-time metrics data to all components
 */

import { atom, computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import { wsManager } from './websocket';
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
  maxPoints: 120, // Keep 2 minutes of data at 1-second intervals
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
  
  const newHistory = [...history, { timestamp, value, label }];
  
  // Keep only last N points
  if (newHistory.length > maxPoints) {
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
    console.log('[MetricsStore] User not authenticated, skipping WebSocket connection');
    return;
  }
  
  if (unsubscribeMetrics) {
    console.log('[MetricsStore] Already connected to metrics WebSocket');
    return;
  }
  
  console.log('[MetricsStore] Connecting to metrics WebSocket');
  
  // Subscribe to metrics WebSocket
  unsubscribeMetrics = wsManager.subscribeToShared('metrics', {
    routeId: 'metrics-store',
    handler: (message) => {
      // Handle authentication
      if (message.type === 'auth' && message.payload?.authenticated) {
        console.log('[MetricsStore] Authenticated, subscribing to metrics');
        $metricsConnected.set(true);
        $metricsError.set(null);
        
        // Send subscribe message
        wsManager.send('shared:metrics', { type: 'subscribe' });
        return;
      }
      
      // Handle metric data
      if (message.type === 'data' && message.payload) {
        const data = message.payload;
        
        // Update CPU metrics
        if (data.cpu) {
          const cpuData: CPUMetricData = {
            usage_percent: data.cpu.usage,
            load1: data.cpu.load_average?.[0] || 0,
            load5: data.cpu.load_average?.[1] || 0,
            load15: data.cpu.load_average?.[2] || 0,
            cores: data.cpu.cores || [],
          };
          updateCpuMetrics(cpuData);
        }
        
        // Update Memory metrics
        if (data.memory) {
          updateMemoryMetrics(data.memory);
        }
        
        // Update Disk metrics
        if (data.disk) {
          updateDiskMetrics(data.disk);
        }
        
        // Update Network metrics
        if (data.network) {
          updateNetworkMetrics(data.network);
        }
      }
      
      // Handle errors
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
  
  // Disconnect any existing connection
  disconnectMetrics();
  
  // Wait a moment for auth to stabilize
  await new Promise(resolve => setTimeout(resolve, 100));
  
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

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMetrics);
  } else {
    initializeMetrics();
  }
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanupMetrics);
}
