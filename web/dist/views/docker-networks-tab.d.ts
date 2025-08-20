import { LitElement } from 'lit';
import type { DockerNetwork } from '../types/api';
export declare class DockerNetworksTab extends LitElement {
    private networks;
    private filteredNetworks;
    private error;
    private loading;
    private searchTerm;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private handleDocumentClick;
    private toggleActionMenu;
    private closeAllMenus;
    fetchNetworks(): Promise<void>;
    private handleSearchInput;
    private filterNetworks;
    isSystemNetwork(network: DockerNetwork): boolean;
    getSubnetInfo(network: DockerNetwork): string;
    render(): import("lit-html").TemplateResult<1>;
    deleteNetwork(name: string): Promise<void>;
}
//# sourceMappingURL=docker-networks-tab.d.ts.map