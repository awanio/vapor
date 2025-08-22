/**
 * Test file for verifying store implementations
 * This file can be imported in the browser console to test the stores
 */

import {
  // Auth store
  $isAuthenticated,
  $user,
  $token,
  $permissions,
  login,
  logout,
  hasPermission,
  hasAnyPermission,
  updateSessionConfig,
  
  // UI store
  $theme,
  $language,
  $notifications,
  $isLoading,
  toggleTheme,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  openDrawer,
  closeDrawer,
  startLoading,
  stopLoading
} from './index';

// Make stores available globally for testing
declare global {
  interface Window {
    testStores: any;
  }
}

const testStores = {
  // Auth tests
  auth: {
    // Check authentication status
    checkAuth: () => {
      console.log('Is Authenticated:', $isAuthenticated.get());
      console.log('Current User:', $user.get());
      console.log('Token:', $token.get() ? 'Present' : 'Not present');
      console.log('Permissions:', Array.from($permissions.get()));
    },
    
    // Test login
    testLogin: async (username: string, password: string) => {
      console.log('Testing login...');
      const success = await login({ username, password });
      console.log('Login result:', success);
      if (success) {
        console.log('User after login:', $user.get());
        console.log('Permissions:', Array.from($permissions.get()));
      }
      return success;
    },
    
    // Test logout
    testLogout: () => {
      console.log('Testing logout...');
      logout();
      console.log('Logged out');
    },
    
    // Test permissions
    testPermissions: () => {
      console.log('Testing permissions...');
      console.log('Has admin:', hasPermission('admin'));
      console.log('Has system:manage:', hasPermission('system:manage'));
      console.log('Has any [admin, user]:', hasAnyPermission('admin', 'user'));
    },
    
    // Update session config
    updateSession: (timeout: number) => {
      console.log(`Setting session timeout to ${timeout}ms`);
      updateSessionConfig({ sessionTimeout: timeout });
    }
  },
  
  // UI tests
  ui: {
    // Check UI state
    checkState: () => {
      console.log('Theme:', $theme.get());
      console.log('Language:', $language.get());
      console.log('Notifications:', $notifications.get());
      console.log('Is Loading:', $isLoading.get());
    },
    
    // Test theme toggle
    testTheme: () => {
      const before = $theme.get();
      toggleTheme();
      const after = $theme.get();
      console.log(`Theme changed from ${before} to ${after}`);
    },
    
    // Test notifications
    testNotifications: () => {
      console.log('Testing notifications...');
      showSuccess('Success!', 'Operation completed successfully');
      showError('Error!', 'Something went wrong');
      showWarning('Warning!', 'Please be careful');
      showInfo('Info', 'This is an informational message');
      
      setTimeout(() => {
        console.log('Current notifications:', $notifications.get());
      }, 100);
    },
    
    // Test drawer
    testDrawer: () => {
      console.log('Opening drawer...');
      const id = openDrawer({
        type: 'detail',
        title: 'Test Drawer',
        data: { test: true },
        width: 'medium'
      });
      console.log('Drawer opened with ID:', id);
      
      setTimeout(() => {
        console.log('Closing drawer...');
        closeDrawer();
      }, 3000);
    },
    
    // Test loading states
    testLoading: () => {
      console.log('Starting loading operations...');
      startLoading('test1', 'Loading test 1...');
      startLoading('test2', 'Loading test 2...');
      console.log('Is loading:', $isLoading.get());
      
      setTimeout(() => {
        stopLoading('test1');
        console.log('Stopped test1, is loading:', $isLoading.get());
      }, 2000);
      
      setTimeout(() => {
        stopLoading('test2');
        console.log('Stopped test2, is loading:', $isLoading.get());
      }, 4000);
    }
  },
  
  // Run all tests
  runAll: async () => {
    console.log('=== Running Store Tests ===');
    
    // Auth tests
    console.log('\n--- Auth Store Tests ---');
    testStores.auth.checkAuth();
    
    // UI tests
    console.log('\n--- UI Store Tests ---');
    testStores.ui.checkState();
    testStores.ui.testNotifications();
    testStores.ui.testLoading();
    
    console.log('\n=== Tests Complete ===');
  }
};

// Export for use in browser console
window.testStores = testStores;

// Log availability
console.log('%c[Store Tests] Available at window.testStores', 'color: #4CAF50; font-weight: bold');
console.log('Run window.testStores.runAll() to execute all tests');
console.log('Available test groups:');
console.log('  - window.testStores.auth.*');
console.log('  - window.testStores.ui.*');

export default testStores;
