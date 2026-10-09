FROM node:24-alpine AS build

WORKDIR /app

# Install from the lockfile before copying sources to reuse the dependency layer.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# The server serves at /; absolute asset URLs also work after a nested SPA refresh.
RUN npm run build -- --base=/

FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

USER nginx
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -fsS -o /dev/null http://127.0.0.1:8080/index.html || exit 1
