/**
 * Type definitions for Virtualization module
 */

// ============ Core VM Types ============

export interface VirtualMachine {
  id: string;           // VM UUID
  name: string;
  state: VMState;
  memory: number;       // In MB
  vcpus: number;
  disk_size: number;    // In GB
  os_type: string;
  os_variant?: string;
  created_at: string;
  updated_at?: string;
  graphics?: GraphicsConfig;
  disks?: DiskInfo[];
  network_interfaces?: NetworkInterface[];
  metadata?: Record<string, string>;
}

export type VMState = 'running' | 'stopped' | 'paused' | 'suspended' | 'unknown';

export interface GraphicsConfig {
  type: 'vnc' | 'spice' | 'none';
  port?: number;
  password?: string;
  autoport?: boolean;
}

export interface DiskInfo {
  device: string;
  path: string;
  format: 'qcow2' | 'raw' | 'vmdk';
  size: number; // In GB
  used?: number; // In GB
  bus?: 'virtio' | 'ide' | 'scsi' | 'sata';
}

export interface NetworkInterface {
  name: string;
  type: 'bridge' | 'network' | 'user' | 'direct';
  source?: string;
  model?: 'virtio' | 'e1000' | 'rtl8139';
  mac?: string;
  ip?: string;
}

// ============ Storage Types ============

export interface StoragePool {
  name: string;
  uuid?: string;
  type: StoragePoolType;
  state: StoragePoolState;
  autostart?: boolean;
  persistent?: boolean;
  capacity: number;     // Bytes
  allocation: number;   // Bytes
  available: number;    // Bytes
  path?: string;
  volumes?: Volume[];
}

export type StoragePoolState = 'running' | 'inactive' | 'active' | 'building';

export type StoragePoolType = 'dir' | 'fs' | 'netfs' | 'logical' | 'disk' | 'iscsi' | 'nfs' | 'gluster' | 'ceph' | 'rbd';

export interface Volume {
  name: string;
  key: string;
  type: string;
  capacity: number;     // Bytes
  allocation: number;   // Bytes
  path: string;
  format?: string;
}

// ============ Storage Volume Types (Enhanced) ============

export interface StorageVolume {
  name: string;
  type: 'file' | 'dir' | 'block';
  capacity: number;     // Bytes
  allocation: number;   // Bytes 
  path: string;
  format: 'qcow2' | 'raw' | 'iso' | 'vmdk' | 'dir';
  created_at: string;
  pool_name: string;
  // Additional optional fields
  id?: string;          // Generated ID for UI purposes
  used_percent?: number;
  status?: 'available' | 'in-use' | 'locked';
  vm_attached?: string; // VM ID if attached
}

export interface ISOImage {
  id: string;
  name: string;
  path: string;
  size: number;         // Bytes
  os_type?: string;
  os_variant?: string;
  architecture?: string;
  description?: string;
  uploaded_at: string;
  checksum?: string;
  storage_pool?: string;
}

// ============ VM Creation Types ============

export interface VMCreateRequest {
  name: string;
  memory: number;       // MB
  vcpus: number;
  description?: string;
  storage: StorageConfig;
  network?: NetworkConfig;
  graphics?: GraphicsConfig;
  boot?: BootConfig;
  metadata?: Record<string, string>;
}

export interface StorageConfig {
  default_pool: string;
  boot_iso?: string;
  disks: DiskConfig[];
}

export interface DiskConfig {
  action: 'create' | 'attach' | 'clone';
  size?: number;         // GB (for create)
  format?: 'qcow2' | 'raw';
  storage_pool?: string;
  path?: string;         // For attach
  source?: string;       // For clone
  bus?: 'virtio' | 'ide' | 'scsi' | 'sata';
  cache?: 'none' | 'writethrough' | 'writeback';
}

export interface NetworkConfig {
  type: 'bridge' | 'network' | 'user' | 'direct';
  source?: string;       // Bridge/network name
  model?: 'virtio' | 'e1000' | 'rtl8139';
  mac?: string;          // Optional MAC address
}

export interface BootConfig {
  order?: ('hd' | 'cdrom' | 'network')[];
  menu?: boolean;
  timeout?: number;
}

export interface VMCreateResponse {
  id: string;
  name: string;
  message?: string;
}

// ============ Templates Types ============

export interface VMTemplate {
  id: string;
  name: string;
  description?: string;
  os_type: string;
  os_variant?: string;
  memory: number;
  vcpus: number;
  disk_size: number;
  network_type?: string;
  graphics_type?: string;
  created_at: string;
  tags?: string[];
}

// ============ Snapshots & Backups ============

export interface VMSnapshot {
  // Backend uses snapshot name as the primary identifier
  name: string;
  description?: string;
  created_at?: string;

  // List endpoint fields
  type?: SnapshotType;
  memory?: boolean;
  parent?: string;
  disk_formats?: string[];
  warnings?: string[];

  // Legacy/older fields (kept optional for compatibility)
  id?: string;
  vm_id?: string;
  state?: 'disk' | 'memory' | 'full';
  size?: number;
  creation_time?: string;
}

export interface VMBackup {
  id: string;
  vm_id: string;
  name: string;
  type: 'full' | 'incremental';
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  size?: number;
  location?: string;
  error?: string;
}

// ============ Console Types ============

export interface ConsoleInfo {
  type: 'vnc' | 'spice';
  host?: string;
  port?: number;
  token: string;
  wsUrl?: string;
  password?: string;
}

// ============ VM Actions ============

export interface VMAction {
  action: 'start' | 'stop' | 'restart' | 'pause' | 'resume' | 'reset' | 'shutdown' | 'reboot';
  force?: boolean;
  timeout?: number;
}

export interface VMStateChange {
  vm_id: string;
  old_state: VMState;
  new_state: VMState;
  timestamp: string;
}

// ============ Migration Types ============

export interface VMMigration {
  vm_id: string;
  source_host: string;
  target_host: string;
  type: 'live' | 'offline';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  started_at: string;
  completed_at?: string;
  error?: string;
}

// ============ Network Types ============

export interface VirtualNetwork {
  name: string;
  uuid?: string;
  type: 'nat' | 'bridge' | 'isolated';
  state: 'active' | 'inactive';
  autostart?: boolean;
  bridge?: string;
  ip?: string;
  netmask?: string;
  dhcp?: DHCPConfig;
  forward?: ForwardConfig;
}

export interface DHCPConfig {
  enabled: boolean;
  start?: string;
  end?: string;
  hosts?: DHCPHost[];
}

export interface DHCPHost {
  mac: string;
  ip: string;
  name?: string;
}

export interface ForwardConfig {
  mode: 'nat' | 'route' | 'bridge' | 'private' | 'vepa' | 'passthrough';
  dev?: string;
}

// ============ Resource Usage ============

export interface VMMetrics {
  vm_id: string;
  cpu_usage: number;     // Percentage
  memory_used: number;   // MB
  memory_total: number;  // MB
  disk_read: number;     // Bytes/sec
  disk_write: number;    // Bytes/sec
  network_rx: number;    // Bytes/sec
  network_tx: number;    // Bytes/sec
  timestamp: string;
}

export interface HostResources {
  total_memory: number;  // MB
  used_memory: number;   // MB
  total_vcpus: number;
  used_vcpus: number;
  total_storage: number; // GB
  used_storage: number;  // GB
  vm_count: number;
  running_vms: number;
}

// ============ Error Types ============

export interface VirtualizationError {
  code: string;
  message: string;
  details?: any;
  vm_id?: string;
  timestamp: string;
}

// ============ Filter & Sort Types ============

export interface VMFilter {
  state?: VMState[];
  os_type?: string[];
  memory_min?: number;
  memory_max?: number;
  vcpus_min?: number;
  vcpus_max?: number;
  created_after?: string;
  created_before?: string;
  tags?: string[];
}

export interface VMSort {
  field: 'name' | 'state' | 'memory' | 'vcpus' | 'created_at' | 'os_type';
  direction: 'asc' | 'desc';
}

// ============ Upload Types ============

export interface ISOUploadProgress {
  id: string;
  filename: string;
  size: number;
  uploaded: number;
  percentage: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

// ============ API Response Types ============

export interface ListResponse<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface OperationResult {
  success: boolean;
  message?: string;
  error?: VirtualizationError;
}

// ============ Hotplug Types ============

export type HotplugResourceType = 'cpu' | 'memory' | 'disk' | 'network' | 'usb';
export type HotplugOperation = 'add' | 'remove';

export interface HotplugRequest {
  operation: HotplugOperation;
  resource_type: HotplugResourceType;
  config: HotplugCPUConfig | HotplugMemoryConfig | HotplugDiskConfig | HotplugNetworkConfig | HotplugUSBConfig;
}

export interface HotplugCPUConfig {
  count: number;
}

export interface HotplugMemoryConfig {
  size_mb: number;
}

export interface HotplugDiskConfig {
  path?: string;
  pool?: string;
  size_gb?: number;
  format?: 'qcow2' | 'raw';
  bus?: 'virtio' | 'scsi' | 'sata';
  target?: string; // For remove operation
}

export interface HotplugNetworkConfig {
  network?: string;
  bridge?: string;
  model?: 'virtio' | 'e1000' | 'rtl8139';
  mac?: string; // For remove operation
}

export interface HotplugUSBConfig {
  vendor_id?: string;
  product_id?: string;
  bus?: string;
  device?: string;
}

export interface HotplugResponse {
  success: boolean;
  message: string;
  resource_type: HotplugResourceType;
  operation: HotplugOperation;
  details?: Record<string, any>;
}

// ============ Clone Types ============

export interface VMCloneRequest {
  source_vm: string;
  name: string;
  full_clone?: boolean;
  snapshots?: boolean;
  storage_pool?: string;
}

export interface VMCloneResponse {
  status: string;
  data: VirtualMachine;
}

// ============ Migration Types ============

export interface MigrationRequest {
  destination_uri: string;
  live?: boolean;
  persistent?: boolean;
  undefine_source?: boolean;
  suspend?: boolean;
  copy_storage?: 'all' | 'none' | 'incremental';
  bandwidth_limit?: number; // MB/s
  timeout?: number; // seconds
}

export interface MigrationResponse {
  status: string;
  message: string;
  migration_id?: string;
  vm_id: string;
  destination: string;
}

export interface MigrationStatus {
  status: 'idle' | 'preparing' | 'migrating' | 'post-copy' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  data_total?: number;
  data_processed?: number;
  data_remaining?: number;
  memory_total?: number;
  memory_processed?: number;
  memory_remaining?: number;
  disk_total?: number;
  disk_processed?: number;
  disk_remaining?: number;
  downtime?: number;
  setup_time?: number;
  error?: string;
}

// ============ Enhanced Console Types ============

export interface ConsoleConnection {
  type: 'vnc' | 'spice';
  host?: string;
  port?: number;
  token: string;
  ws_path?: string;
  expires_at?: string;
  tls_enabled?: boolean;
  password?: string;
}

export interface ConsolesResponse {
  vm_name: string;
  vm_uuid: string;
  available: ('vnc' | 'spice')[];
  consoles: {
    vnc?: ConsoleConnection;
    spice?: ConsoleConnection;
  };
  preferred?: 'vnc' | 'spice';
}

// ============ Snapshot Request Types ============

export type SnapshotType = 'internal' | 'external' | 'internal-memory';

export interface VMSnapshotRequest {
  name: string;
  description?: string;
  include_memory?: boolean;
  quiesce?: boolean;
  force_external?: boolean;
}

export interface VMSnapshotListResponse {
  status: string;
  data: {
    snapshots: VMSnapshot[];
    count: number;
    vm_id: string;
  };
}

export interface VMSnapshotCreateResponse {
  status: string;
  data: {
    snapshot: VMSnapshot;
    message?: string;
    warnings?: string[];
  };
}

export interface VMSnapshotDetailResponse {
  status: string;
  data: {
    snapshot: VMSnapshot;
  };
}

export interface VMSnapshotRevertResponse {
  status: string;
  data: {
    vm_name: string;
    snapshot_name: string;
    reverted_at: string;
    message: string;
  };
}

export interface SnapshotDiskFormatCapability {
  name: string;
  path?: string;
  format: string;
  supports_internal: boolean;
  size_bytes?: number;
}

export interface SnapshotCapabilities {
  supports_snapshots: boolean;
  supports_internal: boolean;
  supports_external: boolean;
  supports_memory: boolean;
  disk_formats: SnapshotDiskFormatCapability[];
  warnings?: string[];
  recommendations?: string[];
}

export interface SnapshotCapabilitiesResponse {
  status: string;
  data: {
    capabilities: SnapshotCapabilities;
  };
}

// ============ Backup Request Types ============

export type BackupType = 'full' | 'incremental' | 'differential';
export type CompressionType = 'none' | 'gzip' | 'bzip2' | 'xz' | 'zstd';
export type EncryptionType = 'none' | 'aes-256' | 'aes-128';

export interface VMBackupRequest {
  name: string;
  description?: string;
  type?: BackupType;
  compression?: CompressionType;
  encryption?: EncryptionType;
  include_memory?: boolean;
  destination?: string;
  retention_days?: number;
}

export interface VMBackupResponse {
  status: string;
  data: {
    backup: VMBackup;
    estimated_size?: number;
    estimated_time?: number;
  };
}

// ============ Enhanced VM Metrics Types ============

export interface VMMetricsEnhanced {
  uuid: string;
  timestamp: string;
  cpu_time: number;
  cpu_usage: number;
  memory_used: number;
  memory_usage: number;
  disk_read: number;
  disk_write: number;
  network_rx: number;
  network_tx: number;
  // Per-disk metrics
  disks?: {
    device: string;
    read_bytes: number;
    write_bytes: number;
    read_requests: number;
    write_requests: number;
  }[];
  // Per-interface metrics
  interfaces?: {
    name: string;
    rx_bytes: number;
    tx_bytes: number;
    rx_packets: number;
    tx_packets: number;
    rx_errors: number;
    tx_errors: number;
  }[];
}
