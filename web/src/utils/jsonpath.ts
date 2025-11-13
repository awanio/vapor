/**
 * Simple JSONPath evaluator for Kubernetes CRD additionalPrinterColumns
 * Supports a subset of JSONPath expressions commonly used in CRDs
 */

/**
 * Evaluates a JSONPath expression against a JSON object
 * @param obj The object to query
 * @param path The JSONPath expression (e.g., ".metadata.name", ".status.conditions[?(@.type=='Ready')].status")
 * @returns The value at the path, or undefined if not found
 */
export function evaluateJSONPath(obj: any, path: string): any {
  if (!obj || !path) {
    return undefined;
  }

  // Remove leading dot if present
  const cleanPath = path.startsWith('.') ? path.substring(1) : path;

  // Handle simple paths (no filters, no array notation)
  if (!cleanPath.includes('[')) {
    return evaluateSimplePath(obj, cleanPath);
  }

  // Handle array filter expressions like: status.conditions[?(@.type=='Ready')].status
  const filterMatch = cleanPath.match(/^(.*?)\[?\??\((@\.[\w]+)==['"]?(.*?)['"]?\)\]\.?(.*)$/);
  if (filterMatch) {
    const [, beforeFilter, filterKey, filterValue, afterFilter] = filterMatch;
    
    if (!filterKey) return undefined;
    
    // Navigate to the array
    let current = beforeFilter ? evaluateSimplePath(obj, beforeFilter) : obj;
    
    if (!Array.isArray(current)) {
      return undefined;
    }

    // Filter the array
    const cleanFilterKey = filterKey.substring(2); // Remove "@."
    const filtered = current.filter((item: any) => {
      const itemValue = evaluateSimplePath(item, cleanFilterKey);
      return itemValue === filterValue || String(itemValue) === String(filterValue);
    });

    // If there's a path after the filter, evaluate it on the first match
    if (afterFilter && filtered.length > 0) {
      return evaluateSimplePath(filtered[0], afterFilter);
    }

    // Return the first match or undefined
    return filtered.length > 0 ? filtered[0] : undefined;
  }

  // Handle simple array index like: items[0].name
  const indexMatch = cleanPath.match(/^(.*?)\[(\d+)\]\.?(.*)$/);
  if (indexMatch) {
    const [, beforeIndex, index, afterIndex] = indexMatch;
    
    if (!index) return undefined;
    
    let current = beforeIndex ? evaluateSimplePath(obj, beforeIndex) : obj;
    
    if (!Array.isArray(current)) {
      return undefined;
    }

    const item = current[parseInt(index, 10)];
    if (!item) {
      return undefined;
    }

    return afterIndex ? evaluateSimplePath(item, afterIndex) : item;
  }

  // Fallback to simple path
  return evaluateSimplePath(obj, cleanPath);
}

/**
 * Evaluates a simple dot-notation path (no arrays or filters)
 */
function evaluateSimplePath(obj: any, path: string): any {
  if (!path) {
    return obj;
  }

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Formats a value according to its type for display
 * @param value The value to format
 * @param type The type from additionalPrinterColumns (string, date, integer, boolean)
 * @returns Formatted string
 */
export function formatColumnValue(value: any, type: string): string {
  if (value === null || value === undefined) {
    return '-';
  }

  switch (type) {
    case 'date':
      // Format date to relative time (e.g., "2d", "3h")
      try {
        const date = new Date(value);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
          return `${diffDays}d ${diffHours % 24}h`;
        } else if (diffHours > 0) {
          return `${diffHours}h ${diffMinutes % 60}m`;
        } else if (diffMinutes > 0) {
          return `${diffMinutes}m`;
        } else {
          return `${diffSeconds}s`;
        }
      } catch {
        return String(value);
      }

    case 'integer':
    case 'number':
      return String(value);

    case 'boolean':
      return value ? 'True' : 'False';

    case 'string':
    default:
      return String(value);
  }
}
