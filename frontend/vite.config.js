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
        // Optimize chunk splitting for better caching and loading
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor'
            }
            // UI components
            if (id.includes('@radix-ui') || id.includes('lucide-react')) {
              return 'ui-vendor'
            }
            // Charts and visualization
            if (id.includes('recharts')) {
              return 'charts-vendor'
            }
            // Forms and validation
            if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) {
              return 'forms-vendor'
            }
            // State management
            if (id.includes('mobx')) {
              return 'state-vendor'
            }
            // Utilities
            if (id.includes('clsx') || id.includes('class-variance-authority') || id.includes('tailwind-merge')) {
              return 'utils-vendor'
            }
            // Other vendors
            return 'vendor'
          }
          
          // App chunks
          if (id.includes('/pages/')) {
            return 'pages'
          }
          if (id.includes('/components/')) {
            return 'components'
          }
          if (id.includes('/stores/')) {
            return 'stores'
          }
          if (id.includes('/lib/')) {
            return 'lib'
          }
        }
      }
    },
    
    // Performance optimizations
    target: 'es2020', // Modern target for better optimization
    minify: 'esbuild',
    sourcemap: process.env.NODE_ENV === 'development', // Conditional sourcemaps
    
    // Asset optimization
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    
    // Additional optimizations
    reportCompressedSize: false, // Faster builds
    emptyOutDir: true
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
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      'react-hook-form',
      'zod'
    ],
    // Force optimization of these packages
    force: true
  },
  
  // Server optimizations for development
  server: {
    // Enable HTTP/2 for better performance
    https: false,
    // Optimize HMR
    hmr: {
      overlay: false // Disable error overlay for better performance
    }
  },
  
  // Preview server optimizations
  preview: {
    port: 3000,
    strictPort: true
  }
})
