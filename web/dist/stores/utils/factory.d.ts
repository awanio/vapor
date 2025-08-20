import { WritableAtom, ReadableAtom } from 'nanostores';
import type { BaseEntity, CollectionState, StoreConfig, StoreError, CrudResult, BatchResult, QueryParams, OptimisticUpdate, StoreEvent, FilterConfig, SortConfig, PaginationConfig } from '../types';
import { StoreEventType } from '../types';
export interface StoreFactoryOptions<T extends BaseEntity> extends StoreConfig {
    name: string;
    initialData?: T[];
    idField?: keyof T;
    endpoint?: string;
    transform?: (data: any) => T;
    validate?: (item: T) => boolean | StoreError;
    comparator?: (a: T, b: T) => number;
}
export interface CrudStore<T extends BaseEntity> {
    $items: WritableAtom<Map<string, T>>;
    $loading: WritableAtom<boolean>;
    $error: WritableAtom<StoreError | null>;
    $filters: WritableAtom<FilterConfig[]>;
    $sort: WritableAtom<SortConfig | null>;
    $pagination: WritableAtom<PaginationConfig | null>;
    $filteredItems: ReadableAtom<T[]>;
    $sortedItems: ReadableAtom<T[]>;
    $paginatedItems: ReadableAtom<T[]>;
    $count: ReadableAtom<number>;
    $isEmpty: ReadableAtom<boolean>;
    $state: ReadableAtom<CollectionState<T>>;
    create: (item: Partial<T>) => Promise<CrudResult<T>>;
    read: (id: string) => Promise<CrudResult<T>>;
    update: (id: string, updates: Partial<T>) => Promise<CrudResult<T>>;
    delete: (id: string) => Promise<CrudResult<boolean>>;
    createMany: (items: Partial<T>[]) => Promise<BatchResult<T>>;
    updateMany: (updates: Array<{
        id: string;
        data: Partial<T>;
    }>) => Promise<BatchResult<T>>;
    deleteMany: (ids: string[]) => Promise<BatchResult<string>>;
    fetch: (params?: QueryParams) => Promise<void>;
    refresh: () => Promise<void>;
    clear: () => void;
    setFilters: (filters: FilterConfig[]) => void;
    addFilter: (filter: FilterConfig) => void;
    removeFilter: (field: string) => void;
    clearFilters: () => void;
    setSort: (sort: SortConfig | null) => void;
    setPagination: (pagination: PaginationConfig | null) => void;
    optimisticUpdate: (id: string, updates: Partial<T>) => OptimisticUpdate<T>;
    rollback: (update: OptimisticUpdate<T>) => void;
    getById: (id: string) => T | undefined;
    exists: (id: string) => boolean;
    validate: (item: Partial<T>) => boolean | StoreError;
    on: (event: StoreEventType, handler: (event: StoreEvent<T>) => void) => () => void;
    emit: (event: StoreEvent<T>) => void;
    destroy: () => void;
}
export declare function createStore<T extends BaseEntity>(options: StoreFactoryOptions<T>): CrudStore<T>;
//# sourceMappingURL=factory.d.ts.map