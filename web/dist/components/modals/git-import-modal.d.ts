import { LitElement } from 'lit';
import '../modal-dialog';
export declare class GitImportModal extends LitElement {
    open: boolean;
    private url;
    private branch;
    private path;
    private authToken;
    private sshKey;
    private syncAsSymlink;
    private importing;
    private error?;
    static styles: import("lit").CSSResult;
    private importFromGit;
    private close;
    render(): import("lit-html").TemplateResult<1>;
}
//# sourceMappingURL=git-import-modal.d.ts.map