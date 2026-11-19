# Escritório Virtual — Monorepo

Monorepo com **backend** (`./backend`) e **frontend** (`./frontend`) do Escritório Virtual em pixel art 2D, prontos para subir juntos com um único comando `docker compose` no **macOS**, **Windows 11 (WSL2)** e **VPS Linux**.

## Padrões de ambiente

| Ferramenta | Versão      |
| ---------- | ----------- |
| Node.js    | 24.19.0     |
| pnpm       | 12.19.0     |
| Docker     | Compose v2+ |

Os `Dockerfile`s já usam `node:24.19.0-bookworm-slim` e `pnpm@12.19.0`, então não dependem do Node instalado na máquina para rodar com Docker.

## Subir o projeto completo com Docker (Mac, Windows WSL2 e VPS)

### 1. Gerar o `.env`

Na primeira vez na máquina ou servidor, crie o `.env` a partir de `.env.example` (nunca vai para o Git):

```bash
pnpm env:init
```

_(Sem Node instalado na VPS, copie `.env.example` para `.env` e gere os segredos com `openssl rand -hex 16` e `openssl rand -hex 32`.)_

### 2. Subir tudo com um único comando

```bash
docker compose up -d --build
```

- **Local (Mac e Windows 11 WSL2)**: acesse [http://localhost:5080](http://localhost:5080).
  - A porta padrão `5080` evita conflito com o AirPlay Receiver do macOS na porta `5000`.
  - Para ativar caixa de e-mail de teste (`Mailpit` em `:5007`), ajuste no `.env`: `COMPOSE_PROFILES=dev`, `EMAIL_CODES=true`, `SMTP_HOST=mailpit`, `SMTP_PORT=1025`.
- **Testes com o time no PC pessoal (Windows 11 + WSL2 + Docker)**:
  - Para liberar o acesso na rede local (ou via Tailscale/Cloudflare Tunnel), ajuste no `.env`: `WEB_BIND=0.0.0.0`, inclua a URL usada pelo time em `ALLOWED_ORIGINS` (separadas por vírgula) e aponte `LIVEKIT_NODE_IP` / `LIVEKIT_PUBLIC_URL` para o IP/endereço acessível pelo time.
  - Para adicionar novos administradores, basta acrescentar o e-mail no array `ADMIN_EMAILS=["bdd.vasconcelos@gmail.com","outro@outlook.com"]` no `.env` e reiniciar o container `server`.

### 3. Produção em VPS Linux (com HTTPS automático)

1. Aponte o DNS do seu domínio (`escritorio.seudominio.com`) para o IP público da VPS.
2. Libere no firewall da VPS (UFW e painel do provedor): `22/tcp`, `80/tcp`, `443/tcp`, `5003/tcp` e `5100/udp`.
3. Gere o `.env` de produção (ou edite manualmente):

```bash
pnpm env:init --prod --domain=escritorio.seudominio.com --ip=$(curl -fsS https://api.ipify.org)
```

4. Suba com o **mesmo comando**:

```bash
docker compose up -d --build
```

Com `COMPOSE_PROFILES=prod` no `.env`, sobem também o **Caddy** (certificado Let's Encrypt automático para `SITE_DOMAIN`) e o **backup** diário do PostgreSQL.

## Cuidados por sistema operacional

- **macOS**: mantenha `WEB_PORT=5080` (ou desligue o _Receptor AirPlay_ nos Ajustes do Sistema se preferir usar a porta `5000`).
- **Windows 11 (WSL2)**: clone este repositório **dentro** do sistema de arquivos do WSL2 (ex.: `~/projetos/virtual-office-monorepo`), nunca em `/mnt/c/...`. Use Docker Desktop com integração WSL2 habilitada (ou Docker Engine no WSL2 com `networkingMode=mirrored` no `.wslconfig`). O arquivo `.gitattributes` garante fins de linha `LF` para todos os scripts.
- **Linux (VPS)**: nunca execute `docker compose down -v` em produção, pois a flag `-v` apaga os volumes do banco de dados, backups e certificados SSL.

## Comandos úteis na raiz

| Comando         | O que faz                                                             |
| --------------- | --------------------------------------------------------------------- |
| `pnpm env:init` | Cria `.env` local com segredos aleatórios                             |
| `pnpm up`       | Sobe ou atualiza todos os containers (`docker compose up -d --build`) |
| `pnpm down`     | Para e remove os containers mantendo os volumes                       |
| `pnpm logs`     | Acompanha os logs de todos os serviços                                |
| `pnpm quality`  | Roda formatação raiz + `pnpm quality` em `backend` e `frontend`       |
| `pnpm test`     | Roda os testes unitários do backend e do frontend                     |

## Desenvolvimento com hot-reload (opcional, fora do Docker)

Para programar editando arquivos com recarregamento instantâneo:

```bash
pnpm dev:infra                # sobe apenas Postgres, Valkey, Mailpit e LiveKit
pnpm --dir backend dev:local  # terminal 1: API e WebSocket em :5001
pnpm --dir frontend dev       # terminal 2: Vite em :5000
```

## CI/CD com GitHub Actions (repositório privado + VPS)

Os workflows ficam em `.github/workflows/`:

- **`ci.yml` (CI)**: roda em Pull Requests e pushes na `main`, validando Conventional Commits (em PRs), formatação na raiz, `format:check`, `lint`, `typecheck`, testes com cobertura e `build` no `backend` e `frontend`, além de conferir o build das imagens Docker na `main`.
- **`deploy.yml` (CD para VPS)**: disparo manual (`workflow_dispatch`) por padrão para não falhar antes de provisionar a VPS. Quando quiser automatizar o deploy a cada merge na `main`, descomente o gatilho `push` no arquivo.

### Secrets necessários no GitHub para habilitar o deploy

Em **Settings → Secrets and variables → Actions** do repositório privado, cadastre:

| Secret        | Obrigatória | Exemplo / Descrição                                             |
| ------------- | ----------- | --------------------------------------------------------------- |
| `VPS_HOST`    | Sim         | IP público ou domínio da VPS                                    |
| `VPS_USER`    | Sim         | Usuário SSH com permissão no Docker (ex.: `deploy`)             |
| `VPS_SSH_KEY` | Sim         | Chave SSH privada autorizada em `~/.ssh/authorized_keys` da VPS |
| `VPS_APP_DIR` | Sim         | Caminho do repositório clonado na VPS (ex.: `/opt/escritorio`)  |
| `VPS_PORT`    | Não         | Porta SSH da VPS (padrão `22`)                                  |

> **Dica para repositório privado:** gere uma chave SSH na própria VPS e adicione a chave pública como **Deploy Key (somente leitura)** em **Settings → Deploy keys** no GitHub para que o `git pull` dentro da VPS funcione sem senha.
