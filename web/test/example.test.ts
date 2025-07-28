import { describe, it, expect } from 'vitest';

describe('Example Test', () => {
  it('should pass basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('should work with async code', async () => {
    const promise = Promise.resolve('hello');
    const result = await promise;
    expect(result).toBe('hello');
  });

  it('should have access to DOM', () => {
    const div = document.createElement('div');
    div.textContent = 'Test';
    document.body.appendChild(div);
    
    expect(document.body.contains(div)).toBe(true);
    expect(div.textContent).toBe('Test');
    
    // Cleanup
    document.body.removeChild(div);
  });
});
