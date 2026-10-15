FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build -- --base=/

FROM node:24-alpine AS server-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

FROM node:24-alpine AS signer
WORKDIR /app
COPY --from=server-deps /app/node_modules ./node_modules
COPY --from=build /app/dist-server ./dist-server
COPY server ./server
COPY package.json ./
USER node
ENV HOST=0.0.0.0 PORT=3001 NODE_ENV=production
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/art-server.mjs"]

FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 docker/40-game-runtime-config.sh /docker-entrypoint.d/40-game-runtime-config.sh
COPY --from=build /app/dist /usr/share/nginx/html
USER nginx
ENV GAME_ASSET_BASE_URL="" GAME_ART_MODE=auto
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -fsS -o /dev/null http://127.0.0.1:8080/index.html || exit 1
