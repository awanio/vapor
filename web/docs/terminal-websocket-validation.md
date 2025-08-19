# Terminal WebSocket Connection Validation Guide

## Overview

This guide explains how to validate that WebSocket terminal connections are completely closed when terminal tabs are closed in your application.

## Quick Start

### Browser Console Commands

Once the app is loaded, you can use these commands directly in the browser console:

```javascript
// Check current connections status
terminalValidator.validate()

// Start real-time monitoring (updates every 5 seconds)
terminalValidator.monitor()

// Stop monitoring
terminalValidator.stopMonitor()

// Check for resource leaks
terminalValidator.checkLeaks()

// Clean up orphaned connections
terminalValidator.cleanup()

// View validation history
terminalValidator.history()
```

## Validation Methods

### 1. Browser DevTools Network Tab

The most straightforward way to validate WebSocket closure:

1. Open Browser DevTools (F12)
2. Go to the **Network** tab
3. Filter by **WS** (WebSocket)
4. Open a terminal tab in your app
5. Look for the `/ws/terminal` connection
6. Close the terminal tab
7. The WebSocket connection should show as **closed** with status code `1000` (Normal Closure)

### 2. Using the Terminal Validator Utility

The `terminal-validation.ts` utility provides comprehensive validation:

```typescript
import { terminalValidator } from '@/utils/terminal-validation';

// Validate all sessions
const results = terminalValidator.validateAllSessions();
console.log(results);

// Start monitoring with callback
terminalValidator.startMonitoring(5000, (summary) => {
  console.log('Active connections:', summary.activeConnections);
  console.log('Orphaned connections:', summary.orphanedConnections);
});
```

### 3. Using the Test Component

Add the terminal connection test component to your app temporarily:

```html
<!-- Add to your app for testing -->
<terminal-connection-test></terminal-connection-test>
```

This provides a UI with:
- Real-time connection monitoring
- Leak detection
- Test actions (create/close sessions)
- Visual status indicators

## What to Check

### ✅ Properly Closed Connection

A properly closed terminal session should have:
- WebSocket state: `CLOSED` (readyState = 3)
- No terminal instance in memory
- No DOM element reference
- Connection status: `disconnected`

### ❌ Potential Issues

Watch out for these problems:

1. **Orphaned Connections**: WebSocket still open but terminal instance destroyed
2. **Memory Leaks**: Terminal instance exists but WebSocket disconnected
3. **Zombie Sessions**: Disconnected sessions that haven't been cleaned up

## Validation Scenarios

### Scenario 1: Close Terminal Tab

```javascript
// 1. Open terminal tab
// 2. Run validation
terminalValidator.validate()
// Note the session ID and status

// 3. Close the terminal tab
// 4. Run validation again
terminalValidator.validate()
// Session should be removed or marked as properly closed
```

### Scenario 2: Navigate Away and Back

```javascript
// 1. Open terminal tab
// 2. Start monitoring
terminalValidator.monitor()

// 3. Navigate to another tab
// 4. Navigate back to terminal tab
// 5. Check console output
// Connection should persist (for persistent terminals) or reconnect cleanly
```

### Scenario 3: Multiple Terminal Sessions

```javascript
// 1. Open multiple terminal tabs
// 2. Check all connections
terminalValidator.validate()

// 3. Close specific tabs
// 4. Validate only closed tabs have disconnected WebSockets
terminalValidator.checkLeaks()
```

## Understanding the Results

### Validation Summary Structure

```typescript
{
  totalSessions: 3,           // Total terminal sessions in store
  activeConnections: 2,       // WebSockets with OPEN state
  orphanedConnections: 0,     // WebSockets open without terminal
  properlyClosedSessions: 1,  // Fully cleaned up sessions
  sessions: [...],            // Detailed session info
  warnings: [...]             // Any detected issues
}
```

### WebSocket Ready States

- `0` - CONNECTING: Initial connection state
- `1` - OPEN: Active connection
- `2` - CLOSING: Close initiated
- `3` - CLOSED: Connection closed

## Automated Testing

### Unit Test Example

```typescript
describe('Terminal WebSocket Cleanup', () => {
  it('should close WebSocket when terminal tab is closed', async () => {
    // Create session
    const sessionId = await terminalStore.createSession('Test');
    
    // Validate connection is open
    let validation = terminalValidator.validateSession(
      terminalSessions.get().get(sessionId)!
    );
    expect(validation.isWebSocketConnected).toBe(true);
    
    // Close session
    terminalStore.closeSession(sessionId);
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Validate connection is closed
    const sessions = terminalSessions.get();
    expect(sessions.has(sessionId)).toBe(false);
  });
});
```

### E2E Test Example

```typescript
test('terminal cleanup on tab close', async ({ page }) => {
  // Navigate to app
  await page.goto('/');
  
  // Open terminal
  await page.click('[data-test="terminal-tab"]');
  
  // Check WebSocket in DevTools protocol
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  
  let wsClosedPromise = new Promise(resolve => {
    cdp.on('Network.webSocketClosed', (params) => {
      if (params.url.includes('/ws/terminal')) {
        resolve(params);
      }
    });
  });
  
  // Close terminal tab
  await page.click('[data-test="close-terminal"]');
  
  // Verify WebSocket closed
  const closeEvent = await wsClosedPromise;
  expect(closeEvent).toBeDefined();
});
```

## Common Issues and Solutions

### Issue: WebSocket remains open after closing terminal

**Solution**: Ensure `closeSession` is called properly:
```typescript
// In your terminal component
disconnectedCallback() {
  if (this.sessionId) {
    terminalStore.closeSession(this.sessionId);
  }
}
```

### Issue: Memory leak - terminal instance not disposed

**Solution**: Check disposal in terminal store:
```typescript
private disposeTerminalInstance(session: TerminalSessionState) {
  if (session.terminal) {
    session.terminal.dispose();
    session.terminal = undefined;
  }
  // Dispose addons...
}
```

### Issue: Reconnection attempts after manual close

**Solution**: Use proper close code:
```typescript
// Normal closure - no reconnection
ws.close(1000, 'Normal closure');

// vs Abnormal closure - triggers reconnection
ws.close(1006, 'Abnormal closure');
```

## Performance Monitoring

Monitor for performance impact:

```javascript
// Check for resource leaks over time
setInterval(() => {
  const leaks = terminalValidator.checkForLeaks();
  if (leaks.hasLeaks) {
    console.error('Memory leak detected:', leaks.details);
    // Optional: Auto-cleanup
    terminalValidator.cleanup();
  }
}, 60000); // Check every minute
```

## Summary

To validate terminal WebSocket connections are properly closed:

1. **Use Browser DevTools** for quick visual verification
2. **Use terminalValidator** for programmatic validation
3. **Monitor for leaks** in production
4. **Test cleanup** in your test suite
5. **Handle edge cases** like navigation and reconnection

The key indicators of proper cleanup:
- WebSocket shows as closed in Network tab
- No orphaned connections in validation
- Memory usage returns to baseline
- No reconnection attempts after manual close
