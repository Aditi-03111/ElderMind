import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        home: path.resolve(__dirname, 'index.html'),
        medication: path.resolve(__dirname, 'medication.html'),
        activity: path.resolve(__dirname, 'activity.html'),
        alert: path.resolve(__dirname, 'alert.html'),
        summary: path.resolve(__dirname, 'summary.html'),
      },
    },
  },
})
