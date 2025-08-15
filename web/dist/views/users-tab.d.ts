import { LitElement } from 'lit';
import '../components/modal-dialog';
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
    showEditForm: boolean;
    showResetPasswordForm: boolean;
    newUser: NewUser;
    editingUser: User | null;
    userToDelete: string | null;
    resetPasswordUsername: string | null;
    newPassword: string;
    confirmPassword: string;
    searchQuery: string;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private handleDocumentClick;
    private handleKeyDown;
    fetchUsers(): Promise<void>;
    createUser(): Promise<void>;
    deleteUser(): Promise<void>;
    openDeleteModal(username: string): void;
    closeDeleteModal(): void;
    openResetPasswordDrawer(username: string): void;
    closeResetPasswordDrawer(): void;
    resetPassword(): Promise<void>;
    openEditDrawer(username: string): void;
    closeEditDrawer(): void;
    updateUser(): Promise<void>;
    updateEditingUser(field: keyof User, value: any): void;
    toggleActionMenu(event: Event, menuId: string): void;
    closeAllMenus(): void;
    updateNewUser(field: keyof NewUser, value: string): void;
    closeCreateDrawer(): void;
    handleSearch(event: Event): void;
    clearSearch(): void;
    get filteredUsers(): User[];
    render(): import("lit-html").TemplateResult<1>;
}
export {};
//# sourceMappingURL=users-tab.d.ts.map