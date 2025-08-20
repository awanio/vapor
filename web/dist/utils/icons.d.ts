import { TemplateResult } from 'lit';
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type IconCategory = 'tech' | 'custom';
export declare const TECH_ICONS: Record<string, string>;
export declare function getIconPath(name: string, category?: IconCategory): string;
export declare function renderIcon(name: string, options?: {
    size?: IconSize;
    category?: IconCategory;
    className?: string;
    alt?: string;
}): TemplateResult;
export declare function loadInlineIcon(name: string, category?: IconCategory): Promise<string>;
export declare function renderInlineIcon(name: string, options?: {
    size?: IconSize;
    category?: IconCategory;
    className?: string;
}): Promise<TemplateResult>;
export declare const icon: typeof renderIcon;
export declare function hasIcon(name: string): boolean;
export declare function getAvailableIcons(): string[];
//# sourceMappingURL=icons.d.ts.map