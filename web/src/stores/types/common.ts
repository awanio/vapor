/**
 * Common types shared across all stores
 */

/**
 * Generic store error structure for consistent error handling
 */
export interface StoreError {
  code: string;
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
  retry?: () => Promise<void>;
}

/**
 * Loading state for async operations
 */
export interface LoadingState {
  isLoading: boolean;
  loadingKey?: string;
  progress?: number;
}

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  page: number;
  pageSize: number;
  total?: number;
  hasMore?: boolean;
}

/**
 * Sort configuration
 */
export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Filter configuration
 */
export interface FilterConfig {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value: any;
}

/**
 * Base entity interface for resources
 */
export interface BaseEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * CRUD operations result
 */
export interface CrudResult<T> {
  success: boolean;
  data?: T;
  error?: StoreError;
}

/**
 * Batch operation result
 */
export interface BatchResult<T> {
  succeeded: T[];
  failed: Array<{ item: T; error: StoreError }>;
}

/**
 * Resource state tracking
 */
export interface ResourceState<T> {
  data: T | null;
  loading: boolean;
  error: StoreError | null;
  lastFetch?: number;
  stale?: boolean;
}

/**
 * Collection state tracking
 */
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

/**
 * Subscription cleanup function
 */
export type Unsubscribe = () => void;

/**
 * Store event types
 */
export enum StoreEventType {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  BATCH_UPDATED = 'batch_updated',
  ERROR = 'error',
  LOADING_START = 'loading_start',
  LOADING_END = 'loading_end',
}

/**
 * Store event payload
 */
export interface StoreEvent<T = any> {
  type: StoreEventType;
  payload: T;
  timestamp: number;
  source?: string;
}

/**
 * Cache entry for store data
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number;
  tags?: string[];
}

/**
 * Store subscription callback
 */
export type StoreSubscriber<T> = (value: T) => void;

/**
 * Store lifecycle hooks
 */
export interface StoreLifecycle {
  onInit?: () => void | Promise<void>;
  onDestroy?: () => void;
  onError?: (error: StoreError) => void;
  onStale?: () => void;
}

/**
 * Store configuration
 */
export interface StoreConfig {
  /**
   * Enable persistence to localStorage
   */
  persistent?: boolean;
  
  /**
   * Persistence key for localStorage
   */
  persistKey?: string;
  
  /**
   * Time-to-live in milliseconds for cached data
   */
  ttl?: number;
  
  /**
   * Enable automatic refresh
   */
  autoRefresh?: boolean;
  
  /**
   * Refresh interval in milliseconds
   */
  refreshInterval?: number;
  
  /**
   * Enable optimistic updates
   */
  optimistic?: boolean;
  
  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * Query parameters for fetching resources
 */
export interface QueryParams {
  filters?: FilterConfig[];
  sort?: SortConfig;
  pagination?: PaginationConfig;
  include?: string[];
  fields?: string[];
}

/**
 * Optimistic update context
 */
export interface OptimisticUpdate<T> {
  id: string;
  previousValue: T;
  newValue: T;
  rollback: () => void;
}
