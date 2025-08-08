# Kubernetes Tab Component Refactoring

This directory contains reusable components extracted from the monolithic `kubernetes-tab.ts` file. The refactoring improves maintainability, reusability, and testability of the codebase.

## Component Structure

### UI Components (`/ui`)

#### StatusBadge
- **Purpose**: Displays resource status with color-coded badges
- **Props**: `status`, `text`
- **Usage**: `<status-badge status="running"></status-badge>`

#### ActionDropdown
- **Purpose**: Provides a dropdown menu for resource actions
- **Props**: `actions`, `menuId`
- **Events**: `action-click`
- **Usage**: 
```html
<action-dropdown 
  .actions="${[{label: 'Delete', action: 'delete', danger: true}]}"
  @action-click="${handleAction}"
></action-dropdown>
```

#### SearchInput
- **Purpose**: Reusable search input with icon
- **Props**: `value`, `placeholder`, `width`, `disabled`
- **Events**: `search-change`
- **Usage**: `<search-input @search-change="${handleSearch}"></search-input>`

#### EmptyState
- **Purpose**: Shows when no data is available
- **Props**: `message`, `icon`, `actionLabel`
- **Events**: `action-click`

#### LoadingState
- **Purpose**: Shows loading spinner with message
- **Props**: `message`

#### NamespaceDropdown
- **Purpose**: Dropdown for filtering Kubernetes resources by namespace
- **Props**: `namespaces`, `selectedNamespace`, `loading`, `showCounts`, `includeAllOption`
- **Events**: `namespace-change`
- **Features**: Search functionality, optional resource counts, "All Namespaces" option
- **Usage**: 
```html
<namespace-dropdown
  .namespaces="${namespaces}"
  .selectedNamespace="${currentNamespace}"
  @namespace-change="${handleNamespaceChange}"
></namespace-dropdown>
```

#### NotificationContainer
- **Purpose**: Container for displaying toast notifications
- **Props**: `notifications`, `defaultDuration`, `maxNotifications`
- **Events**: `notification-closed`
- **Methods**: `addNotification()`, `removeAllNotifications()`
- **Usage**:
```javascript
const container = this.shadowRoot.querySelector('notification-container');
container.addNotification({
  type: 'success',
  message: 'Resource created successfully',
  duration: 5000
});
```

### Drawer Components (`/drawers`)

#### DetailDrawer
- **Purpose**: Base drawer component for showing resource details
- **Props**: `title`, `show`, `loading`, `width`
- **Events**: `close`
- **Usage**: 
```html
<detail-drawer 
  .show="${showDetails}" 
  title="Pod Details"
  @close="${handleClose}"
>
  <!-- Content goes here -->
</detail-drawer>
```

#### LogsDrawer
- **Purpose**: Specialized drawer for viewing pod/container logs
- **Props**: `show`, `title`, `subtitle`, `logs`, `loading`, `error`, `autoScroll`, `showTimestamps`, `colorize`
- **Events**: `close`, `refresh`
- **Features**: 
  - Real-time log following
  - Search functionality
  - Syntax highlighting for log levels
  - Auto-scroll toggle
  - Clear logs function
- **Usage**:
```html
<logs-drawer
  .show="${showLogs}"
  .title="Pod Logs"
  .subtitle="${podName}"
  .logs="${logContent}"
  @close="${handleClose}"
  @refresh="${fetchLogs}"
></logs-drawer>
```

#### CreateResourceDrawer
- **Purpose**: Drawer for creating Kubernetes resources via YAML/JSON
- **Props**: `show`, `title`, `value`, `loading`, `error`, `format`
- **Events**: `close`, `create`
- **Features**:
  - YAML/JSON format toggle
  - Real-time validation
  - Quick templates for common resources
  - Syntax highlighting
- **Usage**:
```html
<create-resource-drawer
  .show="${showCreate}"
  @close="${handleClose}"
  @create="${handleCreate}"
></create-resource-drawer>
```

### Modal Components (`/modals`)

#### DeleteModal
- **Purpose**: Confirmation modal for resource deletion
- **Props**: `item`, `show`, `loading`
- **Events**: `confirm-delete`, `cancel-delete`

### Table Components (`/tables`)

#### ResourceTable
- **Purpose**: Generic table for displaying Kubernetes resources
- **Props**: `columns`, `data`, `emptyMessage`, `showActions`, `getActions`
- **Events**: `cell-click`, `action`
- **Features**:
  - Supports different column types (text, status, link, custom)
  - Built-in action dropdown
  - Empty state handling
  - Customizable actions per row

### Tab Components (`/tabs`)

#### TabGroup
- **Purpose**: Reusable tab navigation
- **Props**: `tabs`, `activeTab`
- **Events**: `tab-change`

## Usage Example

See `src/views/kubernetes/kubernetes-workloads.ts` for a complete example of how these components work together to create a feature-complete Kubernetes resource view.

## Benefits

1. **Reusability**: Components can be used across different views
2. **Maintainability**: Smaller, focused components are easier to understand
3. **Testing**: Individual components can be tested in isolation
4. **Performance**: Better code splitting opportunities
5. **Type Safety**: Strong TypeScript interfaces for each component

## Migration Guide

To migrate existing code to use these components:

1. Replace inline status spans with `<status-badge>`
2. Replace action menu HTML with `<action-dropdown>`
3. Replace table HTML with `<resource-table>`
4. Replace drawer HTML with `<detail-drawer>`
5. Replace delete confirmation with `<delete-modal>`
6. Use `<tab-group>` for tab navigation
7. Use `<search-input>` for search functionality

## Next Steps

1. ~~Create more specialized components:~~ ✅ COMPLETED
   - ~~`namespace-dropdown` - For namespace selection~~ ✅
   - ~~`logs-drawer` - Specialized drawer for logs~~ ✅
   - ~~`create-resource-drawer` - For resource creation~~ ✅
   - ~~`notification-container` - For notifications~~ ✅

2. Extract detail content components:
   - `resource-detail` - Base component for details
   - `detail-section` - Section within details
   - `detail-item` - Individual detail items

3. Create feature-specific views:
   - `kubernetes-networks`
   - `kubernetes-storage`
   - `kubernetes-configurations`
   - `kubernetes-helm`
   - `kubernetes-nodes`
   - `kubernetes-crds`

4. Implement shared services:
   - Resource fetch service
   - Notification service
   - Validation service
