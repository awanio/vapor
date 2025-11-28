/**
 * Error Mapper Utility
 * Maps API error codes to user-friendly messages
 */

/**
 * VM-related error code mappings
 */
const vmErrorMap: Record<string, string> = {
  // VM lifecycle errors
  VM_NOT_FOUND: 'Virtual machine not found. It may have been deleted.',
  VM_RUNNING: 'This operation requires the VM to be stopped.',
  VM_NOT_RUNNING: 'This operation requires the VM to be running.',
  VM_BUSY: 'The virtual machine is currently busy. Please try again later.',
  VM_LOCKED: 'The virtual machine is locked by another operation.',
  
  // VM creation/update errors
  CREATE_VM_FAILED: 'Failed to create virtual machine.',
  UPDATE_VM_FAILED: 'Failed to update virtual machine.',
  DELETE_VM_FAILED: 'Failed to delete virtual machine.',
  INVALID_VM_CONFIG: 'Invalid virtual machine configuration.',
  INVALID_VM_NAME: 'Invalid virtual machine name.',
  VM_NAME_EXISTS: 'A virtual machine with this name already exists.',
  
  // Disk errors
  VM_DISK_IN_USE: 'Disk is in use by another VM.',
  DISK_NOT_FOUND: 'Disk not found.',
  DISK_ATTACH_FAILED: 'Failed to attach disk to VM.',
  DISK_DETACH_FAILED: 'Failed to detach disk from VM.',
  DISK_RESIZE_FAILED: 'Failed to resize disk.',
  
  // Snapshot errors
  SNAPSHOT_NOT_SUPPORTED: 'Snapshots are not supported for this VM configuration.',
  SNAPSHOT_CREATE_FAILED: 'Failed to create snapshot.',
  SNAPSHOT_DELETE_FAILED: 'Failed to delete snapshot.',
  SNAPSHOT_REVERT_FAILED: 'Failed to revert to snapshot.',
  SNAPSHOT_NOT_FOUND: 'Snapshot not found.',
  INVALID_DISK_FORMAT: 'Invalid disk format for this operation.',
  MIXED_DISK_FORMATS: 'Mixed disk formats detected. External snapshot may be required.',
  
  // Backup errors
  BACKUP_CREATE_FAILED: 'Failed to create backup.',
  BACKUP_DELETE_FAILED: 'Failed to delete backup.',
  BACKUP_RESTORE_FAILED: 'Failed to restore from backup.',
  BACKUP_NOT_FOUND: 'Backup not found.',
  
  // Migration errors
  MIGRATION_FAILED: 'Migration failed.',
  MIGRATION_CANCELLED: 'Migration was cancelled.',
  MIGRATION_IN_PROGRESS: 'A migration is already in progress.',
  INVALID_DESTINATION: 'Invalid migration destination.',
  DESTINATION_UNREACHABLE: 'Migration destination is unreachable.',
  
  // Console errors
  CONSOLE_NOT_AVAILABLE: 'Console is not available for this VM.',
  CONSOLE_CONNECTION_FAILED: 'Failed to connect to console.',
  VNC_NOT_AVAILABLE: 'VNC console is not available.',
  SPICE_NOT_AVAILABLE: 'SPICE console is not available.',
  
  // Clone errors
  CLONE_FAILED: 'Failed to clone virtual machine.',
  CLONE_DISK_FAILED: 'Failed to clone disk.',
  
  // Hotplug errors
  HOTPLUG_FAILED: 'Hotplug operation failed.',
  HOTPLUG_NOT_SUPPORTED: 'Hotplug is not supported for this resource.',
  CPU_HOTPLUG_FAILED: 'Failed to add CPU.',
  MEMORY_HOTPLUG_FAILED: 'Failed to add memory.',
  
  // Storage errors
  STORAGE_POOL_NOT_FOUND: 'Storage pool not found.',
  VOLUME_NOT_FOUND: 'Volume not found.',
  VOLUME_IN_USE: 'Volume is currently in use.',
  INSUFFICIENT_STORAGE: 'Insufficient storage space.',
  
  // Network errors
  NETWORK_NOT_FOUND: 'Network not found.',
  NETWORK_ATTACH_FAILED: 'Failed to attach network interface.',
  NETWORK_DETACH_FAILED: 'Failed to detach network interface.',
  
  // Generic errors
  INVALID_REQUEST: 'Invalid request. Please check your input.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  INTERNAL_ERROR: 'An internal error occurred. Please try again.',
  TIMEOUT: 'Operation timed out. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  AUTH_ERROR: 'Authentication error. Please log in again.',
  API_ERROR: 'API error occurred.',
  
  // Virtualization disabled
  VIRTUALIZATION_DISABLED: 'Virtualization is disabled on this host.',
  LIBVIRT_NOT_AVAILABLE: 'Libvirt is not available on this host.',
};

/**
 * Maps an API error to a user-friendly message
 * @param error - The error object from the API
 * @returns User-friendly error message
 */
export function mapVMError(error: any): string {
  // Handle null/undefined
  if (!error) {
    return 'An unexpected error occurred.';
  }
  
  // Extract error code from various formats
  const code = error.code 
    || error.error?.code 
    || error.data?.code
    || (typeof error === 'string' ? error : null);
  
  // Look up in error map
  if (code && vmErrorMap[code]) {
    return vmErrorMap[code];
  }
  
  // Extract message from various formats
  const message = error.message 
    || error.error?.message 
    || error.data?.message
    || error.details
    || error.error?.details;
  
  if (message && typeof message === 'string') {
    return message;
  }
  
  // Fallback
  return 'An unexpected error occurred.';
}

/**
 * Maps an API error with additional context
 * @param error - The error object from the API
 * @param context - Additional context for the error message
 * @returns User-friendly error message with context
 */
export function mapVMErrorWithContext(error: any, context: string): string {
  const baseMessage = mapVMError(error);
  return `${context}: ${baseMessage}`;
}

/**
 * Extracts the error code from an error object
 * @param error - The error object
 * @returns The error code or undefined
 */
export function getErrorCode(error: any): string | undefined {
  return error?.code 
    || error?.error?.code 
    || error?.data?.code;
}

/**
 * Checks if the error is a specific type
 * @param error - The error object
 * @param code - The error code to check
 * @returns True if the error matches the code
 */
export function isErrorType(error: any, code: string): boolean {
  return getErrorCode(error) === code;
}

/**
 * Gets a short error code label for display
 * @param error - The error object
 * @returns Short label or empty string
 */
export function getErrorLabel(error: any): string {
  const code = getErrorCode(error);
  if (!code) return '';
  
  // Convert SNAKE_CASE to Title Case
  return code
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

export default mapVMError;
