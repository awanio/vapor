import { LitElement, TemplateResult } from 'lit';
import { vi } from 'vitest';

/**
 * Renders a Lit template and returns the element
 */
export async function fixture<T extends HTMLElement>(
  template: TemplateResult
): Promise<T> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  
  // Render template
  const { render } = await import('lit');
  render(template, container);
  
  const element = container.firstElementChild as T;
  
  // Wait for Lit to complete rendering
  if (element instanceof LitElement) {
    await element.updateComplete;
  }
  
  return element;
}

/**
 * Cleans up after tests
 */
export function cleanup() {
  document.body.innerHTML = '';
}

/**
 * Waits for an element to be defined
 */
export async function elementUpdated<T extends LitElement>(element: T): Promise<void> {
  await element.updateComplete;
}

/**
 * Dispatches a custom event on an element
 */
export function dispatchEvent(
  element: Element,
  type: string,
  detail?: any,
  options: EventInit = {}
): void {
  // Use KeyboardEvent for key events so handlers can read event.key
  if (type === 'keydown' || type === 'keyup' || type === 'keypress') {
    const keyboardEvent = new KeyboardEvent(type, {
      bubbles: true,
      composed: true,
      ...(options as KeyboardEventInit),
    });
    element.dispatchEvent(keyboardEvent);
    return;
  }

  const event = new CustomEvent(type, {
    detail,
    bubbles: true,
    composed: true,
    ...options,
  });
  element.dispatchEvent(event);
}

/**
 * Creates a mock API response
 */
export function mockApiResponse<T>(data: T, options: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
}

/**
 * Mocks the api module
 */
export function mockApi() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  };
}

/**
 * Mocks WebSocket manager
 */
export function mockWebSocketManager() {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn().mockReturnValue(() => {}),
    send: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
  };
}

/**
 * Waits for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 1000,
  interval = 50
): Promise<void> {
  const startTime = Date.now();
  
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

/**
 * Gets an element from shadow DOM
 */
export function shadowQuery<T extends Element>(
  element: Element,
  selector: string
): T | null {
  return element.shadowRoot?.querySelector<T>(selector) || null;
}

/**
 * Gets all elements from shadow DOM
 */
export function shadowQueryAll<T extends Element>(
  element: Element,
  selector: string
): T[] {
  return Array.from(element.shadowRoot?.querySelectorAll<T>(selector) || []);
}
