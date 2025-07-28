import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: 'src/main.ts',
      formats: ['es']
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@views': resolve(__dirname, './src/views'),
      '@types': resolve(__dirname, './src/types')
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://103.179.254.248:8080',
        changeOrigin: true,
        secure: false
      },
      '/ws': {
        target: 'ws://103.179.254.248:8080',
        ws: true,
        changeOrigin: true,
        secure: false
      }
    }
  }
});
