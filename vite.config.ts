import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { publicAssetCache } from './build/public-asset-cache'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react(), publicAssetCache()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
