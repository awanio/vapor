import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { html } from 'lit';
import { fixture, cleanup, shadowQuery, shadowQueryAll, elementUpdated, dispatchEvent } from '../test-utils';
import '../../src/components/tab-bar';
import type { TabBar } from '../../src/components/tab-bar';

describe('TabBar', () => {
  let element: TabBar;

  const mockTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'network', label: 'Network', icon: '🌐' },
    { id: 'storage', label: 'Storage', icon: '💾' },
  ];

  afterEach(() => {
    cleanup();
  });

  it('should render with tabs', async () => {
    element = await fixture<TabBar>(html`
      <tab-bar .tabs=${mockTabs} activeTab="dashboard"></tab-bar>
    `);
    
    expect(element).toHaveShadowRoot();
    const tabs = shadowQueryAll(element, '.tab');
    expect(tabs).toHaveLength(mockTabs.length);
  });

  it('should highlight active tab', async () => {
    element = await fixture<TabBar>(html`
      <tab-bar .tabs=${mockTabs} activeTab="network"></tab-bar>
    `);
    
    const tabs = shadowQueryAll(element, '.tab');
    const activeTab = tabs.find(tab => tab.classList.contains('active'));
    
    expect(activeTab).toBeTruthy();
    expect(activeTab?.textContent).toContain('Network');
  });

  it('should emit tab-changed event on tab click', async () => {
    element = await fixture<TabBar>(html`
      <tab-bar .tabs=${mockTabs} activeTab="dashboard"></tab-bar>
    `);
    
    const tabChangedHandler = vi.fn();
    element.addEventListener('tab-changed', tabChangedHandler);
    
    // Click on the network tab
    const networkTab = shadowQueryAll(element, '.tab')[1];
    networkTab?.click();
    
    expect(tabChangedHandler).toHaveBeenCalled();
    expect(tabChangedHandler.mock.calls[0][0].detail).toEqual({ tabId: 'network' });
  });

  it('should not emit event when clicking active tab', async () => {
    element = await fixture<TabBar>(html`
      <tab-bar .tabs=${mockTabs} activeTab="dashboard"></tab-bar>
    `);
    
    const tabChangedHandler = vi.fn();
    element.addEventListener('tab-changed', tabChangedHandler);
    
    // Click on the already active dashboard tab
    const dashboardTab = shadowQueryAll(element, '.tab')[0];
    dashboardTab?.click();
    
    expect(tabChangedHandler).not.toHaveBeenCalled();
  });

  it('should update active tab when property changes', async () => {
    element = await fixture<TabBar>(html`
      <tab-bar .tabs=${mockTabs} activeTab="dashboard"></tab-bar>
    `);
    
    // Change active tab
    element.activeTab = 'storage';
    await elementUpdated(element);
    
    const tabs = shadowQueryAll(element, '.tab');
    const activeTab = tabs.find(tab => tab.classList.contains('active'));
    
    expect(activeTab?.textContent).toContain('Storage');
  });

  it('should render tab icons', async () => {
    element = await fixture<TabBar>(html`
      <tab-bar .tabs=${mockTabs} activeTab="dashboard"></tab-bar>
    `);
    
    const tabs = shadowQueryAll(element, '.tab');
    tabs.forEach((tab, index) => {
      expect(tab.textContent).toContain(mockTabs[index].icon);
    });
  });

  it('should handle keyboard navigation', async () => {
    element = await fixture<TabBar>(html`
      <tab-bar .tabs=${mockTabs} activeTab="dashboard"></tab-bar>
    `);
    
    const tabChangedHandler = vi.fn();
    element.addEventListener('tab-changed', tabChangedHandler);
    
    // Simulate arrow key navigation
    const tabBar = shadowQuery(element, '.tab-bar');
    if (tabBar) {
      // Press right arrow
      dispatchEvent(tabBar, 'keydown', {}, { key: 'ArrowRight' });
      
      // Should move to next tab
      expect(tabChangedHandler).toHaveBeenCalledWith(
        expect.objectContaining({ detail: { tabId: 'network' } })
      );
    }
  });

  it('should wrap around on keyboard navigation', async () => {
    element = await fixture<TabBar>(html`
      <tab-bar .tabs=${mockTabs} activeTab="storage"></tab-bar>
    `);
    
    const tabChangedHandler = vi.fn();
    element.addEventListener('tab-changed', tabChangedHandler);
    
    const tabBar = shadowQuery(element, '.tab-bar');
    if (tabBar) {
      // Press right arrow from last tab
      dispatchEvent(tabBar, 'keydown', {}, { key: 'ArrowRight' });
      
      // Should wrap to first tab
      expect(tabChangedHandler).toHaveBeenCalledWith(
        expect.objectContaining({ detail: { tabId: 'dashboard' } })
      );
    }
  });

  it('should handle empty tabs array', async () => {
    element = await fixture<TabBar>(html`
      <tab-bar .tabs=${[]} activeTab=""></tab-bar>
    `);
    
    const tabs = shadowQueryAll(element, '.tab');
    expect(tabs).toHaveLength(0);
  });

  it('should add custom CSS classes', async () => {
    element = await fixture<TabBar>(html`
      <tab-bar .tabs=${mockTabs} activeTab="dashboard" class="custom-class"></tab-bar>
    `);
    
    expect(element.classList.contains('custom-class')).toBe(true);
  });
});
