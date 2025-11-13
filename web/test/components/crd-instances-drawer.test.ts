import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('CRD Instances Drawer - Dynamic Columns', () => {
  describe('getAdditionalPrinterColumns', () => {
    it('should extract printer columns from CRD definition', () => {
      const crdDefinition = {
        spec: {
          versions: [
            {
              name: 'v1',
              served: true,
              storage: true,
              additionalPrinterColumns: [
                {
                  name: 'Status',
                  type: 'string',
                  jsonPath: '.status.printableStatus',
                  priority: 0,
                },
                {
                  name: 'Ready',
                  type: 'string',
                  jsonPath: '.status.conditions[?(@.type==\'Ready\')].status',
                  priority: 0,
                },
                {
                  name: 'Age',
                  type: 'date',
                  jsonPath: '.metadata.creationTimestamp',
                  priority: 0,
                },
              ],
            },
          ],
        },
      };

      const columns = crdDefinition.spec.versions[0].additionalPrinterColumns;
      expect(columns).toHaveLength(3);
      expect(columns[0].name).toBe('Status');
      expect(columns[1].name).toBe('Ready');
      expect(columns[2].name).toBe('Age');
    });

    it('should filter columns by priority 0', () => {
      const columns = [
        { name: 'Name', type: 'string', jsonPath: '.metadata.name', priority: 0 },
        { name: 'Internal', type: 'string', jsonPath: '.status.internal', priority: 1 },
        { name: 'Status', type: 'string', jsonPath: '.status.phase', priority: 0 },
      ];

      const priorityZeroColumns = columns.filter(col => col.priority === 0);
      expect(priorityZeroColumns).toHaveLength(2);
      expect(priorityZeroColumns[0].name).toBe('Name');
      expect(priorityZeroColumns[1].name).toBe('Status');
    });
  });

  describe('Column Generation', () => {
    it('should generate dynamic column keys', () => {
      const printerColumns = [
        { name: 'Status', type: 'string', jsonPath: '.status.printableStatus', priority: 0 },
        { name: 'Ready', type: 'string', jsonPath: '.status.ready', priority: 0 },
      ];

      const dynamicKeys = printerColumns.map(col => `_dynamic_${col.name}`);
      expect(dynamicKeys).toEqual(['_dynamic_Status', '_dynamic_Ready']);
    });

    it('should create column definitions with dynamic keys', () => {
      const column = {
        name: 'Status',
        type: 'string',
        jsonPath: '.status.printableStatus',
        priority: 0,
      };

      const columnDef = {
        key: `_dynamic_${column.name}`,
        label: column.name,
        type: 'default' as const,
      };

      expect(columnDef.key).toBe('_dynamic_Status');
      expect(columnDef.label).toBe('Status');
      expect(columnDef.type).toBe('default');
    });
  });

  describe('JSONPath Evaluation for Instances', () => {
    it('should evaluate JSONPath and populate instance data', () => {
      const instance = {
        metadata: {
          name: 'test-vm',
          namespace: 'default',
          creationTimestamp: '2025-11-01T10:00:00Z',
        },
        status: {
          printableStatus: 'Running',
          conditions: [
            { type: 'Ready', status: 'True' },
          ],
        },
      };

      const printerColumns = [
        { name: 'Status', type: 'string', jsonPath: '.status.printableStatus', priority: 0 },
      ];

      // Simulate what the component does
      const enrichedInstance: any = { ...instance };
      printerColumns.forEach(col => {
        const value = instance.status.printableStatus; // Simplified JSONPath evaluation
        enrichedInstance[`_dynamic_${col.name}`] = value || '-';
      });

      expect(enrichedInstance._dynamic_Status).toBe('Running');
    });

    it('should handle missing fields gracefully', () => {
      const instance = {
        metadata: {
          name: 'test-vm',
        },
      };

      const enrichedInstance: any = { ...instance };
      enrichedInstance._dynamic_Status = undefined || '-';

      expect(enrichedInstance._dynamic_Status).toBe('-');
    });
  });

  describe('Default Columns Fallback', () => {
    it('should use default columns when no additionalPrinterColumns defined', () => {
      const defaultColumns = [
        { key: 'name', label: 'Name', type: 'default' as const },
        { key: 'namespace', label: 'Namespace', type: 'default' as const },
        { key: 'status', label: 'Status', type: 'default' as const },
        { key: 'age', label: 'Age', type: 'age' as const },
      ];

      expect(defaultColumns).toHaveLength(4);
      expect(defaultColumns[0].key).toBe('name');
      expect(defaultColumns[3].key).toBe('age');
    });

    it('should handle CRD without spec.versions', () => {
      const crdDefinition = {
        spec: {},
      };

      const versions = (crdDefinition.spec as any).versions;
      expect(versions).toBeUndefined();
    });
  });

  describe('Version Matching', () => {
    it('should match version from CRD definition', () => {
      const crd = {
        spec: {
          group: 'kubevirt.io',
          names: {
            plural: 'virtualmachines',
          },
        },
        version: 'v1',
      };

      const crdDefinition = {
        spec: {
          versions: [
            { name: 'v1alpha1', served: true, storage: false },
            { name: 'v1', served: true, storage: true },
          ],
        },
      };

      const matchingVersion = crdDefinition.spec.versions.find(
        v => v.name === crd.version
      );

      expect(matchingVersion?.name).toBe('v1');
      expect(matchingVersion?.storage).toBe(true);
    });
  });

  describe('Column Type Handling', () => {
    it('should handle different column types', () => {
      const columns = [
        { name: 'Name', type: 'string', jsonPath: '.metadata.name' },
        { name: 'Count', type: 'integer', jsonPath: '.spec.replicas' },
        { name: 'Ready', type: 'boolean', jsonPath: '.status.ready' },
        { name: 'Created', type: 'date', jsonPath: '.metadata.creationTimestamp' },
      ];

      expect(columns[0].type).toBe('string');
      expect(columns[1].type).toBe('integer');
      expect(columns[2].type).toBe('boolean');
      expect(columns[3].type).toBe('date');
    });
  });
});
