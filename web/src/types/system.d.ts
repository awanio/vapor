// Metric Types
export interface CPUMetricData {
  usage_percent: number;
  load1: number;
  load5: number;
  load15: number;
  cores: Array<{
    core: number;
    usage_percent: number;
  }>;
}

export interface MemoryMetricData {
  total: number;
  used: number;
  free: number;
  available: number;
  used_percent: number;
  swap_total: number;
  swap_used: number;
  swap_free: number;
  swap_used_percent: number;
}

export interface DiskMetricData {
  disks: Array<{
    device: string;
    mount_point: string;
    filesystem: string;
    total: number;
    used: number;
    free: number;
    used_percent: number;
    io_stats?: {
      read_bytes_per_sec: number;
      write_bytes_per_sec: number;
      read_ops_per_sec: number;
      write_ops_per_sec: number;
    };
  }>;
}

export interface NetworkMetricData {
  interfaces: Array<{
    name: string;
    rx_bytes_per_sec: number;
    tx_bytes_per_sec: number;
    rx_packets_per_sec: number;
    tx_packets_per_sec: number;
    rx_errors: number;
    tx_errors: number;
    rx_dropped: number;
    tx_dropped: number;
  }>;
}

// Navigation Types
export interface NavItem {
  id: string;
  label: string;
  icon?: string;
  children?: NavItem[];
  route?: string;
}

export interface Tab {
  id: string;
  label: string;
  component: string;
  props?: Record<string, any>;
  closable?: boolean;
}

// UI State Types
export interface AppState {
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  currentUser?: string;
  locale: string;
}

// Chart Data Types
export interface ChartPoint {
  x: number | string;
  y: number;
}

export interface ChartDataset {
  label: string;
  data: ChartPoint[];
  borderColor?: string;
  backgroundColor?: string;
  fill?: boolean;
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'select' | 'checkbox' | 'textarea';
  value?: any;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: any }>;
  validators?: Array<(value: any) => string | null>;
}

export interface FormData {
  [key: string]: any;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  timestamp: Date;
}
