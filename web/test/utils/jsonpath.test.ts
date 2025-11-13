import { describe, it, expect } from 'vitest';
import { evaluateJSONPath, formatColumnValue } from '../../src/utils/jsonpath';

describe('JSONPath Utility', () => {
  describe('evaluateJSONPath', () => {
    const testObject = {
      metadata: {
        name: 'test-vm',
        creationTimestamp: '2023-01-01T00:00:00Z',
        namespace: 'default',
      },
      status: {
        printableStatus: 'Running',
        phase: 'Active',
        conditions: [
          { type: 'Ready', status: 'True', reason: 'AllChecksPass' },
          { type: 'Progressing', status: 'False', reason: 'NoUpdate' },
        ],
      },
      spec: {
        replicas: 3,
      },
    };

    it('should evaluate simple path', () => {
      expect(evaluateJSONPath(testObject, '.metadata.name')).toBe('test-vm');
      expect(evaluateJSONPath(testObject, '.metadata.namespace')).toBe('default');
    });

    it('should evaluate nested path', () => {
      expect(evaluateJSONPath(testObject, '.status.printableStatus')).toBe('Running');
      expect(evaluateJSONPath(testObject, '.status.phase')).toBe('Active');
    });

    it('should evaluate path without leading dot', () => {
      expect(evaluateJSONPath(testObject, 'metadata.name')).toBe('test-vm');
      expect(evaluateJSONPath(testObject, 'spec.replicas')).toBe(3);
    });

    it('should evaluate array index', () => {
      expect(evaluateJSONPath(testObject, '.status.conditions[0].type')).toBe('Ready');
      expect(evaluateJSONPath(testObject, '.status.conditions[1].type')).toBe('Progressing');
    });

    it('should evaluate array filter with condition', () => {
      const result = evaluateJSONPath(testObject, ".status.conditions[?(@.type=='Ready')].status");
      expect(result).toBe('True');
    });

    it('should return undefined for non-existent path', () => {
      expect(evaluateJSONPath(testObject, '.metadata.nonexistent')).toBeUndefined();
      expect(evaluateJSONPath(testObject, '.status.invalid.path')).toBeUndefined();
    });
  });

  describe('formatColumnValue', () => {
    it('should format string values', () => {
      expect(formatColumnValue('test', 'string')).toBe('test');
      expect(formatColumnValue('Running', 'string')).toBe('Running');
    });

    it('should format boolean values', () => {
      expect(formatColumnValue(true, 'boolean')).toBe('True');
      expect(formatColumnValue(false, 'boolean')).toBe('False');
    });

    it('should handle undefined values', () => {
      expect(formatColumnValue(undefined, 'string')).toBe('-');
      expect(formatColumnValue(undefined, 'boolean')).toBe('-');
    });
  });
});
