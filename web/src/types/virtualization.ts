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
  type: 'bridge' | 'nat' | 'user' | 'direct';
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
  state: 'active' | 'inactive';
  autostart?: boolean;
  persistent?: boolean;
  capacity: number;     // Bytes
  allocation: number;   // Bytes
  available: number;    // Bytes
  path?: string;
  volumes?: Volume[];
}

export type StoragePoolType = 'dir' | 'fs' | 'netfs' | 'logical' | 'disk' | 'iscsi' | 'gluster' | 'rbd';

export interface Volume {
  name: string;
  key: string;
  type: string;
  capacity: number;     // Bytes
  allocation: number;   // Bytes
  path: string;
  format?: string;
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
  type: 'bridge' | 'nat' | 'user' | 'direct';
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
  id: string;
  vm_id: string;
  name: string;
  description?: string;
  state: 'disk' | 'memory' | 'full';
  created_at: string;
  parent?: string;       // Parent snapshot ID
  size?: number;         // Size in bytes
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
