FROM node:24.19.0-bookworm-slim AS build
WORKDIR /app
ENV HUSKY=0
RUN corepack enable && corepack prepare pnpm@12.19.0 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
# Vazio: o app descobre o servidor sozinho (wss://<host>/ws em HTTPS).
ARG VITE_WS_URL=
ARG VITE_API_URL=
ENV VITE_WS_URL=$VITE_WS_URL \
    VITE_API_URL=$VITE_API_URL
RUN pnpm build

# --- Web: nginx com proxy da API, WebSocket e LiveKit ---------------------------
FROM nginx:1.27-alpine AS web
ARG VERSION=local
LABEL org.opencontainers.image.revision=$VERSION
# Endereço dos serviços de backend, resolvido no start do container.
ENV WS_UPSTREAM=server:5001 LIVEKIT_UPSTREAM=livekit:5002
RUN rm -rf /usr/share/nginx/html/*
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/ /usr/share/nginx/html/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
