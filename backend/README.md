# Escritório Virtual — Backend

Servidor HTTP + WebSocket e infraestrutura de dados do Escritório Virtual em
pixel art 2D: autenticação, salas em grade com validação autoritativa de
movimento, mesinhas adotáveis, chat estilo Slack (canais, DMs, threads, menções
e não lidas), escalonamento horizontal via Valkey/Redis e emissão de tokens
LiveKit para voz, vídeo e compartilhamento de tela.

Construído em **Node.js 24**, **TypeScript**, **PostgreSQL 17**, **Valkey 8**,
**`ws`**, **LiveKit Server SDK** e **Zod**.

## Arquitetura

O backend segue **arquitetura modular com portas e adaptadores (Hexagonal)**:
regras de negócio isoladas por domínio, desacopladas de transporte (HTTP/WS) e
de persistência (PostgreSQL/Valkey/Memória), testadas com cobertura mínima de
80%.

```text
├── migrations/              # Migrações SQL versionadas (001..007)
├── deploy/                  # Backup automático do PostgreSQL
├── scripts/                 # Infra local, teste de integração (smoke) e sonda LiveKit
└── src/
    ├── main.ts              # Entrypoint mínimo e tratamento de sinais (SIGTERM/SIGINT)
    ├── app/                 # Composition Root (container.ts) e servidor (server.ts)
    ├── config/              # Validação de ambiente (env.ts) e CORS/origens (origin.ts)
    ├── modules/             # Domínios de negócio (serviços + portas)
    │   ├── auth/            # Contas, login, scrypt, JWT HS256, códigos HMAC e rotas /api/auth/*
    │   ├── chat/            # Canais públicos, DMs, threads, menções e leitura
    │   ├── desks/           # Adoção, personalização e devolução de mesas
    │   ├── media/           # Emissão de tokens LiveKit por zona e proximidade
    │   ├── office/          # Estado das salas, movimento, portas, lotação e espelho remoto
    │   └── realtime/        # Ciclo de vida da conexão e coordenação de cluster
    ├── infra/               # Adaptadores concretos
    │   ├── database/        # SqlClient e executor de migrações com advisory lock
    │   ├── persistence/     # Repositórios separados por entidade (postgres/ e memory/)
    │   └── redis/           # Pub/Sub, presença, rate limit e revogação no Valkey/Redis
    ├── transport/           # Adaptadores de rede
    │   ├── http/            # CORS, limites de payload, /healthz e roteamento HTTP
    │   └── ws/              # WebSocketServer, verificação de origem e fan-out local
    └── shared/
        ├── domain/          # Schemas Zod, mapas, proximidade, mesas e contratos
        └── result.ts        # Tipos Result / HttpResult compartilhados
```

## Ambiente

| Tecnologia | Versão  |
| ---------- | ------- |
| Node.js    | 24.19.0 |
| pnpm       | 12.19.0 |

```bash
nvm use        # ou fnm use
pnpm install
```

## Desenvolvimento

### Modo rápido (em memória, sem Docker)

Copie `.env.example` para `.env`, preencha ao menos `ACCOUNT_DOMAINS` ou
`ALLOWED_EMAILS` e rode:

```bash
pnpm dev
```

O servidor sobe em `http://localhost:5001` (`ws://localhost:5001`).

### Modo completo (Postgres, Valkey, Mailpit e LiveKit no Docker)

```bash
pnpm dev:infra      # sobe Postgres :5004, Valkey :5005, Mailpit :5006/:5007 e LiveKit :5002
pnpm dev:local      # sobe o servidor em :5001 conectado aos serviços acima
```

- Os e-mails de teste (quando `EMAIL_CODES=true`) chegam no Mailpit em
  [http://localhost:5007](http://localhost:5007).
- Para parar os containers mantendo os dados: `pnpm dev:infra:stop`.
- Para apagar os dados locais de teste:
  `docker compose -f docker-compose.dev.yml down -v`.

## Portas

| Porta         | Serviço                         | Ambiente                                      |
| ------------- | ------------------------------- | --------------------------------------------- |
| 5001          | API HTTP (`/api/*`) e WebSocket | Desenvolvimento e produção (atrás do nginx)   |
| 5002          | LiveKit (sinalização WebSocket) | Desenvolvimento e produção (proxy `/livekit`) |
| 5003/tcp      | LiveKit (mídia TCP)             | Desenvolvimento e produção                    |
| 5100-5200/udp | LiveKit (mídia WebRTC UDP)      | Desenvolvimento e produção                    |
| 5004          | PostgreSQL 17                   | Apenas desenvolvimento (`127.0.0.1`)          |
| 5005          | Valkey 8                        | Apenas desenvolvimento (`127.0.0.1`)          |
| 5006 / 5007   | Mailpit (SMTP / interface web)  | Apenas desenvolvimento (`127.0.0.1`)          |

## API HTTP

| Rota                 | Método | Autenticação | Descrição                                          |
| -------------------- | ------ | ------------ | -------------------------------------------------- |
| `/healthz`           | `GET`  | Pública      | Verificação de saúde (`{ "ok": true }`)            |
| `/api/auth/options`  | `GET`  | Pública      | Recursos ativos (`emailCodes`, `domains`)          |
| `/api/auth/register` | `POST` | Pública      | Cria conta e devolve sessão JWT                    |
| `/api/auth/login`    | `POST` | Pública      | Entra com nickname ou e-mail e senha               |
| `/api/auth/code`     | `POST` | Pública      | Envia código de 6 dígitos (com `EMAIL_CODES=true`) |
| `/api/auth/reset`    | `POST` | Pública      | Redefine senha com código (com `EMAIL_CODES=true`) |
| `/api/auth/account`  | `GET`  | `Bearer`     | Dados da conta autenticada                         |
| `/api/auth/account`  | `PUT`  | `Bearer`     | Atualiza nome, nickname, cargo e senha             |
| `/api/auth/logout`   | `POST` | `Bearer`     | Revoga a sessão atual em todas as instâncias       |

## Variáveis de ambiente

| Variável          | Função                                                                    |
| ----------------- | ------------------------------------------------------------------------- |
| `HOST` / `PORT`   | Endereço e porta do servidor (padrão `0.0.0.0:5001`)                      |
| `SESSION_SECRET`  | Segredo HMAC das sessões (32+ caracteres; obrigatório em produção)        |
| `DATABASE_URL`    | Conexão PostgreSQL (obrigatório em produção; sem ela usa memória)         |
| `REDIS_URL`       | Conexão Redis/Valkey (opcional: rate limit, revogações e multi-instância) |
| `ACCOUNT_DOMAINS` | Domínios liberados para cadastro; `:externo` marca convidado              |
| `ALLOWED_EMAILS`  | E-mails avulsos liberados para cadastro                                   |
| `ADMIN_EMAILS`    | E-mails com papel de administrador (precisam ser do time interno)         |
| `ALLOWED_ORIGINS` | Origens permitidas em CORS e WebSocket, separadas por vírgula             |
| `TRUST_PROXY`     | `true` atrás de proxy reverso para ler `X-Forwarded-For`                  |
| `EMAIL_CODES`     | `true` exige código por e-mail no cadastro e habilita redefinição         |
| `SMTP_*`          | Configuração SMTP (obrigatório em produção se `EMAIL_CODES=true`)         |
| `LIVEKIT_*`       | URL pública, chave e segredo do LiveKit (opcional)                        |

## Scripts

| Comando               | O que faz                                                 |
| --------------------- | --------------------------------------------------------- |
| `pnpm dev`            | Sobe o servidor em watch mode (`tsx`) lendo `.env`        |
| `pnpm dev:infra`      | Sobe Postgres, Valkey, Mailpit e LiveKit no Docker        |
| `pnpm dev:infra:stop` | Para a infraestrutura local sem apagar o banco            |
| `pnpm dev:local`      | Sobe o servidor configurado para a infraestrutura local   |
| `pnpm build`          | Compila TypeScript para `dist/` com source maps           |
| `pnpm start`          | Roda o build compilado (`node dist/main.js`)              |
| `pnpm lint`           | Executa ESLint com `--max-warnings=0`                     |
| `pnpm format:check`   | Verifica formatação com Prettier                          |
| `pnpm typecheck`      | Verifica tipos TypeScript (`src/` e `scripts/`)           |
| `pnpm test`           | Executa testes unitários e de contrato (memória + pg-mem) |
| `pnpm test:coverage`  | Executa testes com relatório de cobertura (mínimo 80%)    |
| `pnpm smoke`          | Executa teste de integração multi-instância com Docker    |
| `pnpm quality`        | Roda formatação, lint, typecheck, cobertura e build       |

## Teste de integração

Com Docker instalado, o teste `smoke` sobe Postgres, Valkey e LiveKit reais e
duas instâncias do servidor para validar salas, portas, chat, DMs, mesas,
chamadas, contas, revogação e persistência após reinício:

```bash
docker compose -f scripts/compose.test-infra.yml up -d --wait
pnpm smoke
docker compose -f scripts/compose.test-infra.yml down -v
```

## Publicação

Consulte [docs/DEPLOY.md](docs/DEPLOY.md) para o passo a passo de publicação
em produção com Docker, backups automáticos e integração com o frontend web e o
app mobile.
