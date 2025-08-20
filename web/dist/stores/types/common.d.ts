export interface StoreError {
    code: string;
    message: string;
    timestamp: number;
    context?: Record<string, unknown>;
    retry?: () => Promise<void>;
}
export interface LoadingState {
    isLoading: boolean;
    loadingKey?: string;
    progress?: number;
}
export interface PaginationConfig {
    page: number;
    pageSize: number;
    total?: number;
    hasMore?: boolean;
}
export interface SortConfig {
    field: string;
    direction: 'asc' | 'desc';
}
export interface FilterConfig {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
    value: any;
}
export interface BaseEntity {
    id: string;
    createdAt?: string;
    updatedAt?: string;
}
export interface CrudResult<T> {
    success: boolean;
    data?: T;
    error?: StoreError;
}
export interface BatchResult<T> {
    succeeded: T[];
    failed: Array<{
        item: T;
        error: StoreError;
    }>;
}
export interface ResourceState<T> {
    data: T | null;
    loading: boolean;
    error: StoreError | null;
    lastFetch?: number;
    stale?: boolean;
}
export interface CollectionState<T> {
    items: Map<string, T>;
    loading: boolean;
    error: StoreError | null;
    filters: FilterConfig[];
    sort: SortConfig | null;
    pagination: PaginationConfig | null;
    lastFetch?: number;
    stale?: boolean;
}
export type Unsubscribe = () => void;
export declare enum StoreEventType {
    CREATED = "created",
    UPDATED = "updated",
    DELETED = "deleted",
    BATCH_UPDATED = "batch_updated",
    ERROR = "error",
    LOADING_START = "loading_start",
    LOADING_END = "loading_end"
}
export interface StoreEvent<T = any> {
    type: StoreEventType;
    payload: T;
    timestamp: number;
    source?: string;
}
export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl?: number;
    tags?: string[];
}
export type StoreSubscriber<T> = (value: T) => void;
export interface StoreLifecycle {
    onInit?: () => void | Promise<void>;
    onDestroy?: () => void;
    onError?: (error: StoreError) => void;
    onStale?: () => void;
}
export interface StoreConfig {
    persistent?: boolean;
    persistKey?: string;
    ttl?: number;
    autoRefresh?: boolean;
    refreshInterval?: number;
    optimistic?: boolean;
    debug?: boolean;
}
export interface QueryParams {
    filters?: FilterConfig[];
    sort?: SortConfig;
    pagination?: PaginationConfig;
    include?: string[];
    fields?: string[];
}
export interface OptimisticUpdate<T> {
    id: string;
    previousValue: T;
    newValue: T;
    rollback: () => void;
}
//# sourceMappingURL=common.d.ts.map