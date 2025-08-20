import type { VirtualMachine, StoragePool, ISOImage, VMTemplate, VMSnapshot, VMBackup, VMCreateRequest, VMCreateResponse, ConsoleInfo, VirtualNetwork, VMAction, VMMetrics, HostResources, ListResponse, OperationResult, Volume, DiskConfig, ISOUploadProgress } from '../types/virtualization';
export declare class VirtualizationAPIError extends Error {
    code: string;
    details?: any | undefined;
    constructor(code: string, message: string, details?: any | undefined);
}
export declare class VirtualizationAPI {
    listVMs(params?: {
        page?: number;
        pageSize?: number;
        filter?: string;
        sort?: string;
    }): Promise<ListResponse<VirtualMachine>>;
    getVM(id: string): Promise<VirtualMachine>;
    createVM(config: Partial<VirtualMachine>): Promise<VirtualMachine>;
    createVMEnhanced(config: VMCreateRequest): Promise<VMCreateResponse>;
    updateVM(id: string, updates: Partial<VirtualMachine>): Promise<VirtualMachine>;
    deleteVM(id: string, force?: boolean): Promise<OperationResult>;
    cloneVM(id: string, name: string): Promise<VirtualMachine>;
    startVM(id: string): Promise<OperationResult>;
    stopVM(id: string, force?: boolean): Promise<OperationResult>;
    restartVM(id: string, force?: boolean): Promise<OperationResult>;
    pauseVM(id: string): Promise<OperationResult>;
    resumeVM(id: string): Promise<OperationResult>;
    resetVM(id: string): Promise<OperationResult>;
    executeVMAction(id: string, action: VMAction): Promise<OperationResult>;
    getConsoleInfo(id: string): Promise<ConsoleInfo>;
    createConsoleSession(id: string): Promise<ConsoleInfo>;
    listTemplates(): Promise<VMTemplate[]>;
    getTemplate(id: string): Promise<VMTemplate>;
    createFromTemplate(templateId: string, config: Partial<VMCreateRequest>): Promise<VirtualMachine>;
    createTemplate(vmId: string, name: string, description?: string): Promise<VMTemplate>;
    listSnapshots(vmId: string): Promise<VMSnapshot[]>;
    createSnapshot(vmId: string, name: string, description?: string): Promise<VMSnapshot>;
    revertToSnapshot(vmId: string, snapshotId: string): Promise<OperationResult>;
    deleteSnapshot(vmId: string, snapshotId: string): Promise<OperationResult>;
    listBackups(vmId: string): Promise<VMBackup[]>;
    createBackup(vmId: string, name: string, type: 'full' | 'incremental'): Promise<VMBackup>;
    restoreFromBackup(vmId: string, backupId: string): Promise<OperationResult>;
    listStoragePools(): Promise<StoragePool[]>;
    getStoragePool(name: string): Promise<StoragePool>;
    createStoragePool(config: Partial<StoragePool>): Promise<StoragePool>;
    deleteStoragePool(name: string): Promise<OperationResult>;
    startStoragePool(name: string): Promise<OperationResult>;
    stopStoragePool(name: string): Promise<OperationResult>;
    setStoragePoolAutostart(name: string, autostart: boolean): Promise<OperationResult>;
    refreshStoragePool(name: string): Promise<OperationResult>;
    listVolumes(poolName: string): Promise<Volume[]>;
    createVolume(poolName: string, config: Partial<Volume>): Promise<Volume>;
    deleteVolume(poolName: string, volumeName: string): Promise<OperationResult>;
    listISOs(): Promise<ISOImage[]>;
    getISO(id: string): Promise<ISOImage>;
    initiateISOUpload(metadata: {
        filename: string;
        size: number;
        os_type?: string;
        os_variant?: string;
        description?: string;
        architecture?: string;
    }): Promise<{
        uploadUrl: string;
        uploadId: string;
    }>;
    completeISOUpload(uploadId: string): Promise<ISOImage>;
    getISOUploadProgress(uploadId: string): Promise<ISOUploadProgress>;
    deleteISO(id: string): Promise<OperationResult>;
    listNetworks(): Promise<VirtualNetwork[]>;
    getNetwork(name: string): Promise<VirtualNetwork>;
    createNetwork(config: Partial<VirtualNetwork>): Promise<VirtualNetwork>;
    deleteNetwork(name: string): Promise<OperationResult>;
    startNetwork(name: string): Promise<OperationResult>;
    stopNetwork(name: string): Promise<OperationResult>;
    getVMMetrics(vmId: string, duration?: string): Promise<VMMetrics[]>;
    getHostResources(): Promise<HostResources>;
    getMetricsWebSocketUrl(vmId: string): string;
    attachDisk(vmId: string, disk: DiskConfig): Promise<OperationResult>;
    detachDisk(vmId: string, device: string): Promise<OperationResult>;
    resizeDisk(vmId: string, device: string, newSize: number): Promise<OperationResult>;
    migrateVM(vmId: string, targetHost: string, live?: boolean): Promise<OperationResult>;
    getMigrationStatus(vmId: string): Promise<{
        status: 'idle' | 'migrating' | 'completed' | 'failed';
        progress?: number;
        error?: string;
    }>;
}
export declare const virtualizationAPI: VirtualizationAPI;
export default virtualizationAPI;
//# sourceMappingURL=virtualization-api.d.ts.map