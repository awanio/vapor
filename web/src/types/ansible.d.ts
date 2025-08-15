// Ansible API Type Definitions

// Playbook related types
export interface PlaybookInfo {
  name: string;
  path: string;
  size: number;
  modified: string;
  is_directory: boolean;
}

export interface PlaybookDetail {
  name: string;
  path: string;
  content: string;
  size: number;
  modified: string;
}

export interface PlaybookUploadRequest {
  name: string;
  content: string; // Base64 encoded
  overwrite?: boolean;
}

export interface PlaybookValidationResponse {
  valid: boolean;
  message: string;
  errors?: string[];
  warnings?: string[];
}

export interface PlaybookRunRequest {
  playbook: string;
  inventory?: string;
  limit?: string;
  tags?: string[];
  skip_tags?: string[];
  extra_vars?: Record<string, string>;
  check?: boolean;
  diff?: boolean;
  verbose?: number;
  become?: boolean;
  become_user?: string;
  private_key?: string;
  timeout?: number;
  forks?: number;
}

// Execution related types
export interface ExecutionStartResponse {
  execution_id: string;
  status: 'starting' | 'running' | 'success' | 'failed';
  type: 'playbook' | 'adhoc';
  started_at: string;
  stream_url: string;
}

export interface ExecutionSummary {
  id: string;
  type: 'playbook' | 'adhoc';
  playbook?: string;
  module?: string;
  status: 'running' | 'success' | 'failed' | 'cancelled';
  started_at: string;
  finished_at?: string;
  duration?: number;
  hosts_summary?: {
    ok: number;
    changed: number;
    unreachable: number;
    failed: number;
    skipped: number;
    rescued: number;
    ignored: number;
  };
}

export interface ExecutionDetail extends ExecutionSummary {
  command: string;
  parameters?: Record<string, any>;
  output: string;
  exit_code: number;
  host_results?: HostResult[];
}

export interface HostResult {
  host: string;
  ok: number;
  changed: number;
  unreachable: boolean;
  failed: boolean;
  skipped: number;
  rescued: number;
  ignored: number;
}

// Ad-hoc command types
export interface AdHocRequest {
  hosts: string;
  module: string;
  args?: string;
  inventory?: string;
  extra_vars?: Record<string, string>;
  become?: boolean;
  verbose?: number;
  forks?: number;
}

// Template related types
export interface PlaybookTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  variables: TemplateVariable[];
  tags: string[];
}

export interface TemplateVariable {
  name: string;
  description: string;
  type: 'string' | 'integer' | 'boolean' | 'list' | 'dict';
  required: boolean;
  default?: string;
  validation?: string;
}

export interface CreateFromTemplateRequest {
  template_id: string;
  name: string;
  variables: Record<string, string>;
}

// Inventory related types
export interface AnsibleInventory {
  _meta: {
    hostvars: Record<string, Record<string, string>>;
  };
  all: {
    hosts: string[];
    children?: string[];
    vars?: Record<string, any>;
  };
  [groupName: string]: any;
}

export interface DynamicInventoryResponse {
  inventory: AnsibleInventory;
}

export interface SaveInventoryRequest {
  name: string;
  format: 'ini' | 'yaml' | 'json';
  content: string;
}

// Git sync and Galaxy types
export interface GitSyncRequest {
  url: string;
  branch?: string;
  path?: string;
  auth_token?: string;
  ssh_key?: string;
  sync_as_symlink?: boolean;
}

export interface GalaxyInstallRequest {
  type: 'role' | 'collection';
  name: string;
  version?: string;
  requirements_file?: string;
  force?: boolean;
}

// Schedule types (for future implementation)
export interface ScheduleInfo {
  id: string;
  name: string;
  playbook: string;
  schedule: string; // cron expression
  enabled: boolean;
  last_run?: string;
  next_run?: string;
}

export interface CreateScheduleRequest {
  name: string;
  playbook: string;
  schedule: string;
  parameters?: PlaybookRunRequest;
  enabled?: boolean;
}

// WebSocket message types for execution streaming
export interface ExecutionStreamMessage {
  type: 'output' | 'complete' | 'error' | 'progress';
  content?: string;
  time?: number;
  result?: {
    id: string;
    status: string;
    exit_code: number;
  };
  error?: string;
  progress?: {
    current: number;
    total: number;
    task: string;
  };
}

// API Response wrappers
export interface PlaybooksListResponse {
  playbooks: PlaybookInfo[];
  count: number;
}

export interface PlaybookDetailResponse {
  playbook: PlaybookDetail;
}

export interface ExecutionsListResponse {
  executions: ExecutionSummary[];
  count: number;
}

export interface ExecutionDetailResponse {
  execution: ExecutionDetail;
}

export interface TemplatesListResponse {
  templates: PlaybookTemplate[];
}

export interface SchedulesListResponse {
  schedules: ScheduleInfo[];
  count: number;
}
