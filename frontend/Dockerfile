# ── Stage 1 : Build Vite + React ──────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Registre npm surchargeable (Dokploy/Coolify : laisser par défaut)
ARG NPM_REGISTRY=https://registry.npmjs.org
RUN npm config set registry ${NPM_REGISTRY}

COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm npm ci --prefer-offline --no-audit

COPY . .

# VITE_API_URL est figé au moment du build.
# Vide = même origine → le reverse-proxy (Traefik nginx Dokploy) gère /api.
# Non-vide = on pointe vers l'URL absolue de la passerelle (ex: https://api.kraxia.io).
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ── Stage 2 : servir via nginx ─────────────────────────────────────────
FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O- http://127.0.0.1:${PORT}/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
