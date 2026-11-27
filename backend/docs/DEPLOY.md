# Publicação do Backend com Docker

Guia para subir a pilha completa do backend (PostgreSQL 17, Valkey 8, LiveKit,
servidor Node.js e backup diário) num servidor Linux com Docker.

O frontend web (nginx) e o app mobile consomem este backend via HTTP (`/api/*`),
WebSocket (`/ws`) e LiveKit (`/livekit/*`).

## Portas

| Porta         | Serviço                    | Exposição recomendada                              |
| ------------- | -------------------------- | -------------------------------------------------- |
| 5001/tcp      | Servidor (API e WebSocket) | `127.0.0.1` (atrás do nginx/Caddy) ou rede interna |
| 5002/tcp      | LiveKit (sinalização)      | `127.0.0.1` (atrás do proxy `/livekit`)            |
| 5003/tcp      | LiveKit (mídia TCP)        | Aberta no firewall                                 |
| 5100-5200/udp | LiveKit (mídia WebRTC UDP) | Aberta no firewall                                 |

PostgreSQL e Valkey ficam acessíveis apenas na rede interna do Docker.

## 1. Preparar o `.env`

Gere os segredos uma única vez (trocar `POSTGRES_PASSWORD` depois do primeiro
uso impede o acesso ao banco existente):

```bash
SITE=meuescritorio.exemplo.com
PUBLIC_IP=$(curl -fsS https://api.ipify.org)

cat > .env <<EOF
SERVER_BIND=127.0.0.1
PORT=5001

POSTGRES_PASSWORD=$(openssl rand -hex 16)
VALKEY_PASSWORD=$(openssl rand -hex 16)
SESSION_SECRET=$(openssl rand -hex 32)

ALLOWED_EMAILS=voce@gmail.com
ACCOUNT_DOMAINS=
ADMIN_EMAILS=voce@gmail.com
ALLOWED_ORIGINS=https://$SITE
TRUST_PROXY=true

EMAIL_CODES=false

LIVEKIT_API_KEY=escritorio
LIVEKIT_API_SECRET=$(openssl rand -hex 32)
LIVEKIT_NODE_IP=$PUBLIC_IP
LIVEKIT_PUBLIC_URL=wss://$SITE/livekit
EOF
chmod 600 .env
```

## 2. Subir a pilha

```bash
docker compose up -d --build
```

Na primeira subida, o servidor aplica automaticamente as migrações em
`migrations/*.sql`.

## 3. Conferir saúde

```bash
docker compose ps
docker compose logs server --tail 20
curl -fsS http://127.0.0.1:5001/healthz
```

Esperado: todos os serviços `running`/`healthy` e `{"ok":true}` no `/healthz`.

## 4. Conectar com o Frontend (nginx), PWA e Mobile

- **Frontend web (nginx)**: configure `WS_UPSTREAM=<host-backend>:5001` e
  `LIVEKIT_UPSTREAM=<host-backend>:5002` no container web (ou una ambos numa
  rede Docker compartilhada). Em produção HTTPS com `COMPOSE_PROFILES=prod`, o
  `Caddyfile` aplica HSTS, `X-Content-Type-Options`, `X-Frame-Options` e
  `Referrer-Policy` automaticamente.
- **Mobile / PWA**: configure `EXPO_PUBLIC_API_URL=https://<domínio>` e
  `EXPO_PUBLIC_WS_URL=wss://<domínio>/ws`. Para PWA, o HTTPS é obrigatório para
  registro do Service Worker (`/sw.js`), Web Notifications e LiveKit WebRTC.

## Backup e restauração do PostgreSQL

O serviço `backup` grava uma cópia compactada por dia no volume `backups` e
mantém as últimas 7 (`BACKUP_KEEP`).

```bash
# Gerar um backup imediato
docker compose run --rm -e BACKUP_ONCE=1 backup

# Listar backups
docker compose exec backup ls -lh /backups

# Restaurar um backup
gunzip -c virtual-office-AAAAMMDD-HHMMSS.sql.gz | \
  docker compose exec -T postgres psql -U virtual_office virtual_office
```

> Nunca rode `docker compose down -v` em produção: a flag `-v` remove os volumes
> e apaga o banco de dados.
