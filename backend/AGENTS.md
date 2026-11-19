# Escritório Virtual (Backend) — guia para agentes

Servidor HTTP + WebSocket do Escritório Virtual em pixel art 2D: autenticação
por nickname/e-mail e senha (com código opcional por e-mail), salas e movimento
em grade, mesas adotáveis, chat (canais, DMs, threads, menções), presença
multi-instância (Valkey/Redis) e acesso a chamadas de voz/vídeo (LiveKit).

Feito em Node.js 24 + TypeScript (ESM) + PostgreSQL + Valkey + `ws` + Zod.
Produto white label: nome em `src/shared/domain/brand.ts`, acesso por `.env`.

## Estrutura (arquitetura modular em camadas / portas e adaptadores)

| Pasta            | O que é                                                                           |
| ---------------- | --------------------------------------------------------------------------------- |
| `src/main.ts`    | Ponto de entrada fino (configuração, container, server e sinais)                  |
| `src/app/`       | Composition Root (`container.ts`) e ciclo de vida (`server.ts`)                   |
| `src/config/`    | Leitura e validação de ambiente (`env.ts`) e origens/CORS (`origin.ts`)           |
| `src/modules/`   | Domínios isolados (`auth`, `chat`, `desks`, `media`, `office`, `realtime`)        |
| `src/infra/`     | Adaptadores concretos: `database/` (migrações), `persistence/` (Pg/Mem), `redis/` |
| `src/transport/` | Adaptadores de rede (`http/handler.ts` e `ws/gateway.ts`)                         |
| `src/shared/`    | Contratos Zod, mapas, regras puras (`domain/`) e tipo `Result`                    |
| `migrations/`    | Migrações SQL numeradas (`NNN_nome.sql`), aplicadas automaticamente na subida     |
| `scripts/`       | Infra local (`dev-infra.mjs`), integração (`smoke.ts`) e sonda (`media-probe.ts`) |
| `deploy/`        | Script de backup diário do PostgreSQL (`backup.sh`)                               |

Os módulos de negócio definem suas próprias portas (interfaces de repositório e
barramento) e nunca importam adaptadores concretos de `src/infra/`.

## Comandos

```bash
pnpm install
pnpm dev            # servidor em :5001 (lê .env se existir; sem banco usa memória)
pnpm dev:infra      # sobe Postgres 5004, Valkey 5005, Mailpit 5006/5007 e LiveKit 5002/5003
pnpm dev:local      # servidor em :5001 ligado à infraestrutura local acima
pnpm build          # compila TypeScript para dist/ (ESM com source maps)
pnpm start          # executa dist/main.js em modo produção
pnpm quality        # prettier, eslint, tsc, vitest com cobertura (>=80%) e build
```

Teste de integração (Docker):

```bash
docker compose -f scripts/compose.test-infra.yml up -d --wait
pnpm smoke
docker compose -f scripts/compose.test-infra.yml down -v
```

## Regras do projeto

- Textos, mensagens de erro, comentários e docs em português do Brasil, frases curtas.
- Toda mensagem entre cliente e servidor passa por um schema Zod em
  `src/shared/domain/protocol.ts` ou `src/shared/domain/auth.ts`.
- Migrações ficam em `migrations/NNN_nome.sql`. Nunca edite uma já aplicada.
- Portas padrão na faixa 5000: `5001` backend, `5002/5003` e `5100-5200/udp`
  LiveKit, `5004` Postgres dev, `5005` Valkey dev, `5006/5007` Mailpit dev.
- Quem pode criar conta vem de `ACCOUNT_DOMAINS` e `ALLOWED_EMAILS`. Nada de
  domínios fixos no código.
- Código por e-mail é opcional (`EMAIL_CODES=true` + SMTP). Desligado por padrão.
- Sem marcas de terceiros (nomes, artes ou textos de outros produtos e jogos).
- Rode `pnpm quality` antes de dizer que terminou. Commits no padrão
  Conventional Commits (o Husky confere).
