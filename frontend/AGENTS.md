# Escritório Virtual (Web) — guia para agentes

Frontend web do Escritório Virtual em pixel art 2D: mapa em grade, mesas
adotáveis, chamadas de voz/vídeo por zona e por proximidade (LiveKit) e chat
estilo Slack. Feito em React 19 + TypeScript + Vite.

Produto white label: nome em `src/shared/domain/brand.ts` e `<title>` em
`index.html`.

## Estrutura (arquitetura `app / pages / features / shared`)

| Pasta                | O que é                                                                   |
| -------------------- | ------------------------------------------------------------------------- |
| `src/app/`           | Bootstrap, estilos globais/tokens, config (`VITE_*`), sessão e API        |
| `src/pages/`         | Páginas completas (`login`, `office`) compondo features                   |
| `src/features/`      | Domínios isolados (`auth`, `chat`, `desks`, `media`, `office`, `session`) |
| `src/shared/domain/` | Contratos zod, mapas, regras de movimento, proximidade e mesas            |
| `src/shared/hooks/`  | Hooks reutilizáveis de browser (`useWindowSize`, `useElementSize`)        |
| `src/shared/lib/`    | Utilitários puros (resolução de URLs, JWT, datas, cores, ponteiro)        |
| `src/shared/ui/`     | Componentes base (`Button`, `Field`, `Icon`, `Tip`) com CSS Modules       |
| `deploy/`            | Template do nginx para produção (`/api`, `/ws`, `/livekit`, `/assets`)    |

Cada feature organiza seu código em `api`, `model`, `hooks` e `components`.

## Comandos

```bash
pnpm install
pnpm dev            # servidor Vite na porta 5000 (API/WS padrão em :5001)
pnpm build          # typecheck + bundle de produção em dist/
pnpm preview        # prévia do build de produção na porta 5000
pnpm quality        # prettier, eslint, tsc, vitest com cobertura e build
```

## Regras do projeto

- Textos da interface, comentários e docs em português do Brasil, frases curtas.
- Toda mensagem entre cliente e servidor passa por um schema zod em
  `src/shared/domain/protocol.ts` ou `src/shared/domain/auth.ts`.
- Estilização com CSS Modules (`*.module.css`) e variáveis em
  `src/app/styles/tokens.css`.
- Porta padrão do frontend: `5000` (backend em `5001`, LiveKit em `5002`).
- Sem marcas de terceiros (nomes, artes ou textos de outros produtos e jogos).
- Rode `pnpm quality` antes de dizer que terminou. Commits no padrão
  Conventional Commits (o Husky confere).
