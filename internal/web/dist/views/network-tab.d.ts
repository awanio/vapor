import { LitElement } from 'lit';
import type { NetworkInterface } from '../types/api';
export declare class NetworkTab extends LitElement {
    static styles: import("lit").CSSResult;
    private activeTab;
    private interfaces;
    private bridges;
    private bonds;
    private vlans;
    constructor();
    firstUpdated(): void;
    fetchNetworkData(): Promise<void>;
    fetchInterfaces(): Promise<void>;
    fetchBridges(): Promise<void>;
    fetchBonds(): Promise<void>;
    fetchVlans(): Promise<void>;
    toggleInterfaceState(iface: NetworkInterface): void;
    deleteBridge(name: string): Promise<void>;
    deleteBond(name: string): Promise<void>;
    deleteVlan(name: string): Promise<void>;
    handleConfigureAddress(iface: NetworkInterface): void;
    handleCreateBridge(): void;
    handleCreateBond(): void;
    handleCreateVLANInterface(): void;
    renderInterface(iface: NetworkInterface): import("lit-html").TemplateResult<1>;
    renderTabs(): import("lit-html").TemplateResult<1>;
    render(): import("lit-html").TemplateResult<1>;
}
//# sourceMappingURL=network-tab.d.ts.map