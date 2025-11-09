// API Response Types
export interface APIResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  error?: APIError;
}

// Kubernetes Types
export interface CRD {
  name: string;
  group: string;
  version: string;
  kind: string;
  scope: string;
  names: string[];
  age: string;
  labels: Record<string, string>;
  creationTimestamp: string;
  uid: string;
}

export interface CRDDetail {
  name: string;
  group: string;
  version: string;
  kind: string;
  scope: string;
  names: any; // Can be null or object with plural, singular, etc.
  age: string;
  labels: Record<string, string> | null;
  creationTimestamp: string;
  uid?: string;
  resourceVersion?: string;
  // Additional fields that might be present in detailed response
  spec?: {
    group: string;
    scope: string;
    names: {
      kind: string;
      listKind: string;
      plural: string;
      singular: string;
    };
    versions: {
      name: string;
      served: boolean;
      storage: boolean;
    }[];
  };
  status?: {
    acceptedNames: {
      kind: string;
      listKind: string;
      plural: string;
      singular: string;
    };
    storedVersions: string[];
    conditions: {
      type: string;
      status: string;
      lastTransitionTime: string;
      reason: string;
      message: string;
    }[];
  };
}

export interface CRDDetailResponse {
  crd_detail: CRDDetail;
}

export interface CRDsResponse {
  crds: CRD[];
}

export interface APIError {
  code: string;
  message: string;
  details?: string;
}

// Auth Types
export interface LoginRequest {
  username: string;
  password: string;
  auth_type: string;
}

export interface LoginResponse {
  token: string;
  expires_at: number;
}

// System Types
export interface SystemSummary {
  hostname: string;
  os: string;
  platform: string;
  platform_family: string;
  platform_version: string;
  kernel_version: string;
  uptime: number;
  boot_time: number;
  cpu_count: number;
}

export interface HardwareInfo {
  hostname: string;
  architecture: string;
  virtualization: string;
  role: string;
  kernel_version: string;
}

export interface MemoryInfo {
  total: number;
  free: number;
  used: number;
  used_percent: number;
}

export interface CPUInfo {
  model_name: string;
  cores: number;
  load1: number;
  load5: number;
  load15: number;
}

// Network Types
export interface NetworkInterface {
  name: string;
  mac: string;
  mtu: number;
  state: 'up' | 'down';
  type: string;
  addresses: string[];
  statistics: {
    rx_bytes: number;
    tx_bytes: number;
    rx_packets: number;
    tx_packets: number;
    rx_errors: number;
    tx_errors: number;
  };
}

export interface AddressRequest {
  address: string;
  netmask: number;
  gateway?: string;
}

export interface BridgeRequest {
  name: string;
  interfaces?: string[];
}

export interface BondRequest {
  name: string;
  mode: string;
  interfaces: string[];
}

export interface VLANRequest {
  interface: string;
  vlan_id: number;
  name?: string;
}

// Network Operation Response Types
export interface NetworkOperationFailure {
  interface: string;
  reason: string;
}

export interface NetworkOperationResponse {
  message?: string;
  successfully_added?: string[];
  failed?: NetworkOperationFailure[];
  warning?: string;
  persistence_warning?: string;
}

export interface BridgeUpdateRequest {
  interfaces?: string[];
}

export interface BondUpdateRequest {
  mode?: string;
  interfaces?: string[];
}

export interface VLANUpdateRequest {
  vlan_id?: number;
}

export interface AddressUpdateRequest {
  address: string;
  netmask: number;
  gateway?: string;
}

// Storage Types
export interface Disk {
  name: string;
  path: string;
  size: number;
  model: string;
  serial: string;
  type: string;
  removable: boolean;
  partitions: Partition[];
}

export interface Partition {
  name: string;
  path: string;
  size: number;
  type: string;
  filesystem: string;
  mount_point: string;
  used: number;
  available: number;
  use_percent: number;
}

export interface MountRequest {
  device: string;
  mount_point: string;
  filesystem?: string;
  options?: string;
}

export interface UnmountRequest {
  mount_point: string;
  force?: boolean;
}

export interface FormatRequest {
  device: string;
  filesystem: 'ext4' | 'ext3' | 'ext2' | 'xfs' | 'btrfs';
  label?: string;
}

// LVM Types
export interface VolumeGroup {
  name: string;
  size: number;
  free: number;
  pv_count: number;
  lv_count: number;
  uuid: string;
}

export interface LogicalVolume {
  name: string;
  vg_name: string;
  size: number;
  path: string;
  uuid: string;
  attr: string;
}

export interface PhysicalVolume {
  name: string;
  vg_name: string;
  size: number;
  free: number;
  uuid: string;
}

export interface CreateVGRequest {
  name: string;
  devices: string[];
}

export interface CreateLVRequest {
  name: string;
  vg_name: string;
  size: string;
  filesystem?: 'ext4' | 'ext3' | 'ext2' | 'xfs' | 'btrfs';
}

// RAID Types
export interface RAIDDevice {
  name: string;
  path: string;
  level: string;
  state: string;
  size: number;
  devices: string[];
  active_disks: number;
  total_disks: number;
  chunk_size: string;
  uuid: string;
}

export interface RAIDDisk {
  path: string;
  size: number;
  partition: boolean;
  device: string;
}

export interface CreateRAIDRequest {
  name: string;
  level: '0' | '1' | '5' | '6' | '10';
  disks: string[];
  chunk_size?: string;
}

export interface DestroyRAIDRequest {
  device: string;
}

// iSCSI Types
export interface ISCSITarget {
  portal: string;
  iqn: string;
  name: string;
  connected: boolean;
}

export interface ISCSISession {
  target: string;
  portal: string;
  session_id: string;
  state: string;
}

export interface ISCSIDiscoverRequest {
  portal: string;
}

export interface ISCSILoginRequest {
  target: string;
  portal: string;
  username?: string;
  password?: string;
}

export interface ISCSILogoutRequest {
  target: string;
}

// Multipath Types
export interface MultipathDevice {
  name: string;
  wwid: string;
  vendor: string;
  product: string;
  size: string;
  state: string;
  paths: MultipathPath[];
}

export interface MultipathPath {
  device: string;
  host: string;
  state: string;
  priority: number;
  checker: string;
}

// BTRFS Types
export interface BTRFSSubvolumeRequest {
  path: string;
}

export interface BTRFSSnapshotRequest {
  source: string;
  destination: string;
}

// Container Types
export interface Container {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  created_at: string;
  labels: Record<string, string>;
  runtime: string;
}

export interface Image {
  id: string;
  repo_tags: string[];
  repo_digests: string[];
  size: number;
  created_at: string;
  runtime: string;
}

export interface ContainersResponse {
  containers: Container[];
  count: number;
  runtime: string;
}

export interface ImagesResponse {
  images: Image[];
  count: number;
  runtime: string;
}

export interface ContainerPort {
  hostPort: number;
  containerPort: number;
  protocol: string;
  hostIP: string;
}

export interface ContainerCreateRequest {
  name: string;
  image: string;
  command?: string[];
  env?: string[];
  ports?: ContainerPort[];
  mounts?: ContainerMount[];
  labels?: Record<string, string>;
}

export interface ContainerMount {
  source: string;
  destination: string;
  readOnly?: boolean;
}

export interface ContainerActionRequest {
  timeout?: number;
}

export interface ImagePullRequest {
  name: string;
}

// User Types
export interface User {
  username: string;
  uid: string;
  gid: string;
  home: string;
  shell: string;
}

export interface UserRequest {
  username: string;
  password?: string;
  groups?: string;
}

// Log Types
export interface LogEntry {
  timestamp: string;
  priority: string;
  unit: string;
  message: string;
  hostname: string;
  pid: number;
}

export interface LogsQuery {
  service?: string;
  priority?: 'emergency' | 'alert' | 'critical' | 'error' | 'warning' | 'notice' | 'info' | 'debug';
  since?: string;
  until?: string;
  page?: number;
  page_size?: number;
}

export interface LogsResponse {
  logs: LogEntry[];
  total_count: number;
  page: number;
  page_size: number;
}

// Docker Types
export interface DockerContainer {
  id: string;
  names: string[];
  image: string;
  imageId: string;
  command: string;
  created: string;
  state: string;
  status: string;
  ports: DockerPort[];
  labels: Record<string, string>;
  sizeRw?: number;
  sizeRootFs?: number;
  hostConfig: DockerHostConfig;
  networkSettings: DockerNetworkSettings;
  mounts: DockerMount[];
}

export interface DockerPort {
  ip?: string;
  privatePort: number;
  publicPort?: number;
  type: string;
}

export interface DockerHostConfig {
  networkMode: string;
}

export interface DockerNetworkSettings {
  networks: Record<string, DockerNetworkInfo>;
}

export interface DockerNetworkInfo {
  networkId: string;
  endpointId: string;
  gateway: string;
  ipAddress: string;
  ipPrefixLen: number;
  ipv6Gateway?: string;
  macAddress: string;
}

export interface DockerMount {
  type: string;
  source: string;
  destination: string;
  mode: string;
  rw: boolean;
  propagation?: string;
}

export interface DockerImage {
  id: string;
  parentId?: string;
  repoTags: string[];
  repoDigests: string[];
  created: string;
  size: number;
  virtualSize?: number;
  sharedSize?: number;
  labels: Record<string, string>;
  containers?: number;
}

export interface DockerNetwork {
  id: string;
  name: string;
  driver: string;
  created: string;
  scope: string;
  enableIPv6: boolean;
  ipam: DockerIPAM;
  internal: boolean;
  attachable: boolean;
  ingress: boolean;
  configOnly: boolean;
  options: Record<string, string>;
  labels: Record<string, string>;
  containers: Record<string, DockerNetworkInfo>;
}

export interface DockerIPAM {
  driver: string;
  options: Record<string, string>;
  config: DockerIPAMConfig[];
}

export interface DockerIPAMConfig {
  subnet: string;
  ipRange?: string;
  gateway: string;
  auxAddress?: Record<string, string>;
}

export interface DockerVolume {
  name: string;
  driver: string;
  mountpoint: string;
  createdAt: string;
  labels: Record<string, string>;
  scope: string;
  options: Record<string, string>;
  usageData?: DockerVolumeUsageData;
}

export interface DockerVolumeUsageData {
  size: number;
  refCount: number;
}

export interface DockerContainersResponse {
  containers: DockerContainer[];
}

export interface DockerImagesResponse {
  images: DockerImage[];
}

export interface DockerNetworksResponse {
  networks: DockerNetwork[];
}

export interface DockerVolumesResponse {
  volumes: DockerVolume[];
}

// WebSocket Types
export interface WSMessage {
  type: string;
  [key: string]: any;
}

export interface WSAuthMessage extends WSMessage {
  type: 'auth';
  token: string;
}

export interface WSMetricsSubscribeMessage extends WSMessage {
  type: 'subscribe';
  metrics: ('cpu' | 'memory' | 'disk' | 'network' | 'load')[];
}

export interface WSMetricMessage extends WSMessage {
  type: 'metric';
  metric: 'cpu' | 'memory' | 'disk' | 'network' | 'load';
  timestamp: string;
  data: any;
}

export interface WSLogsSubscribeMessage extends WSMessage {
  type: 'subscribe';
  filters: {
    services?: string[];
    priority?: string;
    follow?: boolean;
  };
}

export interface WSLogMessage extends WSMessage {
  type: 'log';
  timestamp: string;
  service?: string;
  priority?: string;
  message: string;
  hostname?: string;
  pid?: number;
}

export interface WSTerminalStartMessage extends WSMessage {
  type: 'start';
  cols: number;
  rows: number;
  shell?: string;
}

export interface WSTerminalInputMessage extends WSMessage {
  type: 'input';
  data: string;
}

export interface WSTerminalResizeMessage extends WSMessage {
  type: 'resize';
  cols: number;
  rows: number;
}

export interface WSTerminalOutputMessage extends WSMessage {
  type: 'output';
  data: string;
}

export interface WSErrorMessage extends WSMessage {
  type: 'error';
  error: string;
  code?: string;
}
