# Testing Guide for Vapor Web UI

This directory contains the test suite for the Vapor web UI, built with Vitest and designed for testing Lit components.

## Test Structure

```
test/
├── README.md           # This file
├── setup.ts           # Test environment setup
├── test-utils.ts      # Utility functions for testing
├── api.test.ts        # API module tests
├── components/        # Component tests
│   └── tab-bar.test.ts
└── views/             # View component tests
    ├── dashboard-tab.test.ts
    ├── network-tab.test.ts
    └── storage-tab.test.ts
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test dashboard-tab
```

## Writing Tests

### Basic Component Test

```typescript
import { describe, it, expect } from 'vitest';
import { html } from 'lit';
import { fixture, cleanup, shadowQuery } from '../test-utils';
import '../src/components/my-component';
import type { MyComponent } from '../src/components/my-component';

describe('MyComponent', () => {
  let element: MyComponent;

  afterEach(() => {
    cleanup();
  });

  it('should render', async () => {
    element = await fixture<MyComponent>(html`<my-component></my-component>`);
    expect(element).toHaveShadowRoot();
  });
});
```

### Testing with Properties

```typescript
it('should accept properties', async () => {
  const title = 'Test Title';
  element = await fixture<MyComponent>(html`
    <my-component .title=${title}></my-component>
  `);
  
  expect(element.title).toBe(title);
  const titleElement = shadowQuery(element, 'h1');
  expect(titleElement?.textContent).toBe(title);
});
```

### Testing Events

```typescript
it('should emit custom event', async () => {
  element = await fixture<MyComponent>(html`<my-component></my-component>`);
  
  const eventHandler = vi.fn();
  element.addEventListener('my-event', eventHandler);
  
  const button = shadowQuery<HTMLButtonElement>(element, 'button');
  button?.click();
  
  expect(eventHandler).toHaveBeenCalled();
});
```

### Testing with API Mocks

```typescript
// Mock the API module
vi.mock('../src/api', () => ({
  api: mockApi(),
}));

it('should fetch data', async () => {
  const { api } = vi.mocked(require('../src/api'));
  api.get.mockResolvedValue({ data: 'test' });
  
  element = await fixture<MyComponent>(html`<my-component></my-component>`);
  await elementUpdated(element);
  
  expect(api.get).toHaveBeenCalledWith('/endpoint');
});
```

## Test Utilities

### `fixture<T>(template: TemplateResult): Promise<T>`
Renders a Lit template and returns the element.

### `cleanup(): void`
Cleans up the DOM after tests.

### `shadowQuery<T>(element: Element, selector: string): T | null`
Queries an element's shadow DOM.

### `shadowQueryAll<T>(element: Element, selector: string): T[]`
Queries all matching elements in shadow DOM.

### `elementUpdated<T extends LitElement>(element: T): Promise<void>`
Waits for a Lit element to complete its update cycle.

### `dispatchEvent(element: Element, type: string, detail?: any): void`
Dispatches a custom event on an element.

### `mockApi()`
Creates a mock API object with vi.fn() methods.

### `mockWebSocketManager()`
Creates a mock WebSocket manager.

## Best Practices

1. **Always clean up after tests**: Use the `cleanup()` function in `afterEach()`.

2. **Wait for updates**: Always await `elementUpdated()` after property changes.

3. **Use shadow DOM utilities**: Use `shadowQuery` and `shadowQueryAll` for querying shadow DOM.

4. **Mock external dependencies**: Mock API calls and WebSocket connections.

5. **Test user interactions**: Test clicks, keyboard events, and form inputs.

6. **Test error states**: Include tests for error handling and edge cases.

7. **Keep tests focused**: Each test should verify one specific behavior.

## Coverage Reports

After running `npm run test:coverage`, open the coverage report:

```bash
open coverage/index.html
```

The coverage report shows:
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage

Aim for at least 80% coverage for critical components.

## Debugging Tests

1. **Use console.log**: Add logging to understand test flow.

2. **Use debugger**: Add `debugger` statements and run tests with:
   ```bash
   npm test -- --browser
   ```

3. **Inspect DOM**: Use `console.log(element.shadowRoot?.innerHTML)` to see rendered content.

4. **Check mock calls**: Use `expect(mockFn).toHaveBeenCalledWith(...)` to verify arguments.

## Common Issues

### Tests fail with "Cannot read properties of null"
- Ensure you're using `shadowQuery` instead of regular `querySelector`
- Wait for `elementUpdated()` after property changes

### WebSocket or fetch is not defined
- Check that mocks are properly set up in `test/setup.ts`
- Ensure vi.mock() is called before imports

### Tests timeout
- Increase timeout: `it('test', { timeout: 10000 }, async () => {})`
- Check for infinite loops or missing mock responses

### Chart.js errors
- Chart.js is mocked in tests, ensure the mock matches your usage
