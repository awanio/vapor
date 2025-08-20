import { atom, computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import { StoreEventType } from '../types';
export function createStore(options) {
    const { name, initialData = [], idField = 'id', persistent = false, persistKey, debug = false, } = options;
    const initialMap = new Map();
    initialData.forEach(item => {
        initialMap.set(String(item[idField]), item);
    });
    const createAtom = (key, initialValue) => {
        if (persistent && persistKey) {
            return persistentAtom(`${persistKey}.${key}`, initialValue, {
                encode: JSON.stringify,
                decode: JSON.parse,
            });
        }
        return atom(initialValue);
    };
    const $items = createAtom(`${name}.items`, initialMap);
    const $loading = atom(false);
    const $error = atom(null);
    const $filters = atom([]);
    const $sort = atom(null);
    const $pagination = atom(null);
    const eventHandlers = new Map();
    const emit = (event) => {
        if (debug) {
            console.log(`[${name}] Event:`, event);
        }
        const handlers = eventHandlers.get(event.type);
        if (handlers) {
            handlers.forEach(handler => handler(event));
        }
    };
    const on = (eventType, handler) => {
        if (!eventHandlers.has(eventType)) {
            eventHandlers.set(eventType, new Set());
        }
        eventHandlers.get(eventType).add(handler);
        return () => {
            const handlers = eventHandlers.get(eventType);
            if (handlers) {
                handlers.delete(handler);
            }
        };
    };
    const applyFilters = (items, filters) => {
        if (filters.length === 0)
            return items;
        return items.filter(item => {
            return filters.every(filter => {
                const value = item[filter.field];
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
    const applySort = (items, sort) => {
        if (!sort)
            return items;
        return [...items].sort((a, b) => {
            const aValue = a[sort.field];
            const bValue = b[sort.field];
            if (options.comparator) {
                return options.comparator(a, b) * (sort.direction === 'desc' ? -1 : 1);
            }
            if (aValue < bValue)
                return sort.direction === 'asc' ? -1 : 1;
            if (aValue > bValue)
                return sort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    };
    const applyPagination = (items, pagination) => {
        if (!pagination)
            return items;
        const start = (pagination.page - 1) * pagination.pageSize;
        const end = start + pagination.pageSize;
        return items.slice(start, end);
    };
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
    const $state = computed([$items, $loading, $error, $filters, $sort, $pagination], (items, loading, error, filters, sort, pagination) => ({
        items,
        loading,
        error,
        filters,
        sort,
        pagination,
        lastFetch: Date.now(),
        stale: false,
    }));
    const getById = (id) => {
        return $items.get().get(id);
    };
    const exists = (id) => {
        return $items.get().has(id);
    };
    const validate = (item) => {
        if (options.validate) {
            return options.validate(item);
        }
        return true;
    };
    const create = async (item) => {
        try {
            $loading.set(true);
            const validation = validate(item);
            if (validation !== true) {
                throw validation;
            }
            const id = item[idField] || crypto.randomUUID();
            const newItem = { ...item, [idField]: id };
            const items = new Map($items.get());
            items.set(String(id), newItem);
            $items.set(items);
            emit({
                type: StoreEventType.CREATED,
                payload: newItem,
                timestamp: Date.now(),
            });
            return { success: true, data: newItem };
        }
        catch (error) {
            const storeError = {
                code: 'CREATE_ERROR',
                message: error instanceof Error ? error.message : 'Failed to create item',
                timestamp: Date.now(),
            };
            $error.set(storeError);
            emit({
                type: StoreEventType.ERROR,
                payload: storeError,
                timestamp: Date.now(),
            });
            return { success: false, error: storeError };
        }
        finally {
            $loading.set(false);
        }
    };
    const read = async (id) => {
        try {
            const item = getById(id);
            if (!item) {
                throw new Error(`Item with id ${id} not found`);
            }
            return { success: true, data: item };
        }
        catch (error) {
            const storeError = {
                code: 'READ_ERROR',
                message: error instanceof Error ? error.message : 'Failed to read item',
                timestamp: Date.now(),
            };
            return { success: false, error: storeError };
        }
    };
    const update = async (id, updates) => {
        try {
            $loading.set(true);
            const existingItem = getById(id);
            if (!existingItem) {
                throw new Error(`Item with id ${id} not found`);
            }
            const updatedItem = { ...existingItem, ...updates };
            const validation = validate(updatedItem);
            if (validation !== true) {
                throw validation;
            }
            const items = new Map($items.get());
            items.set(id, updatedItem);
            $items.set(items);
            emit({
                type: StoreEventType.UPDATED,
                payload: updatedItem,
                timestamp: Date.now(),
            });
            return { success: true, data: updatedItem };
        }
        catch (error) {
            const storeError = {
                code: 'UPDATE_ERROR',
                message: error instanceof Error ? error.message : 'Failed to update item',
                timestamp: Date.now(),
            };
            $error.set(storeError);
            emit({
                type: StoreEventType.ERROR,
                payload: storeError,
                timestamp: Date.now(),
            });
            return { success: false, error: storeError };
        }
        finally {
            $loading.set(false);
        }
    };
    const deleteItem = async (id) => {
        try {
            $loading.set(true);
            if (!exists(id)) {
                throw new Error(`Item with id ${id} not found`);
            }
            const items = new Map($items.get());
            const deletedItem = items.get(id);
            items.delete(id);
            $items.set(items);
            emit({
                type: StoreEventType.DELETED,
                payload: deletedItem,
                timestamp: Date.now(),
            });
            return { success: true, data: true };
        }
        catch (error) {
            const storeError = {
                code: 'DELETE_ERROR',
                message: error instanceof Error ? error.message : 'Failed to delete item',
                timestamp: Date.now(),
            };
            $error.set(storeError);
            emit({
                type: StoreEventType.ERROR,
                payload: storeError,
                timestamp: Date.now(),
            });
            return { success: false, error: storeError };
        }
        finally {
            $loading.set(false);
        }
    };
    const createMany = async (items) => {
        const succeeded = [];
        const failed = [];
        for (const item of items) {
            const result = await create(item);
            if (result.success && result.data) {
                succeeded.push(result.data);
            }
            else if (result.error) {
                failed.push({ item: item, error: result.error });
            }
        }
        return { succeeded, failed };
    };
    const updateMany = async (updates) => {
        const succeeded = [];
        const failed = [];
        for (const { id, data } of updates) {
            const result = await update(id, data);
            if (result.success && result.data) {
                succeeded.push(result.data);
            }
            else if (result.error) {
                const item = getById(id);
                if (item) {
                    failed.push({ item, error: result.error });
                }
            }
        }
        emit({
            type: StoreEventType.BATCH_UPDATED,
            payload: succeeded,
            timestamp: Date.now(),
        });
        return { succeeded, failed };
    };
    const deleteMany = async (ids) => {
        const succeeded = [];
        const failed = [];
        for (const id of ids) {
            const result = await deleteItem(id);
            if (result.success) {
                succeeded.push(id);
            }
            else if (result.error) {
                failed.push({ item: id, error: result.error });
            }
        }
        return { succeeded, failed };
    };
    const fetch = async (params) => {
        if (params?.filters) {
            $filters.set(params.filters);
        }
        if (params?.sort) {
            $sort.set(params.sort);
        }
        if (params?.pagination) {
            $pagination.set(params.pagination);
        }
    };
    const refresh = async () => {
        await fetch();
    };
    const clear = () => {
        $items.set(new Map());
        $error.set(null);
        $filters.set([]);
        $sort.set(null);
        $pagination.set(null);
    };
    const setFilters = (filters) => {
        $filters.set(filters);
    };
    const addFilter = (filter) => {
        const filters = [...$filters.get(), filter];
        $filters.set(filters);
    };
    const removeFilter = (field) => {
        const filters = $filters.get().filter(f => f.field !== field);
        $filters.set(filters);
    };
    const clearFilters = () => {
        $filters.set([]);
    };
    const setSort = (sort) => {
        $sort.set(sort);
    };
    const setPagination = (pagination) => {
        $pagination.set(pagination);
    };
    const optimisticUpdate = (id, updates) => {
        const previousValue = getById(id);
        const newValue = { ...previousValue, ...updates };
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
    const rollback = (update) => {
        update.rollback();
    };
    const destroy = () => {
        clear();
        eventHandlers.clear();
    };
    return {
        $items,
        $loading,
        $error,
        $filters,
        $sort,
        $pagination,
        $filteredItems,
        $sortedItems,
        $paginatedItems,
        $count,
        $isEmpty,
        $state,
        create,
        read,
        update,
        delete: deleteItem,
        createMany,
        updateMany,
        deleteMany,
        fetch,
        refresh,
        clear,
        setFilters,
        addFilter,
        removeFilter,
        clearFilters,
        setSort,
        setPagination,
        optimisticUpdate,
        rollback,
        getById,
        exists,
        validate,
        on,
        emit,
        destroy,
    };
}
//# sourceMappingURL=factory.js.map