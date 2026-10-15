import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { publicAssetCache } from './build/public-asset-cache'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // These values stay inside the Vite server; only the public mode and API path
  // are serialized. Partial OSS configuration deliberately requires the signer
  // so invalid private deployments report an error instead of using local art.
  const env = loadEnv(mode, process.cwd(), '');
  const artMode = env.GAME_ART_MODE || 'auto';
  const hasPrivateConfig = ['OSS_BUCKET', 'OSS_REGION', 'OSS_ENDPOINT', 'OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET'].some(key => !!env[key]);
  const useArtService = artMode === 'signed' || (artMode === 'auto' && hasPrivateConfig);
  return {

  base: './',
  plugins: [inspectAttr(), react(), publicAssetCache(), {
    name: 'private-art-dev-runtime',
    configureServer(server) {
      if (!useArtService) return;
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== '/runtime-config.js') return next();
        response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.end(`globalThis.__GAME_RUNTIME_CONFIG__ = ${JSON.stringify({ artAssetBaseUrl: '', artMode, artUrlsEndpoint: '/api/art-urls' })};`);
      });
    },
  }],
  server: {
    port: 3000,
    proxy: { '/api/art-urls': 'http://127.0.0.1:3001' },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
