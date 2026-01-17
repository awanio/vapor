/**
 * Base store factory for creating type-safe stores with CRUD operations
 */

import { atom, computed, WritableAtom, ReadableAtom } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import type {
  BaseEntity,
  CollectionState,
  // ResourceState,  // TODO: Use for resource state tracking in future
  StoreConfig,
  StoreError,
  CrudResult,
  BatchResult,
  QueryParams,
  OptimisticUpdate,
  StoreEvent,
  FilterConfig,
  SortConfig,
  PaginationConfig,
} from '../types';

// Import StoreEventType as a value, not just a type
import { StoreEventType } from '../types';
import { generateUUID } from '../../utils/uuid';

/**
 * Store factory options
 */
export interface StoreFactoryOptions<T extends BaseEntity> extends StoreConfig {
  /**
   * Store name for debugging and persistence
   */
  name: string;
  
  /**
   * Initial data
   */
  initialData?: T[];
  
  /**
   * Custom ID field (default: 'id')
   */
  idField?: keyof T;
  
  /**
   * API endpoint for CRUD operations
   */
  endpoint?: string;
  
  /**
   * Transform function for API responses
   */
  transform?: (data: any) => T;
  
  /**
   * Validation function
   */
  validate?: (item: T) => boolean | StoreError;
  
  /**
   * Custom comparator for sorting
   */
  comparator?: (a: T, b: T) => number;
}

/**
 * CRUD store interface
 */
export interface CrudStore<T extends BaseEntity> {
  // State atoms
  $items: WritableAtom<Map<string, T>>;
  $loading: WritableAtom<boolean>;
  $error: WritableAtom<StoreError | null>;
  $filters: WritableAtom<FilterConfig[]>;
  $sort: WritableAtom<SortConfig | null>;
  $pagination: WritableAtom<PaginationConfig | null>;
  
  // Computed atoms
  $filteredItems: ReadableAtom<T[]>;
  $sortedItems: ReadableAtom<T[]>;
  $paginatedItems: ReadableAtom<T[]>;
  $count: ReadableAtom<number>;
  $isEmpty: ReadableAtom<boolean>;
  $state: ReadableAtom<CollectionState<T>>;
  
  // CRUD operations
  create: (item: Partial<T>) => Promise<CrudResult<T>>;
  read: (id: string) => Promise<CrudResult<T>>;
  update: (id: string, updates: Partial<T>) => Promise<CrudResult<T>>;
  delete: (id: string) => Promise<CrudResult<boolean>>;
  
  // Batch operations
  createMany: (items: Partial<T>[]) => Promise<BatchResult<T>>;
  updateMany: (updates: Array<{ id: string; data: Partial<T> }>) => Promise<BatchResult<T>>;
  deleteMany: (ids: string[]) => Promise<BatchResult<string>>;
  
  // Query operations
  fetch: (params?: QueryParams) => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;
  
  // Filtering and sorting
  setFilters: (filters: FilterConfig[]) => void;
  addFilter: (filter: FilterConfig) => void;
  removeFilter: (field: string) => void;
  clearFilters: () => void;
  setSort: (sort: SortConfig | null) => void;
  setPagination: (pagination: PaginationConfig | null) => void;
  
  // Optimistic updates
  optimisticUpdate: (id: string, updates: Partial<T>) => OptimisticUpdate<T>;
  rollback: (update: OptimisticUpdate<T>) => void;
  
  // Utilities
  getById: (id: string) => T | undefined;
  exists: (id: string) => boolean;
  validate: (item: Partial<T>) => boolean | StoreError;
  
  // Event handling
  on: (event: StoreEventType, handler: (event: StoreEvent<T>) => void) => () => void;
  emit: (event: StoreEvent<T>) => void;
  
  // Lifecycle
  destroy: () => void;
}

/**
 * Create a CRUD store factory
 */
export function createStore<T extends BaseEntity>(
  options: StoreFactoryOptions<T>
): CrudStore<T> {
  const {
    name,
    initialData = [],
    idField = 'id' as keyof T,
    persistent = false,
    persistKey,
    debug = false,
  } = options;

  // Initialize state atoms
  const initialMap = new Map<string, T>();
  initialData.forEach(item => {
    initialMap.set(String(item[idField]), item);
  });

  // Create atoms based on persistence configuration
  const createAtom = <V>(key: string, initialValue: V): WritableAtom<V> => {
    if (persistent && persistKey) {
      return persistentAtom(`${persistKey}.${key}`, initialValue, {
        encode: JSON.stringify,
        decode: JSON.parse,
      });
    }
    return atom(initialValue);
  };

  // State atoms
  const $items = createAtom(`${name}.items`, initialMap);
  const $loading = atom(false);
  const $error = atom<StoreError | null>(null);
  const $filters = atom<FilterConfig[]>([]);
  const $sort = atom<SortConfig | null>(null);
  const $pagination = atom<PaginationConfig | null>(null);

  // Event emitter
  const eventHandlers = new Map<StoreEventType, Set<(event: StoreEvent<T>) => void>>();

  const emit = (event: StoreEvent<T>) => {
    if (debug) {
      console.log(`[${name}] Event:`, event);
    }
    const handlers = eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }
  };

  const on = (eventType: StoreEventType, handler: (event: StoreEvent<T>) => void) => {
    if (!eventHandlers.has(eventType)) {
      eventHandlers.set(eventType, new Set());
    }
    eventHandlers.get(eventType)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = eventHandlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  };

  // Filter function
  const applyFilters = (items: T[], filters: FilterConfig[]): T[] => {
    if (filters.length === 0) return items;

    return items.filter(item => {
      return filters.every(filter => {
        const value = (item as any)[filter.field];
        const filterValue = filter.value;

        switch (filter.operator) {
          case 'eq':
            return value === filterValue;
          case 'neq':
            return value !== filterValue;
          case 'gt':
            return value > filterValue;
          case 'lt':
            return value < filterValue;
          case 'gte':
            return value >= filterValue;
          case 'lte':
            return value <= filterValue;
          case 'contains':
            return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
          case 'in':
            return Array.isArray(filterValue) && filterValue.includes(value);
          default:
            return true;
        }
      });
    });
  };

  // Sort function
  const applySort = (items: T[], sort: SortConfig | null): T[] => {
    if (!sort) return items;

    return [...items].sort((a, b) => {
      const aValue = (a as any)[sort.field];
      const bValue = (b as any)[sort.field];

      if (options.comparator) {
        return options.comparator(a, b) * (sort.direction === 'desc' ? -1 : 1);
      }

      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Pagination function
  const applyPagination = (items: T[], pagination: PaginationConfig | null): T[] => {
    if (!pagination) return items;

    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return items.slice(start, end);
  };

  // Computed atoms
  const $filteredItems = computed([$items, $filters], (items, filters) => {
    return applyFilters(Array.from(items.values()), filters);
  });

  const $sortedItems = computed([$filteredItems, $sort], (items, sort) => {
    return applySort(items, sort);
  });

  const $paginatedItems = computed([$sortedItems, $pagination], (items, pagination) => {
    return applyPagination(items, pagination);
  });

  const $count = computed($items, items => items.size);

  const $isEmpty = computed($count, count => count === 0);

  const $state = computed(
    [$items, $loading, $error, $filters, $sort, $pagination],
    (items, loading, error, filters, sort, pagination): CollectionState<T> => ({
      items,
      loading,
      error,
      filters,
      sort,
      pagination,
      lastFetch: Date.now(),
      stale: false,
    })
  );

  // Helper functions
  const getById = (id: string): T | undefined => {
    return $items.get().get(id);
  };

  const exists = (id: string): boolean => {
    return $items.get().has(id);
  };

  const validate = (item: Partial<T>): boolean | StoreError => {
    if (options.validate) {
      return options.validate(item as T);
    }
    return true;
  };

  // CRUD operations
  const create = async (item: Partial<T>): Promise<CrudResult<T>> => {
    try {
      $loading.set(true);
      
      // Validate
      const validation = validate(item);
      if (validation !== true) {
        throw validation;
      }

      // Generate ID if not provided
      const id = item[idField] || generateUUID();
      const newItem = { ...item, [idField]: id } as unknown as T;

      // Update store
      const items = new Map($items.get());
      items.set(String(id), newItem);
      $items.set(items);

      emit({
        type: StoreEventType.CREATED,
        payload: newItem,
        timestamp: Date.now(),
      });

      return { success: true, data: newItem };
    } catch (error) {
      const storeError: StoreError = {
        code: 'CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create item',
        timestamp: Date.now(),
      };
      $error.set(storeError);
      emit({
        type: StoreEventType.ERROR,
        payload: storeError as any,  // TODO: Fix type inference for error events
        timestamp: Date.now(),
      });
      return { success: false, error: storeError };
    } finally {
      $loading.set(false);
    }
  };

  const read = async (id: string): Promise<CrudResult<T>> => {
    try {
      const item = getById(id);
      if (!item) {
        throw new Error(`Item with id ${id} not found`);
      }
      return { success: true, data: item };
    } catch (error) {
      const storeError: StoreError = {
        code: 'READ_ERROR',
        message: error instanceof Error ? error.message : 'Failed to read item',
        timestamp: Date.now(),
      };
      return { success: false, error: storeError };
    }
  };

  const update = async (id: string, updates: Partial<T>): Promise<CrudResult<T>> => {
    try {
      $loading.set(true);
      
      const existingItem = getById(id);
      if (!existingItem) {
        throw new Error(`Item with id ${id} not found`);
      }

      const updatedItem = { ...existingItem, ...updates };
      
      // Validate
      const validation = validate(updatedItem);
      if (validation !== true) {
        throw validation;
      }

      // Update store
      const items = new Map($items.get());
      items.set(id, updatedItem);
      $items.set(items);

      emit({
        type: StoreEventType.UPDATED,
        payload: updatedItem,
        timestamp: Date.now(),
      });

      return { success: true, data: updatedItem };
    } catch (error) {
      const storeError: StoreError = {
        code: 'UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update item',
        timestamp: Date.now(),
      };
      $error.set(storeError);
      emit({
        type: StoreEventType.ERROR,
        payload: storeError as any,  // TODO: Fix type inference for error events
        timestamp: Date.now(),
      });
      return { success: false, error: storeError };
    } finally {
      $loading.set(false);
    }
  };

  const deleteItem = async (id: string): Promise<CrudResult<boolean>> => {
    try {
      $loading.set(true);
      
      if (!exists(id)) {
        throw new Error(`Item with id ${id} not found`);
      }

      // Delete from store
      const items = new Map($items.get());
      const deletedItem = items.get(id);
      items.delete(id);
      $items.set(items);

      emit({
        type: StoreEventType.DELETED,
        payload: deletedItem as any,  // TODO: Fix type inference for delete events
        timestamp: Date.now(),
      });

      return { success: true, data: true };
    } catch (error) {
      const storeError: StoreError = {
        code: 'DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete item',
        timestamp: Date.now(),
      };
      $error.set(storeError);
      emit({
        type: StoreEventType.ERROR,
        payload: storeError as any,  // TODO: Fix type inference for error events
        timestamp: Date.now(),
      });
      return { success: false, error: storeError };
    } finally {
      $loading.set(false);
    }
  };

  // Batch operations
  const createMany = async (items: Partial<T>[]): Promise<BatchResult<T>> => {
    const succeeded: T[] = [];
    const failed: Array<{ item: T; error: StoreError }> = [];

    for (const item of items) {
      const result = await create(item);
      if (result.success && result.data) {
        succeeded.push(result.data);
      } else if (result.error) {
        failed.push({ item: item as T, error: result.error });
      }
    }

    return { succeeded, failed };
  };

  const updateMany = async (
    updates: Array<{ id: string; data: Partial<T> }>
  ): Promise<BatchResult<T>> => {
    const succeeded: T[] = [];
    const failed: Array<{ item: T; error: StoreError }> = [];

    for (const { id, data } of updates) {
      const result = await update(id, data);
      if (result.success && result.data) {
        succeeded.push(result.data);
      } else if (result.error) {
        const item = getById(id);
        if (item) {
          failed.push({ item, error: result.error });
        }
      }
    }

    emit({
      type: StoreEventType.BATCH_UPDATED,
      payload: succeeded as any,  // TODO: Fix type inference for batch events
      timestamp: Date.now(),
    });

    return { succeeded, failed };
  };

  const deleteMany = async (ids: string[]): Promise<BatchResult<string>> => {
    const succeeded: string[] = [];
    const failed: Array<{ item: string; error: StoreError }> = [];

    for (const id of ids) {
      const result = await deleteItem(id);
      if (result.success) {
        succeeded.push(id);
      } else if (result.error) {
        failed.push({ item: id, error: result.error });
      }
    }

    return { succeeded, failed };
  };

  // Query operations
  const fetch = async (params?: QueryParams): Promise<void> => {
    if (params?.filters) {
      $filters.set(params.filters);
    }
    if (params?.sort) {
      $sort.set(params.sort);
    }
    if (params?.pagination) {
      $pagination.set(params.pagination);
    }
    // In a real implementation, this would fetch from API
  };

  const refresh = async (): Promise<void> => {
    await fetch();
  };

  const clear = (): void => {
    $items.set(new Map());
    $error.set(null);
    $filters.set([]);
    $sort.set(null);
    $pagination.set(null);
  };

  // Filtering and sorting
  const setFilters = (filters: FilterConfig[]): void => {
    $filters.set(filters);
  };

  const addFilter = (filter: FilterConfig): void => {
    const filters = [...$filters.get(), filter];
    $filters.set(filters);
  };

  const removeFilter = (field: string): void => {
    const filters = $filters.get().filter(f => f.field !== field);
    $filters.set(filters);
  };

  const clearFilters = (): void => {
    $filters.set([]);
  };

  const setSort = (sort: SortConfig | null): void => {
    $sort.set(sort);
  };

  const setPagination = (pagination: PaginationConfig | null): void => {
    $pagination.set(pagination);
  };

  // Optimistic updates
  const optimisticUpdate = (id: string, updates: Partial<T>): OptimisticUpdate<T> => {
    const previousValue = getById(id)!;
    const newValue = { ...previousValue, ...updates };
    
    // Apply optimistic update
    const items = new Map($items.get());
    items.set(id, newValue);
    $items.set(items);

    return {
      id,
      previousValue,
      newValue,
      rollback: () => {
        const items = new Map($items.get());
        items.set(id, previousValue);
        $items.set(items);
      },
    };
  };

  const rollback = (update: OptimisticUpdate<T>): void => {
    update.rollback();
  };

  // Lifecycle
  const destroy = (): void => {
    clear();
    eventHandlers.clear();
  };

  return {
    // State atoms
    $items,
    $loading,
    $error,
    $filters,
    $sort,
    $pagination,
    
    // Computed atoms
    $filteredItems,
    $sortedItems,
    $paginatedItems,
    $count,
    $isEmpty,
    $state,
    
    // CRUD operations
    create,
    read,
    update,
    delete: deleteItem,
    
    // Batch operations
    createMany,
    updateMany,
    deleteMany,
    
    // Query operations
    fetch,
    refresh,
    clear,
    
    // Filtering and sorting
    setFilters,
    addFilter,
    removeFilter,
    clearFilters,
    setSort,
    setPagination,
    
    // Optimistic updates
    optimisticUpdate,
    rollback,
    
    // Utilities
    getById,
    exists,
    validate,
    
    // Event handling
    on,
    emit,
    
    // Lifecycle
    destroy,
  };
}
