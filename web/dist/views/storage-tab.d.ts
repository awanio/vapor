import { I18nLitElement } from '../i18n-mixin';
import type { Disk, VolumeGroup, LogicalVolume, PhysicalVolume, RAIDDevice, RAIDDisk, ISCSITarget, ISCSISession, MultipathDevice } from '../types/api';
export declare class StorageTab extends I18nLitElement {
    disks: Disk[];
    volumeGroups: VolumeGroup[];
    logicalVolumes: LogicalVolume[];
    physicalVolumes: PhysicalVolume[];
    raidDevices: RAIDDevice[];
    availableRaidDisks: RAIDDisk[];
    iscsiTargets: ISCSITarget[];
    iscsiSessions: ISCSISession[];
    multipathDevices: MultipathDevice[];
    btrfsSubvolumes: string[];
    activeSection: 'disks' | 'lvm' | 'raid' | 'iscsi' | 'multipath' | 'btrfs';
    subRoute: string | null;
    loading: boolean;
    error: string;
    static styles: import("lit").CSSResult;
    static get properties(): {
        subRoute: {
            type: StringConstructor;
            attribute: string;
        };
    };
    connectedCallback(): void;
    updated(changedProperties: Map<string, any>): void;
    private updateActiveSection;
    disconnectedCallback(): void;
    handlePopState(): void;
    loadData(): Promise<void>;
    fetchDisks(): Promise<void>;
    fetchLVM(): Promise<void>;
    fetchRAID(): Promise<void>;
    fetchiSCSI(): Promise<void>;
    fetchMultipath(): Promise<void>;
    fetchBTRFS(): Promise<void>;
    formatBytes(bytes: number): string;
    renderDisksSection(): import("lit-html").TemplateResult<1>;
    renderLVMSection(): import("lit-html").TemplateResult<1>;
    renderRAIDSection(): import("lit-html").TemplateResult<1>;
    renderISCSISection(): import("lit-html").TemplateResult<1>;
    renderMultipathSection(): import("lit-html").TemplateResult<1>;
    renderBTRFSSection(): import("lit-html").TemplateResult<1>;
    renderContent(): import("lit-html").TemplateResult<1>;
    render(): import("lit-html").TemplateResult<1>;
    mountPartition(device: string, mountPoint: string): Promise<void>;
    unmountPartition(mountPoint: string): Promise<void>;
    destroyRAID(device: string): Promise<void>;
    logoutISCSI(target: string): Promise<void>;
    loginISCSI(target: ISCSITarget): Promise<void>;
    showCreateVGDialog(): void;
    showCreateLVDialog(): void;
    showCreateRAIDDialog(): void;
    showDiscoverISCSIDialog(): void;
    showCreateSubvolumeDialog(): void;
}
//# sourceMappingURL=storage-tab.d.ts.map