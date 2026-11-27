# Tarefas Priorizadas — Fase 3

> Ordem recomendada de execução: **Frente 1 (Multi-servidor e Convites)** → **Frente 2 (MFA por WhatsApp)** → **Frente 3 (Nuvem/HTTPS & Design System RN)**.

## Frente 1 — Multi-servidor e Convites (P1)

- [x] 1.1 Modelar tabelas SQL e migração (`servers`, `server_members`, `server_invites`) preservando o servidor padrão (`Setter`) e migrando membros/canais/mesas existentes sem perda de dados.
- [x] 1.2 Implementar repositórios (`postgres` e `memory`) e serviços de criação de servidor, alternância de servidor ativo, geração/validação/revogação de convites e entrada via código/link.
- [x] 1.3 Escopar sessões WebSocket, canais, mensagens, mesas e presença por `serverId` ativo.
- [x] 1.4 Substituir o placeholder do botão `+` na `WorkspaceSidebar` por modal de "Criar servidor ou Entrar com convite" e renderizar lista de servidores na rail esquerda.
- [x] 1.5 Adicionar aba/seção de "Convites" no `ServerSettingsModal` (copiar link/código, definir validade/limite e revogar).
- [x] 1.6 Cobrir fluxos com testes unitários/integração (`backend` e `frontend`) e validar `pnpm quality && pnpm build`.

## Frente 2 — MFA por WhatsApp (P2) — Cancelada

- [x] ~~2.1–2.5 MFA por WhatsApp~~ — Cancelada por decisão de produto (substituída por MFA duplo simultâneo E-mail + App TOTP com escolha de método principal em `specs/invites-subscriptions-and-account-security/spec.md`).

## Frente 3 — Preparação Nuvem/HTTPS e Alinhamento React Native (P3)

- [x] 3.1 Auditar `Caddyfile`, `docker-compose.yml`, `ALLOWED_ORIGINS`, cookies/headers de segurança, `WSS` e `LIVEKIT_PUBLIC_URL`/TURN para ambiente HTTPS em produção.
- [x] 3.2 Validar fluxo de backup/restore do PostgreSQL e healthchecks em `COMPOSE_PROFILES=prod`.
- [x] 3.3 Auditar `design-system/` garantindo que `tokens/` e `themes/` sejam 100% agnósticos de plataforma (Web + React Native), isolando utilitários DOM apenas em `design-system/src/web/`.
- [x] 3.4 Documentar contrato de consumo do `@design-system` para o futuro app React Native e atualizar `docs/DEPLOY.md` / `README.md`.

## Frente 4 — Rebranding Mobile e Experiência PWA Nativa (P2)

- [x] 4.1 Rebranding completo da UI/UX mobile (`MobileBottomNav`, `MobileCallBar`, header flutuante do mapa, bottom sheet de troca de servidor e suporte total a modo claro/escuro).
- [x] 4.2 Experiência PWA nativa (`manifest.webmanifest` em modo `standalone`, Service Worker `sw.js`, Badging API e Web Notifications ao receber menções/mensagens em segundo plano).
- [x] 4.3 Sons e notificações respeitando `ChatNotifyMode` (`effectiveNotificationCounts`), com chime distinto para menções (`@`) e desbloqueio de `AudioContext` no primeiro toque mobile.
