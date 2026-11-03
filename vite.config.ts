import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('src/components/VillageCMSView')) {
              return 'admin-tab-cms';
            }
            if (id.includes('src/components/VillageAdministrationBooksView')) {
              return 'admin-tab-books';
            }
            if (id.includes('src/components/VillageCalendarView')) {
              return 'admin-tab-calendar';
            }
            if (id.includes('src/components/VillageAnalyticsCharts')) {
              return 'admin-tab-analytics';
            }
            if (id.includes('src/components/MediaGalleryPicker')) {
              return 'admin-tab-media';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
