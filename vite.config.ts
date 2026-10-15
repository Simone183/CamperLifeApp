import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: '/',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(process.env.GOOGLE_MAPS_PLATFORM_KEY || '')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      entries: ['index.html'],
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild' as const,
      chunkSizeWarningLimit: 5000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('leaflet') || id.includes('maplibre') || id.includes('googlemaps') || id.includes('vis.gl')) {
                return 'vendor-maps';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('jimp')) {
                return 'vendor-pdf';
              }
              if (id.includes('hls.js')) {
                return 'vendor-hls';
              }
            }
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
