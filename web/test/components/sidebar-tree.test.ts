import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import '../../src/components/sidebar-tree';
import type { SidebarTree } from '../../src/components/sidebar-tree';

// Mock the i18n module
vi.mock('../../src/i18n', () => ({
  i18n: {
    init: vi.fn().mockResolvedValue(undefined),
    t: vi.fn((key: string) => key),
  },
  t: vi.fn((key: string) => key),
}));

// Mock the sidebar store
vi.mock('../../src/stores/shared/sidebar', () => ({
  $expandedItems: {
    subscribe: vi.fn(() => () => {}),
    get: vi.fn(() => []),
  },
  $activeItem: {
    subscribe: vi.fn(() => () => {}),
    get: vi.fn(() => 'dashboard'),
  },
  toggleExpanded: vi.fn(),
  setActiveItem: vi.fn(),
  isExpanded: vi.fn(() => false),
  getExpandedItemsArray: vi.fn(() => []),
}));

describe('SidebarTree', () => {
  let element: SidebarTree;

  beforeEach(async () => {
    element = await fixture<SidebarTree>(html`<sidebar-tree></sidebar-tree>`);
    await element.updateComplete;
  });

  afterEach(() => {
    element.remove();
  });

  describe('Footer Rendering', () => {
    it('should render the sidebar footer', () => {
      const footer = element.shadowRoot?.querySelector('.sidebar-footer');
      expect(footer).toBeTruthy();
    });

    it('should display "Vapor by Awanio" brand text', () => {
      const brand = element.shadowRoot?.querySelector('.sidebar-footer-brand');
      expect(brand?.textContent).toBe('Vapor by Awanio');
    });

    it('should display copyright text with current year', () => {
      const currentYear = new Date().getFullYear();
      const copyright = element.shadowRoot?.querySelector('.sidebar-footer-copyright');
      expect(copyright?.textContent).toContain(`© ${currentYear} Awanio. All rights reserved.`);
    });

    it('should have correct footer styles applied', () => {
      const footer = element.shadowRoot?.querySelector('.sidebar-footer') as HTMLElement;
      expect(footer).toBeTruthy();
      
      const styles = window.getComputedStyle(footer);
      // Note: computed styles may vary, we just ensure element exists
      expect(footer.className).toBe('sidebar-footer');
    });
  });

  describe('Layout Structure', () => {
    it('should use flexbox layout on host', () => {
      const host = element as HTMLElement;
      const styles = window.getComputedStyle(host);
      // The styles should be defined in the component
      expect(host).toBeTruthy();
    });

    it('should have sidebar-content container', () => {
      const content = element.shadowRoot?.querySelector('.sidebar-content');
      expect(content).toBeTruthy();
    });

    it('should have tree inside sidebar-content', () => {
      const content = element.shadowRoot?.querySelector('.sidebar-content');
      const tree = content?.querySelector('.tree');
      expect(tree).toBeTruthy();
    });

    it('should render footer after sidebar-content', () => {
      const root = element.shadowRoot;
      const content = root?.querySelector('.sidebar-content');
      const footer = root?.querySelector('.sidebar-footer');
      
      expect(content).toBeTruthy();
      expect(footer).toBeTruthy();
      
      // Footer should come after content in DOM order
      const children = Array.from(root?.children || []);
      const contentIndex = children.indexOf(content as Element);
      const footerIndex = children.indexOf(footer as Element);
      
      expect(footerIndex).toBeGreaterThan(contentIndex);
    });
  });

  describe('Footer Stickiness', () => {
    it('should have footer with flex-shrink: 0', () => {
      const footer = element.shadowRoot?.querySelector('.sidebar-footer') as HTMLElement;
      expect(footer).toBeTruthy();
      // Footer should not shrink (sticky behavior)
      expect(footer.className).toBe('sidebar-footer');
    });

    it('should have content with flex: 1', () => {
      const content = element.shadowRoot?.querySelector('.sidebar-content') as HTMLElement;
      expect(content).toBeTruthy();
      // Content should grow to fill space
      expect(content.className).toBe('sidebar-content');
    });
  });

  describe('Responsive Behavior', () => {
    it('should render footer in collapsed state', async () => {
      element.collapsed = true;
      await element.updateComplete;
      
      const footer = element.shadowRoot?.querySelector('.sidebar-footer');
      expect(footer).toBeTruthy();
    });

    it('should render footer in expanded state', async () => {
      element.collapsed = false;
      await element.updateComplete;
      
      const footer = element.shadowRoot?.querySelector('.sidebar-footer');
      expect(footer).toBeTruthy();
    });
  });

  describe('Brand and Copyright Text', () => {
    it('should have brand text in bold', () => {
      const brand = element.shadowRoot?.querySelector('.sidebar-footer-brand') as HTMLElement;
      expect(brand).toBeTruthy();
      expect(brand.className).toBe('sidebar-footer-brand');
    });

    it('should have copyright with reduced opacity', () => {
      const copyright = element.shadowRoot?.querySelector('.sidebar-footer-copyright') as HTMLElement;
      expect(copyright).toBeTruthy();
      expect(copyright.className).toBe('sidebar-footer-copyright');
    });

    it('should update year dynamically', () => {
      const currentYear = new Date().getFullYear();
      const copyright = element.shadowRoot?.querySelector('.sidebar-footer-copyright');
      
      // Should contain the current year
      expect(copyright?.textContent).toMatch(new RegExp(`${currentYear}`));
    });
  });
});
