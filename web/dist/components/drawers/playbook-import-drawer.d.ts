import { LitElement } from 'lit';
type ImportType = 'upload' | 'template' | 'git' | 'url' | 'galaxy';
export declare class PlaybookImportDrawer extends LitElement {
    show: boolean;
    importType: ImportType;
    private loading;
    private error;
    private templates;
    private selectedTemplate?;
    private uploadFile?;
    private uploadName;
    private uploadOverwrite;
    private templateName;
    private templateVariables;
    private gitUrl;
    private gitBranch;
    private gitPath;
    private gitAuthToken;
    private gitSshKey;
    private gitSyncAsSymlink;
    private urlSource;
    private urlName;
    private galaxyType;
    private galaxyName;
    private galaxyVersion;
    private galaxyRequirementsFile;
    private galaxyForce;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    private loadTemplates;
    private handleClose;
    private resetForm;
    private handleSubmit;
    private handleUpload;
    private handleTemplate;
    private handleGit;
    private handleUrl;
    private handleGalaxy;
    private handleFileSelect;
    private renderUploadForm;
    private renderTemplateForm;
    private renderGitForm;
    private renderUrlForm;
    private renderGalaxyForm;
    private getTitle;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'playbook-import-drawer': PlaybookImportDrawer;
    }
}
export {};
//# sourceMappingURL=playbook-import-drawer.d.ts.map