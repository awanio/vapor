import { atom, computed } from 'nanostores';
import type {
  VMBackup,
  BackupCreateRequest,
  BackupRestoreRequest,
  BackupImportRequest,
} from '../../types/virtualization';
import virtualizationAPI, { VirtualizationAPIError } from '../../services/virtualization-api';
import { mapVMError } from '../../utils/error-mapper';

const api = virtualizationAPI;

const normalizeBackup = (backup: any): VMBackup => {
  const backup_id = backup.backup_id ?? backup.id;
  return {
    ...backup,
    backup_id,
    id: backup_id ?? backup.id,
    vm_uuid: backup.vm_uuid || backup.vm_id || backup.vm_uuid,
    vm_id: backup.vm_id || backup.vm_uuid,
  } as VMBackup;
};

const getBackupKey = (backup: Partial<VMBackup>): string | null => {
  return (backup.backup_id ?? backup.id) || null;
};

export const $backups = atom<VMBackup[]>([]);
export const $backupsLoading = atom<boolean>(false);
export const $backupsError = atom<string | null>(null);

export const $backupsByVm = computed($backups, (items) => {
  const map = new Map<string, VMBackup[]>();
  items.forEach((backup) => {
    const key = backup.vm_uuid || backup.vm_id || 'unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key)?.push(backup);
  });
  return map;
});

export const makeVmBackupsStore = (vmId: string) =>
  computed($backups, (items) => items.filter((b) => (b.vm_uuid || b.vm_id) === vmId));

function setError(err: any) {
  if (err instanceof VirtualizationAPIError) {
    $backupsError.set(err.userMessage || err.message);
  } else {
    $backupsError.set(mapVMError(err));
  }
}

function mergeBackups(backups: VMBackup[]) {
  const current = new Map<string, VMBackup>();

  $backups.get().forEach((b) => {
    const key = getBackupKey(b);
    if (!key) return;
    current.set(key, b);
  });

  backups.forEach((b) => {
    const normalized = normalizeBackup(b);
    const key = getBackupKey(normalized);
    if (!key) return;
    current.set(key, normalized);
  });

  $backups.set(Array.from(current.values()));
}

function replaceBackupsForVm(vmId: string, backups: VMBackup[]) {
  const normalized = backups.map(normalizeBackup);
  const existing = $backups.get().filter((b) => (b.vm_uuid || b.vm_id) !== vmId);
  $backups.set([...existing, ...normalized]);
}

export async function fetchGlobalBackups(filters?: { search?: string; status?: string; type?: string }) {
  $backupsLoading.set(true);
  $backupsError.set(null);
  try {
    const backups = await api.listAllBackups(filters);
    mergeBackups(backups || []);
  } catch (error) {
    console.error('Failed to fetch global backups', error);
    setError(error);
    throw error;
  } finally {
    $backupsLoading.set(false);
  }
}

export async function fetchVmBackups(vmId: string) {
  if (!vmId) return;
  $backupsLoading.set(true);
  $backupsError.set(null);
  try {
    const backups = await api.listBackups(vmId);
    replaceBackupsForVm(vmId, backups || []);
  } catch (error) {
    console.error('Failed to fetch VM backups', error);
    setError(error);
    throw error;
  } finally {
    $backupsLoading.set(false);
  }
}

export async function createVmBackup(vmId: string, payload: BackupCreateRequest) {
  $backupsError.set(null);
  const backup = await api.createBackup(vmId, payload);
  mergeBackups([backup]);
  return backup;
}

export async function importBackup(payload: BackupImportRequest) {
  $backupsError.set(null);
  const backup = await api.importBackup(payload);
  mergeBackups([backup]);
  return backup;
}

export async function restoreBackup(payload: BackupRestoreRequest) {
  $backupsError.set(null);
  return api.restoreBackup(payload);
}

export async function deleteBackup(backupId: string) {
  $backupsError.set(null);
  await api.deleteBackup(backupId);
  const remaining = $backups.get().filter((b) => getBackupKey(b) !== backupId);
  $backups.set(remaining);
}

export const backupActions = {
  fetchGlobal: fetchGlobalBackups,
  fetchForVm: fetchVmBackups,
  create: createVmBackup,
  import: importBackup,
  restore: restoreBackup,
  delete: deleteBackup,
};
