import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // CSS optimization
    cssCodeSplit: true,
    cssMinify: 'esbuild',
    
    // Bundle optimization
    rollupOptions: {
      output: {
        // Separate CSS chunks for better caching
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/css/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
        // Optimize chunk splitting
        manualChunks: {
          // Separate vendor chunks for better caching
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          charts: ['recharts'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
        }
      }
    },
    
    // Performance optimizations
    target: 'es2015',
    minify: 'esbuild',
    sourcemap: false, // Disable sourcemaps in production for smaller bundles
    
    // Asset optimization
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
  },
  
  // CSS preprocessing optimizations
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      // Enable CSS optimization features
    }
  },
  
  // Performance optimizations for development
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'mobx',
      'mobx-react-lite',
      'recharts',
      'lucide-react'
    ]
  }
})
