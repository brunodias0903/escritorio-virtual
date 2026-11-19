# Escritório Virtual — Web

Frontend web do Escritório Virtual em pixel art 2D, com mapa em grade, mesas
adotáveis, chat por canais/DMs/threads e chamadas de voz, vídeo e
compartilhamento de tela via LiveKit.

Construído em **React 19**, **TypeScript**, **Vite**, **Zustand**, **Zod**,
**LiveKit** e **CSS Modules**.

## Arquitetura

O projeto segue a organização em camadas **`app / pages / features / shared`**,
com separação clara entre lógica de domínio/estado (testada com cobertura mínima
de 80%) e interface:

```text
src/
├── app/                # Composição, config de ambiente, sessão e tokens CSS
├── pages/              # Telas completas (login e escritório)
├── features/           # Módulos de negócio isolados
│   ├── auth/           # Login, cadastro, redefinição de senha e conta
│   ├── chat/           # Canais, DMs, threads, menções e composer
│   ├── desks/          # Mesinhas adotáveis, cartão e editor em pixel art
│   ├── media/          # Integração LiveKit e grade/foco de vídeo
│   ├── office/         # Mapa 2D, avatares, pathfinding, zoom, pessoas e barra
│   └── session/        # Persistência e estado da sessão
└── shared/
    ├── domain/         # Schemas Zod, mapas, regras de movimento e chamadas
    ├── hooks/          # Hooks de navegador (ResizeObserver, janela)
    ├── lib/            # Funções puras (URLs, JWT, horários, cores)
    └── ui/             # Primitivos de interface reutilizáveis
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

Com o backend rodando na porta `5001` (e opcionalmente LiveKit na `5002`):

```bash
pnpm dev
```

O app abre em [http://localhost:5000](http://localhost:5000).

Para apontar para outro backend, copie `.env.example` para `.env` e defina:

```env
VITE_API_URL=http://localhost:5001
VITE_WS_URL=ws://localhost:5001
```

Sem essas variáveis:

- Em **desenvolvimento**, o app conecta em `http://<host-da-pagina>:5001` e
  `ws://<host-da-pagina>:5001`.
- Em **produção** (atrás do nginx), usa a mesma origem da página (`/api` e `/ws`).

## Scripts

| Comando              | O que faz                                              |
| -------------------- | ------------------------------------------------------ |
| `pnpm dev`           | Sobe o servidor de desenvolvimento Vite na porta 5000  |
| `pnpm build`         | Valida tipos (`tsc -b`) e gera o bundle em `dist/`     |
| `pnpm preview`       | Serve o build de produção localmente na porta 5000     |
| `pnpm lint`          | Executa ESLint com `--max-warnings=0`                  |
| `pnpm format:check`  | Verifica formatação com Prettier                       |
| `pnpm typecheck`     | Verifica tipos TypeScript sem emitir arquivos          |
| `pnpm test`          | Executa testes unitários com Vitest                    |
| `pnpm test:coverage` | Executa testes com relatório de cobertura (mínimo 80%) |
| `pnpm quality`       | Roda formatação, lint, typecheck, cobertura e build    |

## Docker (produção)

```bash
docker build -t escritorio-web .
docker run -p 5000:80 \
  -e WS_UPSTREAM=host.docker.internal:5001 \
  -e LIVEKIT_UPSTREAM=host.docker.internal:5002 \
  escritorio-web
```
