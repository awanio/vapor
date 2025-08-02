import { LitElement } from 'lit';
interface User {
    username: string;
    uid: number;
    gid: number;
    groups: string[];
    home: string;
    shell: string;
}
interface NewUser {
    username: string;
    password: string;
    groups: string;
}
export declare class UsersTab extends LitElement {
    users: User[];
    showCreateForm: boolean;
    newUser: NewUser;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    fetchUsers(): Promise<void>;
    createUser(): Promise<void>;
    deleteUser(username: string): Promise<void>;
    updateNewUser(field: keyof NewUser, value: string): void;
    renderCreateForm(): "" | import("lit-html").TemplateResult<1>;
    renderUser(user: User): import("lit-html").TemplateResult<1>;
    render(): import("lit-html").TemplateResult<1>;
}
export {};
//# sourceMappingURL=users-tab.d.ts.map