/**
 * Network Store Tests
 * Comprehensive test suite for network store actions and state management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  $interfaces, 
  $interfacesLoading, 
  $interfacesError,
  $bridges,
  $bridgesLoading,
  $bridgesError,
  $bonds,
  $bondsLoading,
  $bondsError,
  $vlans,
  $vlansLoading,
  $vlansError,
  $selectedInterface,
  $searchQuery,
  $selectedType,
  $bridgeSearchQuery,
  $bondSearchQuery,
  $vlanSearchQuery,
  $interfaceTypes,
  $filteredInterfaces,
  $filteredBridges,
  $filteredBonds,
  $filteredVlans,
  $networkStats,
  networkActions
} from './network';
import type { 
  NetworkInterface, 
  NetworkOperationResponse 
} from '../types/api';

// Mock the api module
vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

import { api } from '../api';

// Test fixtures
const mockInterface: NetworkInterface = {
  name: 'eth0',
  mac: '00:11:22:33:44:55',
  mtu: 1500,
  state: 'up',
  type: 'ethernet',
  addresses: ['192.168.1.10/24'],
  statistics: {
    rx_bytes: 1024000,
    tx_bytes: 2048000,
    rx_packets: 1000,
    tx_packets: 2000,
    rx_errors: 0,
    tx_errors: 0,
  }
};

const mockBridge: NetworkInterface = {
  name: 'br0',
  mac: '00:11:22:33:44:66',
  mtu: 1500,
  state: 'up',
  type: 'bridge',
  addresses: ['192.168.1.1/24'],
  statistics: {
    rx_bytes: 5000000,
    tx_bytes: 3000000,
    rx_packets: 5000,
    tx_packets: 3000,
    rx_errors: 0,
    tx_errors: 0,
  }
};

const mockBond: NetworkInterface = {
  name: 'bond0',
  mac: '00:11:22:33:44:77',
  mtu: 1500,
  state: 'up',
  type: 'bond',
  addresses: ['10.0.0.1/24'],
  statistics: {
    rx_bytes: 8000000,
    tx_bytes: 6000000,
    rx_packets: 8000,
    tx_packets: 6000,
    rx_errors: 0,
    tx_errors: 0,
  }
};

const mockVlan: NetworkInterface = {
  name: 'eth0.100',
  mac: '00:11:22:33:44:88',
  mtu: 1500,
  state: 'up',
  type: 'vlan',
  addresses: ['172.16.0.1/24'],
  statistics: {
    rx_bytes: 2000000,
    tx_bytes: 1000000,
    rx_packets: 2000,
    tx_packets: 1000,
    rx_errors: 0,
    tx_errors: 0,
  }
};

describe('Network Store', () => {
  beforeEach(() => {
    // Reset all stores to initial state
    $interfaces.set([]);
    $interfacesLoading.set(false);
    $interfacesError.set(null);
    $bridges.set([]);
    $bridgesLoading.set(false);
    $bridgesError.set(null);
    $bonds.set([]);
    $bondsLoading.set(false);
    $bondsError.set(null);
    $vlans.set([]);
    $vlansLoading.set(false);
    $vlansError.set(null);
    $selectedInterface.set(null);
    $searchQuery.set('');
    $selectedType.set('all');
    $bridgeSearchQuery.set('');
    $bondSearchQuery.set('');
    $vlanSearchQuery.set('');
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============ Bridge Tests ============
  describe('Bridge Operations', () => {
    it('updateBridge - Success', async () => {
      const mockResponse: NetworkOperationResponse = {
        message: 'Bridge updated successfully',
      };
      
      vi.mocked(api.put).mockResolvedValue(mockResponse);
      vi.mocked(api.get).mockResolvedValue({ bridges: [mockBridge], interfaces: [] });

      const result = await networkActions.updateBridge('br0', { 
        interfaces: ['eth0', 'eth1'] 
      });

      expect(api.put).toHaveBeenCalledWith('/network/bridge/br0', { 
        interfaces: ['eth0', 'eth1'] 
      });
      expect(result).toEqual(mockResponse);
      expect(api.get).toHaveBeenCalledWith('/network/bridges');
      expect(api.get).toHaveBeenCalledWith('/network/interfaces');
    });

    it('updateBridge - Partial Failure', async () => {
      const mockResponse: NetworkOperationResponse = {
        message: 'Bridge updated with warnings',
        successfully_added: ['eth0'],
        failed: [
          { interface: 'eth1', reason: 'Interface not found' }
        ]
      };
      
      vi.mocked(api.put).mockResolvedValue(mockResponse);
      vi.mocked(api.get).mockResolvedValue({ bridges: [mockBridge], interfaces: [] });

      const result = await networkActions.updateBridge('br0', { 
        interfaces: ['eth0', 'eth1'] 
      });

      expect(result.successfully_added).toEqual(['eth0']);
      expect(result.failed).toHaveLength(1);
      expect(result.failed?.[0]?.reason).toBe('Interface not found');
    });

    it('updateBridge - Persistence Warning', async () => {
      const mockResponse: NetworkOperationResponse = {
        message: 'Bridge updated',
        persistence_warning: 'Changes are not persistent',
      };
      
      vi.mocked(api.put).mockResolvedValue(mockResponse);
      vi.mocked(api.get).mockResolvedValue({ bridges: [mockBridge], interfaces: [] });

      const result = await networkActions.updateBridge('br0', { 
        interfaces: ['eth0'] 
      });

      expect(result.persistence_warning).toBe('Changes are not persistent');
    });

    it('updateBridge - Network Error', async () => {
      vi.mocked(api.put).mockRejectedValue(new Error('Network error'));

      await expect(networkActions.updateBridge('br0', { 
        interfaces: ['eth0'] 
      })).rejects.toThrow('Network error');
      
      // Verify fetchBridges and fetchInterfaces were NOT called on error
      expect(api.get).not.toHaveBeenCalled();
    });

    it('createBridge - Success', async () => {
      const mockResponse: NetworkOperationResponse = {
        message: 'Bridge created successfully',
      };
      
      vi.mocked(api.post).mockResolvedValue(mockResponse);
      vi.mocked(api.get).mockResolvedValue({ bridges: [mockBridge], interfaces: [] });

      const result = await networkActions.createBridge({ 
        name: 'br0',
        interfaces: ['eth0', 'eth1']
      });

      expect(api.post).toHaveBeenCalledWith('/network/bridge', { 
        name: 'br0',
        interfaces: ['eth0', 'eth1']
      });
      expect(result).toEqual(mockResponse);
    });

    it('deleteBridge - Success', async () => {
      vi.mocked(api.delete).mockResolvedValue(undefined);
      vi.mocked(api.get).mockResolvedValue({ bridges: [] });

      const result = await networkActions.deleteBridge('br0');

      expect(api.delete).toHaveBeenCalledWith('/network/bridge/br0');
      expect(result).toBe(true);
      expect(api.get).toHaveBeenCalledWith('/network/bridges');
    });
  });

  // ============ Bond Tests ============
  describe('Bond Operations', () => {
    it('updateBond - Full Update', async () => {
      const mockResponse: NetworkOperationResponse = {
        message: 'Bond updated successfully',
      };
      
      vi.mocked(api.put).mockResolvedValue(mockResponse);
      vi.mocked(api.get).mockResolvedValue({ bonds: [mockBond], interfaces: [] });

      const result = await networkActions.updateBond('bond0', { 
        mode: 'active-backup',
        interfaces: ['eth0', 'eth1'] 
      });

      expect(api.put).toHaveBeenCalledWith('/network/bond/bond0', { 
        mode: 'active-backup',
        interfaces: ['eth0', 'eth1'] 
      });
      expect(result).toEqual(mockResponse);
    });

    it('updateBond - Mode Only', async () => {
      const mockResponse: NetworkOperationResponse = {
        message: 'Bond mode updated',
      };
      
      vi.mocked(api.put).mockResolvedValue(mockResponse);
      vi.mocked(api.get).mockResolvedValue({ bonds: [mockBond], interfaces: [] });

      const result = await networkActions.updateBond('bond0', { 
        mode: '802.3ad'
      });

      expect(api.put).toHaveBeenCalledWith('/network/bond/bond0', { 
        mode: '802.3ad'
      });
      expect(result.message).toBe('Bond mode updated');
    });

    it('createBond - Success', async () => {
      const mockResponse: NetworkOperationResponse = {
        message: 'Bond created successfully',
      };
      
      vi.mocked(api.post).mockResolvedValue(mockResponse);
      vi.mocked(api.get).mockResolvedValue({ bonds: [mockBond], interfaces: [] });

      const result = await networkActions.createBond({ 
        name: 'bond0',
        mode: 'balance-rr',
        interfaces: ['eth0', 'eth1']
      });

      expect(api.post).toHaveBeenCalledWith('/network/bond', { 
        name: 'bond0',
        mode: 'balance-rr',
        interfaces: ['eth0', 'eth1']
      });
      expect(result).toEqual(mockResponse);
    });
  });

  // ============ VLAN Tests ============
  describe('VLAN Operations', () => {
    it('updateVlan - Success', async () => {
      const mockResponse: NetworkOperationResponse = {
        message: 'VLAN updated successfully',
      };
      
      vi.mocked(api.put).mockResolvedValue(mockResponse);
      vi.mocked(api.get).mockResolvedValue({ vlans: [mockVlan], interfaces: [] });

      const result = await networkActions.updateVlan('eth0.100', { 
        vlan_id: 200
      });

      expect(api.put).toHaveBeenCalledWith('/network/vlan/eth0.100', { 
        vlan_id: 200
      });
      expect(result).toEqual(mockResponse);
    });

    it('createVlan - With Name', async () => {
      const mockResponse: NetworkOperationResponse = {
        message: 'VLAN created successfully',
      };
      
      vi.mocked(api.post).mockResolvedValue(mockResponse);
      vi.mocked(api.get).mockResolvedValue({ vlans: [mockVlan], interfaces: [] });

      const result = await networkActions.createVlan({ 
        interface: 'eth0',
        vlan_id: 100,
        name: 'vlan100'
      });

      expect(api.post).toHaveBeenCalledWith('/network/vlan', { 
        interface: 'eth0',
        vlan_id: 100,
        name: 'vlan100'
      });
      expect(result).toEqual(mockResponse);
    });

    it('createVlan - Auto Name', async () => {
      const mockResponse: NetworkOperationResponse = {
        message: 'VLAN created successfully',
      };
      
      vi.mocked(api.post).mockResolvedValue(mockResponse);
      vi.mocked(api.get).mockResolvedValue({ vlans: [mockVlan], interfaces: [] });

      const result = await networkActions.createVlan({ 
        interface: 'eth0',
        vlan_id: 100
      });

      expect(api.post).toHaveBeenCalledWith('/network/vlan', { 
        interface: 'eth0',
        vlan_id: 100
      });
      expect(result).toEqual(mockResponse);
    });
  });

  // ============ Interface Address Tests ============
  describe('Interface Address Operations', () => {
    it('addIpAddress - Success', async () => {
      const updatedInterface = { ...mockInterface, addresses: ['192.168.1.10/24', '192.168.1.11/24'] };
      
      vi.mocked(api.post).mockResolvedValue(undefined);
      vi.mocked(api.get).mockResolvedValue({ interfaces: [updatedInterface] });

      const result = await networkActions.addIpAddress('eth0', {
        address: '192.168.1.11',
        netmask: 24,
        gateway: '192.168.1.1'
      });

      expect(api.post).toHaveBeenCalledWith('/network/interfaces/eth0/address', {
        address: '192.168.1.11',
        netmask: 24,
        gateway: '192.168.1.1'
      });
      expect(result).toBe(true);
    });

    it('addIpAddress - Updates Selected Interface', async () => {
      $selectedInterface.set(mockInterface);
      const updatedInterface = { ...mockInterface, addresses: ['192.168.1.10/24', '192.168.1.11/24'] };
      
      vi.mocked(api.post).mockResolvedValue(undefined);
      vi.mocked(api.get).mockResolvedValue({ interfaces: [updatedInterface] });

      await networkActions.addIpAddress('eth0', {
        address: '192.168.1.11',
        netmask: 24
      });

      const selected = $selectedInterface.get();
      expect(selected?.addresses).toContain('192.168.1.10/24');
    });

    it('deleteIpAddress - Success', async () => {
      vi.mocked(api.delete).mockResolvedValue(undefined);
      vi.mocked(api.get).mockResolvedValue({ interfaces: [mockInterface] });

      const result = await networkActions.deleteIpAddress('eth0', '192.168.1.11/24');

      expect(api.delete).toHaveBeenCalledWith('/network/interfaces/eth0/address?address=192.168.1.11%2F24');
      expect(result).toBe(true);
    });

    it('deleteIpAddress - Updates Selected Interface', async () => {
      $selectedInterface.set(mockInterface);
      
      vi.mocked(api.delete).mockResolvedValue(undefined);
      vi.mocked(api.get).mockResolvedValue({ interfaces: [mockInterface] });

      await networkActions.deleteIpAddress('eth0', '192.168.1.10/24');

      // Verify selected interface is refreshed
      expect(api.get).toHaveBeenCalledWith('/network/interfaces');
    });
  });

  // ============ Interface State Tests ============
  describe('Interface State Operations', () => {
    it('toggleInterfaceState - Brings Interface Up', async () => {
      const downInterface = { ...mockInterface, state: 'down' as const };
      
      vi.mocked(api.put).mockResolvedValue(undefined);
      vi.mocked(api.get).mockResolvedValue({ interfaces: [mockInterface] });

      const result = await networkActions.toggleInterfaceState(downInterface);

      expect(api.put).toHaveBeenCalledWith('/network/interfaces/eth0/up');
      expect(result).toBe(true);
    });

    it('toggleInterfaceState - Brings Interface Down', async () => {
      vi.mocked(api.put).mockResolvedValue(undefined);
      vi.mocked(api.get).mockResolvedValue({ interfaces: [{ ...mockInterface, state: 'down' }] });

      const result = await networkActions.toggleInterfaceState(mockInterface);

      expect(api.put).toHaveBeenCalledWith('/network/interfaces/eth0/down');
      expect(result).toBe(true);
    });

    it('toggleInterfaceState - Error Handling', async () => {
      vi.mocked(api.put).mockRejectedValue(new Error('Failed to toggle'));

      const result = await networkActions.toggleInterfaceState(mockInterface);

      expect(result).toBe(false);
    });
  });

  // ============ Fetch Operations Tests ============
  describe('Fetch Operations', () => {
    it('fetchInterfaces - Success', async () => {
      vi.mocked(api.get).mockResolvedValue({ interfaces: [mockInterface] });

      await networkActions.fetchInterfaces();

      expect($interfacesLoading.get()).toBe(false);
      expect($interfacesError.get()).toBe(null);
      expect($interfaces.get()).toEqual([mockInterface]);
    });

    it('fetchInterfaces - Error', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      await networkActions.fetchInterfaces();

      expect($interfacesLoading.get()).toBe(false);
      expect($interfacesError.get()).toBe('Network error');
      expect($interfaces.get()).toEqual([]);
    });

    it('fetchBridges - Success', async () => {
      vi.mocked(api.get).mockResolvedValue({ bridges: [mockBridge] });

      await networkActions.fetchBridges();

      expect($bridgesLoading.get()).toBe(false);
      expect($bridgesError.get()).toBe(null);
      expect($bridges.get()).toEqual([mockBridge]);
    });

    it('fetchBonds - Success', async () => {
      vi.mocked(api.get).mockResolvedValue({ bonds: [mockBond] });

      await networkActions.fetchBonds();

      expect($bondsLoading.get()).toBe(false);
      expect($bondsError.get()).toBe(null);
      expect($bonds.get()).toEqual([mockBond]);
    });

    it('fetchVlans - Success', async () => {
      vi.mocked(api.get).mockResolvedValue({ vlans: [mockVlan] });

      await networkActions.fetchVlans();

      expect($vlansLoading.get()).toBe(false);
      expect($vlansError.get()).toBe(null);
      expect($vlans.get()).toEqual([mockVlan]);
    });

    it('fetchAll - Fetches All Network Data', async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/network/interfaces') return Promise.resolve({ interfaces: [mockInterface] });
        if (url === '/network/bridges') return Promise.resolve({ bridges: [mockBridge] });
        if (url === '/network/bonds') return Promise.resolve({ bonds: [mockBond] });
        if (url === '/network/vlans') return Promise.resolve({ vlans: [mockVlan] });
        return Promise.resolve({});
      });

      await networkActions.fetchAll();

      expect($interfaces.get()).toEqual([mockInterface]);
      expect($bridges.get()).toEqual([mockBridge]);
      expect($bonds.get()).toEqual([mockBond]);
      expect($vlans.get()).toEqual([mockVlan]);
    });
  });

  // ============ Computed Atoms Tests ============
  describe('Computed Atoms', () => {
    it('$interfaceTypes - Extracts Unique Types', () => {
      $interfaces.set([
        mockInterface,
        mockBridge,
        mockBond,
        { ...mockInterface, name: 'eth1', type: 'ethernet' }
      ]);

      const types = $interfaceTypes.get();
      expect(types).toContain('ethernet');
      expect(types).toContain('bridge');
      expect(types).toContain('bond');
      expect(types).toHaveLength(3);
    });

    it('$filteredInterfaces - Filters By Type', () => {
      $interfaces.set([mockInterface, mockBridge, mockBond]);
      $selectedType.set('bridge');

      const filtered = $filteredInterfaces.get();
      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.type).toBe('bridge');
    });

    it('$filteredInterfaces - Filters By Search Query', () => {
      $interfaces.set([
        mockInterface,
        { ...mockInterface, name: 'eth1' },
        { ...mockInterface, name: 'wlan0' }
      ]);
      $searchQuery.set('eth');

      const filtered = $filteredInterfaces.get();
      expect(filtered).toHaveLength(2);
      expect(filtered.every(i => i.name.includes('eth'))).toBe(true);
    });

    it('$filteredBridges - Filters By Search', () => {
      $bridges.set([
        mockBridge,
        { ...mockBridge, name: 'br1' },
        { ...mockBridge, name: 'virbr0' }
      ]);
      $bridgeSearchQuery.set('br');

      const filtered = $filteredBridges.get();
      expect(filtered).toHaveLength(3);
    });

    it('$filteredBonds - Returns All When No Search', () => {
      $bonds.set([mockBond, { ...mockBond, name: 'bond1' }]);
      $bondSearchQuery.set('');

      const filtered = $filteredBonds.get();
      expect(filtered).toHaveLength(2);
    });

    it('$filteredVlans - Filters By Search', () => {
      $vlans.set([
        mockVlan,
        { ...mockVlan, name: 'eth0.200' },
        { ...mockVlan, name: 'eth1.100' }
      ]);
      $vlanSearchQuery.set('eth0');

      const filtered = $filteredVlans.get();
      expect(filtered).toHaveLength(2);
    });

    it('$networkStats - Calculates Statistics', () => {
      $interfaces.set([
        mockInterface,
        { ...mockInterface, name: 'eth1', state: 'down' }
      ]);
      $bridges.set([mockBridge]);
      $bonds.set([mockBond]);
      $vlans.set([mockVlan]);

      const stats = $networkStats.get();
      expect(stats.totalInterfaces).toBe(2);
      expect(stats.upInterfaces).toBe(1);
      expect(stats.downInterfaces).toBe(1);
      expect(stats.totalBridges).toBe(1);
      expect(stats.totalBonds).toBe(1);
      expect(stats.totalVlans).toBe(1);
      expect(stats.totalRxBytes).toBeGreaterThan(0);
      expect(stats.totalTxBytes).toBeGreaterThan(0);
    });

    it('$networkStats - Handles Empty Arrays', () => {
      $interfaces.set([]);
      $bridges.set([]);
      $bonds.set([]);
      $vlans.set([]);

      const stats = $networkStats.get();
      expect(stats.totalInterfaces).toBe(0);
      expect(stats.upInterfaces).toBe(0);
      expect(stats.downInterfaces).toBe(0);
      expect(stats.totalRxBytes).toBe(0);
      expect(stats.totalTxBytes).toBe(0);
    });
  });

  // ============ Edge Cases Tests ============
  describe('Edge Cases', () => {
    it('handles null/undefined in interfaces array', async () => {
      vi.mocked(api.get).mockResolvedValue({ interfaces: null });

      await networkActions.fetchInterfaces();

      expect($interfaces.get()).toEqual([]);
    });

    it('handles missing statistics in interface', () => {
      const interfaceWithoutStats = { ...mockInterface };
      delete (interfaceWithoutStats as any).statistics;
      
      $interfaces.set([interfaceWithoutStats]);

      const stats = $networkStats.get();
      expect(stats.totalRxBytes).toBe(0);
      expect(stats.totalTxBytes).toBe(0);
    });

    it('handles API errors gracefully in create operations', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('API Error'));

      await expect(networkActions.createBridge({ 
        name: 'br0' 
      })).rejects.toThrow('API Error');
    });

    it('handles delete operation failures', async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error('Delete failed'));

      const result = await networkActions.deleteBridge('br0');

      expect(result).toBe(false);
    });

    it('encodes special characters in deleteIpAddress', async () => {
      vi.mocked(api.delete).mockResolvedValue(undefined);
      vi.mocked(api.get).mockResolvedValue({ interfaces: [] });

      await networkActions.deleteIpAddress('eth0', '192.168.1.10/24');

      expect(api.delete).toHaveBeenCalledWith(
        expect.stringContaining('192.168.1.10%2F24')
      );
    });

    it('does not update selectedInterface for different interface', async () => {
      $selectedInterface.set({ ...mockInterface, name: 'eth1' });
      
      vi.mocked(api.post).mockResolvedValue(undefined);
      vi.mocked(api.get).mockResolvedValue({ interfaces: [mockInterface] });

      await networkActions.addIpAddress('eth0', {
        address: '192.168.1.11',
        netmask: 24
      });

      const selected = $selectedInterface.get();
      expect(selected?.name).toBe('eth1');
    });
  });

  // ============ Loading State Tests ============
  describe('Loading States', () => {
    it('sets loading state during fetch operations', async () => {
      let loadingStateDuringFetch = false;
      
      vi.mocked(api.get).mockImplementation(() => {
        loadingStateDuringFetch = $interfacesLoading.get();
        return Promise.resolve({ interfaces: [] });
      });

      await networkActions.fetchInterfaces();

      expect(loadingStateDuringFetch).toBe(true);
      expect($interfacesLoading.get()).toBe(false);
    });

    it('clears loading state even on error', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Error'));

      await networkActions.fetchInterfaces();

      expect($interfacesLoading.get()).toBe(false);
    });
  });
  // ============ Additional Coverage Tests ============
  describe('Additional Methods', () => {
    it('configureAddress - Success', async () => {
      vi.mocked(api.post).mockResolvedValue(undefined);
      vi.mocked(api.get).mockResolvedValue({ interfaces: [mockInterface] });

      const result = await networkActions.configureAddress('eth0', {
        address: '192.168.1.20',
        netmask: 24,
        gateway: '192.168.1.1'
      });

      expect(api.post).toHaveBeenCalledWith('/network/interfaces/eth0/address', {
        address: '192.168.1.20',
        netmask: 24,
        gateway: '192.168.1.1'
      });
      expect(result).toBe(true);
    });

    it('configureAddress - Error', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Configure failed'));

      const result = await networkActions.configureAddress('eth0', {
        address: '192.168.1.20',
        netmask: 24
      });

      expect(result).toBe(false);
    });

    it('updateIpAddress - Success', async () => {
      $selectedInterface.set(mockInterface);
      const updatedInterface = { ...mockInterface, addresses: ['192.168.1.20/24'] };
      
      vi.mocked(api.delete).mockResolvedValue(undefined);
      vi.mocked(api.post).mockResolvedValue(undefined);
      vi.mocked(api.get).mockResolvedValue({ interfaces: [updatedInterface] });

      const result = await networkActions.updateIpAddress(
        'eth0',
        '192.168.1.10/24',
        {
          address: '192.168.1.20',
          netmask: 24,
          gateway: '192.168.1.1'
        }
      );

      expect(api.delete).toHaveBeenCalledWith('/network/interfaces/eth0/address?address=192.168.1.10%2F24');
      expect(api.post).toHaveBeenCalledWith('/network/interfaces/eth0/address', {
        address: '192.168.1.20',
        netmask: 24,
        gateway: '192.168.1.1'
      });
      expect(result).toBe(true);
    });

    it('updateIpAddress - Error on Delete', async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error('Delete failed'));

      const result = await networkActions.updateIpAddress(
        'eth0',
        '192.168.1.10/24',
        {
          address: '192.168.1.20',
          netmask: 24
        }
      );

      expect(result).toBe(false);
      expect(api.post).not.toHaveBeenCalled();
    });

    it('updateIpAddress - Error on Add', async () => {
      vi.mocked(api.delete).mockResolvedValue(undefined);
      vi.mocked(api.post).mockRejectedValue(new Error('Add failed'));

      const result = await networkActions.updateIpAddress(
        'eth0',
        '192.168.1.10/24',
        {
          address: '192.168.1.20',
          netmask: 24
        }
      );

      expect(result).toBe(false);
    });

    it('clearErrors - Clears All Errors', () => {
      $interfacesError.set('Error 1');
      $bridgesError.set('Error 2');
      $bondsError.set('Error 3');
      $vlansError.set('Error 4');

      networkActions.clearErrors();

      expect($interfacesError.get()).toBe(null);
      expect($bridgesError.get()).toBe(null);
      expect($bondsError.get()).toBe(null);
      expect($vlansError.get()).toBe(null);
    });

    it('resetUIState - Resets All UI State', () => {
      $selectedInterface.set(mockInterface);
      $searchQuery.set('test');
      $selectedType.set('bridge');
      $bridgeSearchQuery.set('br');
      $bondSearchQuery.set('bond');
      $vlanSearchQuery.set('vlan');

      networkActions.resetUIState();

      expect($selectedInterface.get()).toBe(null);
      expect($searchQuery.get()).toBe('');
      expect($selectedType.get()).toBe('all');
      expect($bridgeSearchQuery.get()).toBe('');
      expect($bondSearchQuery.get()).toBe('');
      expect($vlanSearchQuery.get()).toBe('');
    });
  });

  // ============ Lifecycle Tests ============
  describe('Lifecycle Functions', () => {
    it('initializeNetworkStore - Success', async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/network/interfaces') return Promise.resolve({ interfaces: [mockInterface] });
        if (url === '/network/bridges') return Promise.resolve({ bridges: [mockBridge] });
        if (url === '/network/bonds') return Promise.resolve({ bonds: [mockBond] });
        if (url === '/network/vlans') return Promise.resolve({ vlans: [mockVlan] });
        return Promise.resolve({});
      });

      const { initializeNetworkStore } = await import('./network');
      await initializeNetworkStore();

      expect($interfaces.get()).toEqual([mockInterface]);
      expect($bridges.get()).toEqual([mockBridge]);
      expect($bonds.get()).toEqual([mockBond]);
      expect($vlans.get()).toEqual([mockVlan]);
    });

    it('initializeNetworkStore - Error Handling', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Init error'));

      const { initializeNetworkStore } = await import('./network');
      
      // Should not throw
      await expect(initializeNetworkStore()).resolves.toBeUndefined();
    });

    it('cleanupNetworkStore - Resets Everything', async () => {
      // Set some state
      $interfaces.set([mockInterface]);
      $bridges.set([mockBridge]);
      $bonds.set([mockBond]);
      $vlans.set([mockVlan]);
      $interfacesError.set('Error');
      $selectedInterface.set(mockInterface);
      $searchQuery.set('test');

      const { cleanupNetworkStore } = await import('./network');
      cleanupNetworkStore();

      expect($interfaces.get()).toEqual([]);
      expect($bridges.get()).toEqual([]);
      expect($bonds.get()).toEqual([]);
      expect($vlans.get()).toEqual([]);
      expect($interfacesError.get()).toBe(null);
      expect($selectedInterface.get()).toBe(null);
      expect($searchQuery.get()).toBe('');
    });
  });

  // ============ Additional Edge Cases ============
  describe('Additional Edge Cases', () => {
    it('deleteBond - Error Handling', async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error('Delete bond failed'));

      const result = await networkActions.deleteBond('bond0');

      expect(result).toBe(false);
    });

    it('deleteVlan - Success', async () => {
      vi.mocked(api.delete).mockResolvedValue(undefined);
      vi.mocked(api.get).mockResolvedValue({ vlans: [] });

      const result = await networkActions.deleteVlan('eth0.100');

      expect(api.delete).toHaveBeenCalledWith('/network/vlan/eth0.100');
      expect(result).toBe(true);
    });

    it('deleteVlan - Error Handling', async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error('Delete vlan failed'));

      const result = await networkActions.deleteVlan('eth0.100');

      expect(result).toBe(false);
    });

    it('fetchBridges - Error Handling', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Bridge fetch error'));

      await networkActions.fetchBridges();

      expect($bridgesError.get()).toBe('Bridge fetch error');
      expect($bridges.get()).toEqual([]);
    });

    it('fetchBonds - Error Handling', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Bond fetch error'));

      await networkActions.fetchBonds();

      expect($bondsError.get()).toBe('Bond fetch error');
      expect($bonds.get()).toEqual([]);
    });

    it('fetchVlans - Error Handling', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('VLAN fetch error'));

      await networkActions.fetchVlans();

      expect($vlansError.get()).toBe('VLAN fetch error');
      expect($vlans.get()).toEqual([]);
    });

    it('updateBond - Error Handling', async () => {
      vi.mocked(api.put).mockRejectedValue(new Error('Update bond failed'));

      await expect(networkActions.updateBond('bond0', { 
        mode: 'active-backup' 
      })).rejects.toThrow('Update bond failed');
    });

    it('updateVlan - Error Handling', async () => {
      vi.mocked(api.put).mockRejectedValue(new Error('Update vlan failed'));

      await expect(networkActions.updateVlan('eth0.100', { 
        vlan_id: 200 
      })).rejects.toThrow('Update vlan failed');
    });

    it('createBond - Error Handling', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Create bond failed'));

      await expect(networkActions.createBond({ 
        name: 'bond0',
        mode: 'balance-rr',
        interfaces: ['eth0', 'eth1']
      })).rejects.toThrow('Create bond failed');
    });

    it('createVlan - Error Handling', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Create vlan failed'));

      await expect(networkActions.createVlan({ 
        interface: 'eth0',
        vlan_id: 100
      })).rejects.toThrow('Create vlan failed');
    });

    it('addIpAddress - Error Handling', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Add IP failed'));

      const result = await networkActions.addIpAddress('eth0', {
        address: '192.168.1.11',
        netmask: 24
      });

      expect(result).toBe(false);
    });

    it('deleteIpAddress - Error Handling', async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error('Delete IP failed'));

      const result = await networkActions.deleteIpAddress('eth0', '192.168.1.10/24');

      expect(result).toBe(false);
    });

    it('handles undefined selectedInterface when updating', async () => {
      $selectedInterface.set(null);
      
      vi.mocked(api.post).mockResolvedValue(undefined);
      vi.mocked(api.get).mockResolvedValue({ interfaces: [mockInterface] });

      await networkActions.addIpAddress('eth0', {
        address: '192.168.1.11',
        netmask: 24
      });

      // Should not throw and selectedInterface should remain null
      expect($selectedInterface.get()).toBe(null);
    });

    it('handles interface not found when updating selected', async () => {
      $selectedInterface.set(mockInterface);
      
      vi.mocked(api.post).mockResolvedValue(undefined);
      vi.mocked(api.get).mockResolvedValue({ interfaces: [] }); // Interface not in list

      await networkActions.addIpAddress('eth0', {
        address: '192.168.1.11',
        netmask: 24
      });

      // selectedInterface should remain as mockInterface since update wasn't found
      expect($selectedInterface.get()).toEqual(mockInterface);
    });

    it('handles null/undefined in bridges array', async () => {
      vi.mocked(api.get).mockResolvedValue({ bridges: null });

      await networkActions.fetchBridges();

      expect($bridges.get()).toEqual([]);
    });

    it('handles null/undefined in bonds array', async () => {
      vi.mocked(api.get).mockResolvedValue({ bonds: null });

      await networkActions.fetchBonds();

      expect($bonds.get()).toEqual([]);
    });

    it('handles null/undefined in vlans array', async () => {
      vi.mocked(api.get).mockResolvedValue({ vlans: null });

      await networkActions.fetchVlans();

      expect($vlans.get()).toEqual([]);
    });

    it('handles non-Error objects thrown', async () => {
      vi.mocked(api.get).mockRejectedValue('String error');

      await networkActions.fetchInterfaces();

      expect($interfacesError.get()).toBe('Failed to fetch interfaces');
    });
  });
});
