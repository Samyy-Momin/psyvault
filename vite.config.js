import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      checks: {
        pluginTimings: false,
      },
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'reader-vendor',
              test: /node_modules[\\/](pdfjs-dist|react-pdf)/,
              priority: 30,
            },
            {
              name: 'quote-vendor',
              test: /node_modules[\\/]html2canvas/,
              priority: 25,
            },
            {
              name: 'firebase',
              test: /node_modules[\\/]firebase/,
              priority: 20,
            },
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom|scheduler)/,
              priority: 15,
            },
          ],
        },
      },
    },
  },
})
