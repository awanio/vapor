import { StoreEventType } from '../types';
import type { VirtualMachine, StoragePool, ISOImage, VMTemplate, VMCreateRequest, VMState, ConsoleInfo, VirtualNetwork } from '../../types/virtualization';
export declare const vmStore: import("../utils/factory").CrudStore<VirtualMachine>;
export declare const storagePoolStore: {
    transform: any;
    fetch(): Promise<void>;
    $items: import("nanostores").WritableAtom<Map<string, StoragePool & {
        id: string;
    }>>;
    $loading: import("nanostores").WritableAtom<boolean>;
    $error: import("nanostores").WritableAtom<import("../types").StoreError | null>;
    $filters: import("nanostores").WritableAtom<import("../types").FilterConfig[]>;
    $sort: import("nanostores").WritableAtom<import("../types").SortConfig | null>;
    $pagination: import("nanostores").WritableAtom<import("../types").PaginationConfig | null>;
    $filteredItems: import("nanostores").ReadableAtom<(StoragePool & {
        id: string;
    })[]>;
    $sortedItems: import("nanostores").ReadableAtom<(StoragePool & {
        id: string;
    })[]>;
    $paginatedItems: import("nanostores").ReadableAtom<(StoragePool & {
        id: string;
    })[]>;
    $count: import("nanostores").ReadableAtom<number>;
    $isEmpty: import("nanostores").ReadableAtom<boolean>;
    $state: import("nanostores").ReadableAtom<import("../types").CollectionState<StoragePool & {
        id: string;
    }>>;
    create: (item: Partial<StoragePool & {
        id: string;
    }>) => Promise<import("../types").CrudResult<StoragePool & {
        id: string;
    }>>;
    read: (id: string) => Promise<import("../types").CrudResult<StoragePool & {
        id: string;
    }>>;
    update: (id: string, updates: Partial<StoragePool & {
        id: string;
    }>) => Promise<import("../types").CrudResult<StoragePool & {
        id: string;
    }>>;
    delete: (id: string) => Promise<import("../types").CrudResult<boolean>>;
    createMany: (items: Partial<StoragePool & {
        id: string;
    }>[]) => Promise<import("../types").BatchResult<StoragePool & {
        id: string;
    }>>;
    updateMany: (updates: {
        id: string;
        data: Partial<StoragePool & {
            id: string;
        }>;
    }[]) => Promise<import("../types").BatchResult<StoragePool & {
        id: string;
    }>>;
    deleteMany: (ids: string[]) => Promise<import("../types").BatchResult<string>>;
    refresh: () => Promise<void>;
    clear: () => void;
    setFilters: (filters: import("../types").FilterConfig[]) => void;
    addFilter: (filter: import("../types").FilterConfig) => void;
    removeFilter: (field: string) => void;
    clearFilters: () => void;
    setSort: (sort: import("../types").SortConfig | null) => void;
    setPagination: (pagination: import("../types").PaginationConfig | null) => void;
    optimisticUpdate: (id: string, updates: Partial<StoragePool & {
        id: string;
    }>) => import("../types").OptimisticUpdate<StoragePool & {
        id: string;
    }>;
    rollback: (update: import("../types").OptimisticUpdate<StoragePool & {
        id: string;
    }>) => void;
    getById: (id: string) => (StoragePool & {
        id: string;
    }) | undefined;
    exists: (id: string) => boolean;
    validate: (item: Partial<StoragePool & {
        id: string;
    }>) => boolean | import("../types").StoreError;
    on: (event: StoreEventType, handler: (event: import("../types").StoreEvent<StoragePool & {
        id: string;
    }>) => void) => () => void;
    emit: (event: import("../types").StoreEvent<StoragePool & {
        id: string;
    }>) => void;
    destroy: () => void;
};
export declare const isoStore: {
    fetch(): Promise<void>;
    $items: import("nanostores").WritableAtom<Map<string, ISOImage>>;
    $loading: import("nanostores").WritableAtom<boolean>;
    $error: import("nanostores").WritableAtom<import("../types").StoreError | null>;
    $filters: import("nanostores").WritableAtom<import("../types").FilterConfig[]>;
    $sort: import("nanostores").WritableAtom<import("../types").SortConfig | null>;
    $pagination: import("nanostores").WritableAtom<import("../types").PaginationConfig | null>;
    $filteredItems: import("nanostores").ReadableAtom<ISOImage[]>;
    $sortedItems: import("nanostores").ReadableAtom<ISOImage[]>;
    $paginatedItems: import("nanostores").ReadableAtom<ISOImage[]>;
    $count: import("nanostores").ReadableAtom<number>;
    $isEmpty: import("nanostores").ReadableAtom<boolean>;
    $state: import("nanostores").ReadableAtom<import("../types").CollectionState<ISOImage>>;
    create: (item: Partial<ISOImage>) => Promise<import("../types").CrudResult<ISOImage>>;
    read: (id: string) => Promise<import("../types").CrudResult<ISOImage>>;
    update: (id: string, updates: Partial<ISOImage>) => Promise<import("../types").CrudResult<ISOImage>>;
    delete: (id: string) => Promise<import("../types").CrudResult<boolean>>;
    createMany: (items: Partial<ISOImage>[]) => Promise<import("../types").BatchResult<ISOImage>>;
    updateMany: (updates: {
        id: string;
        data: Partial<ISOImage>;
    }[]) => Promise<import("../types").BatchResult<ISOImage>>;
    deleteMany: (ids: string[]) => Promise<import("../types").BatchResult<string>>;
    refresh: () => Promise<void>;
    clear: () => void;
    setFilters: (filters: import("../types").FilterConfig[]) => void;
    addFilter: (filter: import("../types").FilterConfig) => void;
    removeFilter: (field: string) => void;
    clearFilters: () => void;
    setSort: (sort: import("../types").SortConfig | null) => void;
    setPagination: (pagination: import("../types").PaginationConfig | null) => void;
    optimisticUpdate: (id: string, updates: Partial<ISOImage>) => import("../types").OptimisticUpdate<ISOImage>;
    rollback: (update: import("../types").OptimisticUpdate<ISOImage>) => void;
    getById: (id: string) => ISOImage | undefined;
    exists: (id: string) => boolean;
    validate: (item: Partial<ISOImage>) => boolean | import("../types").StoreError;
    on: (event: StoreEventType, handler: (event: import("../types").StoreEvent<ISOImage>) => void) => () => void;
    emit: (event: import("../types").StoreEvent<ISOImage>) => void;
    destroy: () => void;
};
export declare const templateStore: import("../utils/factory").CrudStore<VMTemplate>;
export declare const networkStore: import("../utils/factory").CrudStore<VirtualNetwork & {
    id: string;
}>;
export declare const $selectedVMId: import("nanostores").PreinitializedWritableAtom<string | null> & object;
export declare const $vmWizardState: import("nanostores").PreinitializedWritableAtom<{
    isOpen: boolean;
    currentStep: number;
    formData: Partial<VMCreateRequest>;
    errors: Record<string, string>;
}> & object;
export declare const $isoUploadState: import("nanostores").PreinitializedWritableAtom<{
    isUploading: boolean;
    uploadProgress: number;
    uploadId: string | null;
    error: string | null;
}> & object;
export declare const $consoleConnections: import("nanostores").PreinitializedMapStore<Record<string, {
    vmId: string;
    status: "connecting" | "connected" | "disconnected" | "error";
    type: "vnc" | "spice";
    token: string;
    wsUrl: string;
}>> & object;
export declare const $activeVMTab: import("nanostores").PreinitializedWritableAtom<"all" | "running" | "stopped" | "templates"> & object;
export declare const $vmSearchQuery: import("nanostores").PreinitializedWritableAtom<string> & object;
export declare const $vmFilterState: import("nanostores").PreinitializedWritableAtom<{
    state?: VMState[];
    os_type?: string[];
}> & object;
export declare const $selectedVM: import("nanostores").ReadableAtom<VirtualMachine | null>;
export declare const $vmsByState: import("nanostores").ReadableAtom<Record<string, VirtualMachine[]>>;
export declare const $filteredVMs: import("nanostores").ReadableAtom<VirtualMachine[]>;
export declare const $resourceStats: import("nanostores").ReadableAtom<{
    totalVMs: number;
    runningVMs: number;
    stoppedVMs: number;
    pausedVMs: number;
    totalMemory: number;
    totalVCPUs: number;
    totalDiskSize: number;
}>;
export declare const $availableStoragePools: import("nanostores").ReadableAtom<(StoragePool & {
    id: string;
})[]>;
export declare const $availableISOs: import("nanostores").ReadableAtom<ISOImage[]>;
export declare const vmActions: {
    fetchAll(): Promise<void>;
    create(vmData: VMCreateRequest): Promise<{
        success: boolean;
        data: VirtualMachine;
    }>;
    start(vmId: string): Promise<void>;
    stop(vmId: string, force?: boolean): Promise<void>;
    restart(vmId: string): Promise<void>;
    pause(vmId: string): Promise<void>;
    resume(vmId: string): Promise<void>;
    delete(vmId: string): Promise<void>;
    getConsoleInfo(vmId: string): Promise<ConsoleInfo>;
    selectVM(vmId: string | null): void;
};
export declare const wizardActions: {
    openWizard(): void;
    closeWizard(): void;
    nextStep(): void;
    previousStep(): void;
    updateFormData(updates: Partial<VMCreateRequest>): void;
    setError(field: string, error: string): void;
    clearErrors(): void;
    validateStep(step: number): boolean;
};
export declare const storageActions: {
    fetchPools(): Promise<void>;
    fetchISOs(): Promise<void>;
    uploadISO(_file: File, _metadata: Record<string, string>): Promise<unknown>;
    deleteISO(isoId: string): Promise<void>;
};
export declare function initializeVirtualizationStores(): Promise<void>;
export declare function cleanupVirtualizationStores(): void;
export declare function connectVMStatusWebSocket(): WebSocket;
declare const _default: {
    vmStore: import("../utils/factory").CrudStore<VirtualMachine>;
    storagePoolStore: {
        transform: any;
        fetch(): Promise<void>;
        $items: import("nanostores").WritableAtom<Map<string, StoragePool & {
            id: string;
        }>>;
        $loading: import("nanostores").WritableAtom<boolean>;
        $error: import("nanostores").WritableAtom<import("../types").StoreError | null>;
        $filters: import("nanostores").WritableAtom<import("../types").FilterConfig[]>;
        $sort: import("nanostores").WritableAtom<import("../types").SortConfig | null>;
        $pagination: import("nanostores").WritableAtom<import("../types").PaginationConfig | null>;
        $filteredItems: import("nanostores").ReadableAtom<(StoragePool & {
            id: string;
        })[]>;
        $sortedItems: import("nanostores").ReadableAtom<(StoragePool & {
            id: string;
        })[]>;
        $paginatedItems: import("nanostores").ReadableAtom<(StoragePool & {
            id: string;
        })[]>;
        $count: import("nanostores").ReadableAtom<number>;
        $isEmpty: import("nanostores").ReadableAtom<boolean>;
        $state: import("nanostores").ReadableAtom<import("../types").CollectionState<StoragePool & {
            id: string;
        }>>;
        create: (item: Partial<StoragePool & {
            id: string;
        }>) => Promise<import("../types").CrudResult<StoragePool & {
            id: string;
        }>>;
        read: (id: string) => Promise<import("../types").CrudResult<StoragePool & {
            id: string;
        }>>;
        update: (id: string, updates: Partial<StoragePool & {
            id: string;
        }>) => Promise<import("../types").CrudResult<StoragePool & {
            id: string;
        }>>;
        delete: (id: string) => Promise<import("../types").CrudResult<boolean>>;
        createMany: (items: Partial<StoragePool & {
            id: string;
        }>[]) => Promise<import("../types").BatchResult<StoragePool & {
            id: string;
        }>>;
        updateMany: (updates: {
            id: string;
            data: Partial<StoragePool & {
                id: string;
            }>;
        }[]) => Promise<import("../types").BatchResult<StoragePool & {
            id: string;
        }>>;
        deleteMany: (ids: string[]) => Promise<import("../types").BatchResult<string>>;
        refresh: () => Promise<void>;
        clear: () => void;
        setFilters: (filters: import("../types").FilterConfig[]) => void;
        addFilter: (filter: import("../types").FilterConfig) => void;
        removeFilter: (field: string) => void;
        clearFilters: () => void;
        setSort: (sort: import("../types").SortConfig | null) => void;
        setPagination: (pagination: import("../types").PaginationConfig | null) => void;
        optimisticUpdate: (id: string, updates: Partial<StoragePool & {
            id: string;
        }>) => import("../types").OptimisticUpdate<StoragePool & {
            id: string;
        }>;
        rollback: (update: import("../types").OptimisticUpdate<StoragePool & {
            id: string;
        }>) => void;
        getById: (id: string) => (StoragePool & {
            id: string;
        }) | undefined;
        exists: (id: string) => boolean;
        validate: (item: Partial<StoragePool & {
            id: string;
        }>) => boolean | import("../types").StoreError;
        on: (event: StoreEventType, handler: (event: import("../types").StoreEvent<StoragePool & {
            id: string;
        }>) => void) => () => void;
        emit: (event: import("../types").StoreEvent<StoragePool & {
            id: string;
        }>) => void;
        destroy: () => void;
    };
    isoStore: {
        fetch(): Promise<void>;
        $items: import("nanostores").WritableAtom<Map<string, ISOImage>>;
        $loading: import("nanostores").WritableAtom<boolean>;
        $error: import("nanostores").WritableAtom<import("../types").StoreError | null>;
        $filters: import("nanostores").WritableAtom<import("../types").FilterConfig[]>;
        $sort: import("nanostores").WritableAtom<import("../types").SortConfig | null>;
        $pagination: import("nanostores").WritableAtom<import("../types").PaginationConfig | null>;
        $filteredItems: import("nanostores").ReadableAtom<ISOImage[]>;
        $sortedItems: import("nanostores").ReadableAtom<ISOImage[]>;
        $paginatedItems: import("nanostores").ReadableAtom<ISOImage[]>;
        $count: import("nanostores").ReadableAtom<number>;
        $isEmpty: import("nanostores").ReadableAtom<boolean>;
        $state: import("nanostores").ReadableAtom<import("../types").CollectionState<ISOImage>>;
        create: (item: Partial<ISOImage>) => Promise<import("../types").CrudResult<ISOImage>>;
        read: (id: string) => Promise<import("../types").CrudResult<ISOImage>>;
        update: (id: string, updates: Partial<ISOImage>) => Promise<import("../types").CrudResult<ISOImage>>;
        delete: (id: string) => Promise<import("../types").CrudResult<boolean>>;
        createMany: (items: Partial<ISOImage>[]) => Promise<import("../types").BatchResult<ISOImage>>;
        updateMany: (updates: {
            id: string;
            data: Partial<ISOImage>;
        }[]) => Promise<import("../types").BatchResult<ISOImage>>;
        deleteMany: (ids: string[]) => Promise<import("../types").BatchResult<string>>;
        refresh: () => Promise<void>;
        clear: () => void;
        setFilters: (filters: import("../types").FilterConfig[]) => void;
        addFilter: (filter: import("../types").FilterConfig) => void;
        removeFilter: (field: string) => void;
        clearFilters: () => void;
        setSort: (sort: import("../types").SortConfig | null) => void;
        setPagination: (pagination: import("../types").PaginationConfig | null) => void;
        optimisticUpdate: (id: string, updates: Partial<ISOImage>) => import("../types").OptimisticUpdate<ISOImage>;
        rollback: (update: import("../types").OptimisticUpdate<ISOImage>) => void;
        getById: (id: string) => ISOImage | undefined;
        exists: (id: string) => boolean;
        validate: (item: Partial<ISOImage>) => boolean | import("../types").StoreError;
        on: (event: StoreEventType, handler: (event: import("../types").StoreEvent<ISOImage>) => void) => () => void;
        emit: (event: import("../types").StoreEvent<ISOImage>) => void;
        destroy: () => void;
    };
    templateStore: import("../utils/factory").CrudStore<VMTemplate>;
    networkStore: import("../utils/factory").CrudStore<VirtualNetwork & {
        id: string;
    }>;
    $selectedVMId: import("nanostores").PreinitializedWritableAtom<string | null> & object;
    $vmWizardState: import("nanostores").PreinitializedWritableAtom<{
        isOpen: boolean;
        currentStep: number;
        formData: Partial<VMCreateRequest>;
        errors: Record<string, string>;
    }> & object;
    $isoUploadState: import("nanostores").PreinitializedWritableAtom<{
        isUploading: boolean;
        uploadProgress: number;
        uploadId: string | null;
        error: string | null;
    }> & object;
    $consoleConnections: import("nanostores").PreinitializedMapStore<Record<string, {
        vmId: string;
        status: "connecting" | "connected" | "disconnected" | "error";
        type: "vnc" | "spice";
        token: string;
        wsUrl: string;
    }>> & object;
    $activeVMTab: import("nanostores").PreinitializedWritableAtom<"all" | "running" | "stopped" | "templates"> & object;
    $vmSearchQuery: import("nanostores").PreinitializedWritableAtom<string> & object;
    $vmFilterState: import("nanostores").PreinitializedWritableAtom<{
        state?: VMState[];
        os_type?: string[];
    }> & object;
    $selectedVM: import("nanostores").ReadableAtom<VirtualMachine | null>;
    $vmsByState: import("nanostores").ReadableAtom<Record<string, VirtualMachine[]>>;
    $filteredVMs: import("nanostores").ReadableAtom<VirtualMachine[]>;
    $resourceStats: import("nanostores").ReadableAtom<{
        totalVMs: number;
        runningVMs: number;
        stoppedVMs: number;
        pausedVMs: number;
        totalMemory: number;
        totalVCPUs: number;
        totalDiskSize: number;
    }>;
    $availableStoragePools: import("nanostores").ReadableAtom<(StoragePool & {
        id: string;
    })[]>;
    $availableISOs: import("nanostores").ReadableAtom<ISOImage[]>;
    vmActions: {
        fetchAll(): Promise<void>;
        create(vmData: VMCreateRequest): Promise<{
            success: boolean;
            data: VirtualMachine;
        }>;
        start(vmId: string): Promise<void>;
        stop(vmId: string, force?: boolean): Promise<void>;
        restart(vmId: string): Promise<void>;
        pause(vmId: string): Promise<void>;
        resume(vmId: string): Promise<void>;
        delete(vmId: string): Promise<void>;
        getConsoleInfo(vmId: string): Promise<ConsoleInfo>;
        selectVM(vmId: string | null): void;
    };
    wizardActions: {
        openWizard(): void;
        closeWizard(): void;
        nextStep(): void;
        previousStep(): void;
        updateFormData(updates: Partial<VMCreateRequest>): void;
        setError(field: string, error: string): void;
        clearErrors(): void;
        validateStep(step: number): boolean;
    };
    storageActions: {
        fetchPools(): Promise<void>;
        fetchISOs(): Promise<void>;
        uploadISO(_file: File, _metadata: Record<string, string>): Promise<unknown>;
        deleteISO(isoId: string): Promise<void>;
    };
    initializeVirtualizationStores: typeof initializeVirtualizationStores;
    cleanupVirtualizationStores: typeof cleanupVirtualizationStores;
    connectVMStatusWebSocket: typeof connectVMStatusWebSocket;
};
export default _default;
//# sourceMappingURL=index.d.ts.map