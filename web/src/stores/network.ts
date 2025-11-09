/**
 * Network Store - State management for network module
 */

import { atom, computed } from 'nanostores';
import type { 
  NetworkInterface, 
  AddressRequest, 
  BridgeRequest, 
  BondRequest, 
  VLANRequest,
  BridgeUpdateRequest,
  BondUpdateRequest,
  VLANUpdateRequest,
  AddressUpdateRequest,
  NetworkOperationResponse
} from '../types/api';
import { api } from '../api';

// ============ State Atoms ============

// Network interfaces
export const $interfaces = atom<NetworkInterface[]>([]);
export const $interfacesLoading = atom<boolean>(false);
export const $interfacesError = atom<string | null>(null);

// Bridges
export const $bridges = atom<NetworkInterface[]>([]);
export const $bridgesLoading = atom<boolean>(false);
export const $bridgesError = atom<string | null>(null);

// Bonds
export const $bonds = atom<NetworkInterface[]>([]);
export const $bondsLoading = atom<boolean>(false);
export const $bondsError = atom<string | null>(null);

// VLANs
export const $vlans = atom<NetworkInterface[]>([]);
export const $vlansLoading = atom<boolean>(false);
export const $vlansError = atom<string | null>(null);

// UI State
export const $selectedInterface = atom<NetworkInterface | null>(null);
export const $searchQuery = atom<string>('');
export const $selectedType = atom<string>('all');
export const $bridgeSearchQuery = atom<string>('');
export const $bondSearchQuery = atom<string>('');
export const $vlanSearchQuery = atom<string>('');

// ============ Computed Atoms ============

// Get unique interface types
export const $interfaceTypes = computed($interfaces, (interfaces) => {
  const types = new Set<string>();
  interfaces.forEach(iface => {
    if (iface.type) {
      types.add(iface.type);
    }
  });
  return Array.from(types).sort();
});

// Filtered interfaces based on search and type
export const $filteredInterfaces = computed(
  [$interfaces, $searchQuery, $selectedType],
  (interfaces, searchQuery, selectedType) => {
    let filtered = interfaces;
    
    // Apply type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(iface => iface.type === selectedType);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(iface => 
        iface.name.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }
);

// Filtered bridges
export const $filteredBridges = computed(
  [$bridges, $bridgeSearchQuery],
  (bridges, searchQuery) => {
    if (!searchQuery) return bridges;
    const query = searchQuery.toLowerCase();
    return bridges.filter(bridge => 
      bridge.name.toLowerCase().includes(query)
    );
  }
);

// Filtered bonds
export const $filteredBonds = computed(
  [$bonds, $bondSearchQuery],
  (bonds, searchQuery) => {
    if (!searchQuery) return bonds;
    const query = searchQuery.toLowerCase();
    return bonds.filter(bond => 
      bond.name.toLowerCase().includes(query)
    );
  }
);

// Filtered VLANs
export const $filteredVlans = computed(
  [$vlans, $vlanSearchQuery],
  (vlans, searchQuery) => {
    if (!searchQuery) return vlans;
    const query = searchQuery.toLowerCase();
    return vlans.filter(vlan => 
      vlan.name.toLowerCase().includes(query)
    );
  }
);

// Network statistics
export const $networkStats = computed(
  [$interfaces, $bridges, $bonds, $vlans],
  (interfaces, bridges, bonds, vlans) => {
    const totalInterfaces = interfaces.length;
    const upInterfaces = interfaces.filter(i => i.state === 'up').length;
    const downInterfaces = interfaces.filter(i => i.state === 'down').length;
    
    const totalRxBytes = interfaces.reduce((sum, iface) => 
      sum + (iface.statistics?.rx_bytes || 0), 0
    );
    const totalTxBytes = interfaces.reduce((sum, iface) => 
      sum + (iface.statistics?.tx_bytes || 0), 0
    );
    
    return {
      totalInterfaces,
      upInterfaces,
      downInterfaces,
      totalBridges: bridges.length,
      totalBonds: bonds.length,
      totalVlans: vlans.length,
      totalRxBytes,
      totalTxBytes,
    };
  }
);

// ============ Actions ============

export const networkActions = {
  // Fetch all network data
  async fetchAll() {
    await Promise.all([
      this.fetchInterfaces(),
      this.fetchBridges(),
      this.fetchBonds(),
      this.fetchVlans(),
    ]);
  },

  // Fetch interfaces
  async fetchInterfaces() {
    $interfacesLoading.set(true);
    $interfacesError.set(null);
    
    try {
      const data = await api.get('/network/interfaces');
      $interfaces.set(data.interfaces || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch interfaces';
      $interfacesError.set(errorMessage);
      console.error('Error fetching network interfaces:', error);
    } finally {
      $interfacesLoading.set(false);
    }
  },

  // Fetch bridges
  async fetchBridges() {
    $bridgesLoading.set(true);
    $bridgesError.set(null);
    
    try {
      const data = await api.get('/network/bridges');
      $bridges.set(data.bridges || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch bridges';
      $bridgesError.set(errorMessage);
      console.error('Error fetching bridges:', error);
    } finally {
      $bridgesLoading.set(false);
    }
  },

  // Fetch bonds
  async fetchBonds() {
    $bondsLoading.set(true);
    $bondsError.set(null);
    
    try {
      const data = await api.get('/network/bonds');
      $bonds.set(data.bonds || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch bonds';
      $bondsError.set(errorMessage);
      console.error('Error fetching bonds:', error);
    } finally {
      $bondsLoading.set(false);
    }
  },

  // Fetch VLANs
  async fetchVlans() {
    $vlansLoading.set(true);
    $vlansError.set(null);
    
    try {
      const data = await api.get('/network/vlans');
      $vlans.set(data.vlans || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch VLANs';
      $vlansError.set(errorMessage);
      console.error('Error fetching VLANs:', error);
    } finally {
      $vlansLoading.set(false);
    }
  },

  // Toggle interface state (up/down)
  async toggleInterfaceState(iface: NetworkInterface): Promise<boolean> {
    const newState = iface.state === 'up' ? 'down' : 'up';
    const url = `/network/interfaces/${iface.name}/${newState}`;
    
    try {
      await api.put(url);
      await this.fetchInterfaces();
      return true;
    } catch (error) {
      console.error(`Error bringing interface ${newState}:`, error);
      return false;
    }
  },

  // Configure interface address
  async configureAddress(interfaceName: string, request: AddressRequest): Promise<boolean> {
    try {
      await api.post(`/network/interfaces/${interfaceName}/address`, request);
      await this.fetchInterfaces();
      return true;
    } catch (error) {
      console.error('Error configuring address:', error);
      return false;
    }
  },

  // Add IP address to interface
  async addIpAddress(interfaceName: string, request: AddressRequest): Promise<boolean> {
    try {
      await api.post(`/network/interfaces/${interfaceName}/address`, request);
      await this.fetchInterfaces();
      
      // Update selected interface if it matches
      const selectedIface = $selectedInterface.get();
      if (selectedIface && selectedIface.name === interfaceName) {
        const updatedInterface = $interfaces.get().find(i => i.name === interfaceName);
        if (updatedInterface) {
          $selectedInterface.set(updatedInterface);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error adding IP address:', error);
      return false;
    }
  },

  // Update IP address
  async updateIpAddress(
    interfaceName: string, 
    oldAddress: string, 
    newRequest: AddressRequest
  ): Promise<boolean> {
    try {
      // First delete the old address
      await api.delete(`/network/interfaces/${interfaceName}/address?address=${encodeURIComponent(oldAddress)}`);
      
      // Then add the new address
      await api.post(`/network/interfaces/${interfaceName}/address`, newRequest);
      
      await this.fetchInterfaces();
      
      // Update selected interface if it matches
      const selectedIface = $selectedInterface.get();
      if (selectedIface && selectedIface.name === interfaceName) {
        const updatedInterface = $interfaces.get().find(i => i.name === interfaceName);
        if (updatedInterface) {
          $selectedInterface.set(updatedInterface);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error updating IP address:', error);
      return false;
    }
  },

  // Delete IP address
  async deleteIpAddress(interfaceName: string, address: string): Promise<boolean> {
    try {
      await api.delete(`/network/interfaces/${interfaceName}/address?address=${encodeURIComponent(address)}`);
      await this.fetchInterfaces();
      
      // Update selected interface if it matches
      const selectedIface = $selectedInterface.get();
      if (selectedIface && selectedIface.name === interfaceName) {
        const updatedInterface = $interfaces.get().find(i => i.name === interfaceName);
        if (updatedInterface) {
          $selectedInterface.set(updatedInterface);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting IP address:', error);
      return false;
    }
  },

  // Create bridge
  async createBridge(request: BridgeRequest): Promise<NetworkOperationResponse> {
    try {
      const response = await api.post<NetworkOperationResponse>('/network/bridge', request);
      await Promise.all([
        this.fetchBridges(),
        this.fetchInterfaces(),
      ]);
      return response || {};
    } catch (error) {
      console.error('Error creating bridge:', error);
      throw error;
    }
  },

  // Delete bridge
  async deleteBridge(name: string): Promise<boolean> {
    try {
      await api.delete(`/network/bridge/${name}`);
      await this.fetchBridges();
      return true;
    } catch (error) {
      console.error('Error deleting bridge:', error);
      return false;
    }
  },

  // Create bond
  async createBond(request: BondRequest): Promise<NetworkOperationResponse> {
    try {
      const response = await api.post<NetworkOperationResponse>('/network/bond', request);
      await Promise.all([
        this.fetchBonds(),
        this.fetchInterfaces(),
      ]);
      return response || {};
    } catch (error) {
      console.error('Error creating bond:', error);
      throw error;
    }
  },

  // Delete bond
  async deleteBond(name: string): Promise<boolean> {
    try {
      await api.delete(`/network/bond/${name}`);
      await this.fetchBonds();
      return true;
    } catch (error) {
      console.error('Error deleting bond:', error);
      return false;
    }
  },

  // Create VLAN
  async createVlan(request: VLANRequest): Promise<NetworkOperationResponse> {
    try {
      const response = await api.post<NetworkOperationResponse>('/network/vlan', request);
      await Promise.all([
        this.fetchVlans(),
        this.fetchInterfaces(),
      ]);
      return response || {};
    } catch (error) {
      console.error('Error creating VLAN:', error);
      throw error;
    }
  },

  // Delete VLAN
  async deleteVlan(name: string): Promise<boolean> {
    try {
      await api.delete(`/network/vlan/${name}`);
      await this.fetchVlans();
      return true;
    } catch (error) {
      console.error('Error deleting VLAN:', error);
      return false;
    }
  },

  // Update bridge
  async updateBridge(name: string, request: BridgeUpdateRequest): Promise<NetworkOperationResponse> {
    try {
      const response = await api.put<NetworkOperationResponse>(`/network/bridge/${name}`, request);
      await Promise.all([
        this.fetchBridges(),
        this.fetchInterfaces(),
      ]);
      return response || {};
    } catch (error) {
      console.error('Error updating bridge:', error);
      throw error;
    }
  },

  // Update bond
  async updateBond(name: string, request: BondUpdateRequest): Promise<NetworkOperationResponse> {
    try {
      const response = await api.put<NetworkOperationResponse>(`/network/bond/${name}`, request);
      await Promise.all([
        this.fetchBonds(),
        this.fetchInterfaces(),
      ]);
      return response || {};
    } catch (error) {
      console.error('Error updating bond:', error);
      throw error;
    }
  },

  // Update VLAN
  async updateVlan(name: string, request: VLANUpdateRequest): Promise<NetworkOperationResponse> {
    try {
      const response = await api.put<NetworkOperationResponse>(`/network/vlan/${name}`, request);
      await Promise.all([
        this.fetchVlans(),
        this.fetchInterfaces(),
      ]);
      return response || {};
    } catch (error) {
      console.error('Error updating VLAN:', error);
      throw error;
    }
  },

  // Update interface address
  async updateInterfaceAddress(interfaceName: string, request: AddressUpdateRequest): Promise<NetworkOperationResponse> {
    try {
      const response = await api.put<NetworkOperationResponse>(`/network/interfaces/${interfaceName}/address`, request);
      await this.fetchInterfaces();
      return response || {};
    } catch (error) {
      console.error('Error updating interface address:', error);
      throw error;
    }
  },


  // UI Actions
  selectInterface(iface: NetworkInterface | null) {
    $selectedInterface.set(iface);
  },

  setSearchQuery(query: string) {
    $searchQuery.set(query);
  },

  setSelectedType(type: string) {
    $selectedType.set(type);
  },

  setBridgeSearchQuery(query: string) {
    $bridgeSearchQuery.set(query);
  },

  setBondSearchQuery(query: string) {
    $bondSearchQuery.set(query);
  },

  setVlanSearchQuery(query: string) {
    $vlanSearchQuery.set(query);
  },

  // Clear all errors
  clearErrors() {
    $interfacesError.set(null);
    $bridgesError.set(null);
    $bondsError.set(null);
    $vlansError.set(null);
  },

  // Reset UI state
  resetUIState() {
    $selectedInterface.set(null);
    $searchQuery.set('');
    $selectedType.set('all');
    $bridgeSearchQuery.set('');
    $bondSearchQuery.set('');
    $vlanSearchQuery.set('');
  },
};

// ============ Store Initialization ============
export async function initializeNetworkStore() {
  try {
    await networkActions.fetchAll();
  } catch (error) {
    console.error('Failed to initialize network store:', error);
  }
}

// ============ Store Cleanup ============
export function cleanupNetworkStore() {
  // Reset all state
  $interfaces.set([]);
  $bridges.set([]);
  $bonds.set([]);
  $vlans.set([]);
  
  // Clear errors
  networkActions.clearErrors();
  
  // Reset UI state
  networkActions.resetUIState();
}

// Export default for convenience
export default {
  // State atoms
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
  
  // UI state
  $selectedInterface,
  $searchQuery,
  $selectedType,
  $bridgeSearchQuery,
  $bondSearchQuery,
  $vlanSearchQuery,
  
  // Computed atoms
  $interfaceTypes,
  $filteredInterfaces,
  $filteredBridges,
  $filteredBonds,
  $filteredVlans,
  $networkStats,
  
  // Actions
  ...networkActions,
  
  // Lifecycle
  initializeNetworkStore,
  cleanupNetworkStore,
};
