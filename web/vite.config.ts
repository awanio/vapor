import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  // You can also use env variables in the config itself
  const isDevelopment = mode === 'development';
  const isProduction = mode === 'production';
  
  console.log(`Building for ${mode} mode`);
  
  return {
    // Define global constants that can be used in the app
    define: {
      '__APP_VERSION__': JSON.stringify(process.env.npm_package_version),
      '__BUILD_TIME__': JSON.stringify(new Date().toISOString()),
      '__BUILD_MODE__': JSON.stringify(mode),
      // Fix for libraries that check process.env.NODE_ENV (like nanostores)
      // This is required for production builds to work correctly
      'process.env.NODE_ENV': JSON.stringify(mode)
    },
    
    build: {
      lib: {
        entry: 'src/main.ts',
        formats: ['es']
      },
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        }
      },
      // Optimize build for production
      minify: isProduction ? 'terser' : false,
      sourcemap: isDevelopment,
      // Increase chunk size warning limit for production
      chunkSizeWarningLimit: isProduction ? 1000 : 500
    },
    
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@components': resolve(__dirname, './src/components'),
        '@views': resolve(__dirname, './src/views'),
        '@types': resolve(__dirname, './src/types'),
        '@stores': resolve(__dirname, './src/stores'),
        '@utils': resolve(__dirname, './src/utils')
      }
    },
    
    server: {
      // CORS is handled by the API server directly
      // No proxy needed - the app connects directly to the API
      cors: true,
      port: parseInt(env.VITE_PORT || '5173'),
      host: true,
      // Enable SPA fallback for client-side routing
      historyApiFallback: true,
      
      // Optional: Add proxy configuration for development if needed
      // This can be useful if you want to proxy API calls in development
      // proxy: isDevelopment && env.VITE_API_PROXY ? {
      //   '/api': {
      //     target: env.VITE_API_PROXY,
      //     changeOrigin: true,
      //     secure: false
      //   },
      //   '/ws': {
      //     target: env.VITE_API_PROXY,
      //     ws: true,
      //     changeOrigin: true
      //   }
      // } : undefined
    },
    
    // Optimize dependencies for better performance
    optimizeDeps: {
      include: ['lit', 'nanostores', 'xterm', 'chart.js']
    }
  };
});
