# Tarefas Priorizadas — Fase 3

> Ordem recomendada de execução: **Frente 1 (Multi-servidor e Convites)** → **Frente 2 (MFA por WhatsApp)** → **Frente 3 (Nuvem/HTTPS & Design System RN)**.

## Frente 1 — Multi-servidor e Convites (P1)

- [ ] 1.1 Modelar tabelas SQL e migração (`servers`, `server_members`, `server_invites`) preservando o servidor padrão (`Setter`) e migrando membros/canais/mesas existentes sem perda de dados.
- [ ] 1.2 Implementar repositórios (`postgres` e `memory`) e serviços de criação de servidor, alternância de servidor ativo, geração/validação/revogação de convites e entrada via código/link.
- [ ] 1.3 Escopar sessões WebSocket, canais, mensagens, mesas e presença por `serverId` ativo.
- [ ] 1.4 Substituir o placeholder do botão `+` na `WorkspaceSidebar` por modal de "Criar servidor ou Entrar com convite" e renderizar lista de servidores na rail esquerda.
- [ ] 1.5 Adicionar aba/seção de "Convites" no `ServerSettingsModal` (copiar link/código, definir validade/limite e revogar).
- [ ] 1.6 Cobrir fluxos com testes unitários/integração (`backend` e `frontend`) e validar `pnpm quality && pnpm build`.

## Frente 2 — MFA por WhatsApp (P2)

- [ ] 2.1 Definir variáveis de ambiente da WhatsApp Business Cloud API (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME`) em `.env.example` e `backend/src/config/env.ts` com modo sandbox/mock para testes locais.
- [ ] 2.2 Criar migração SQL para armazenar telefone verificado (E.164) e preferência/estado de MFA por WhatsApp sem quebrar a V1 gratuita (E-mail e TOTP).
- [ ] 2.3 Implementar serviço de envio de código OTP via WhatsApp Cloud API com rate limiting (Valkey/memória) e fallback seguro.
- [ ] 2.4 Habilitar o método WhatsApp no `AccountModal` e no fluxo de desafio de login (`MfaChallengeModal`), removendo o aviso "Em breve (Fase 3)".
- [ ] 2.5 Cobrir com testes unitários (mock da API Meta) e validar `pnpm quality && pnpm build`.

## Frente 3 — Preparação Nuvem/HTTPS e Alinhamento React Native (P3)

- [ ] 3.1 Auditar `Caddyfile`, `docker-compose.yml`, `ALLOWED_ORIGINS`, cookies/headers de segurança, `WSS` e `LIVEKIT_PUBLIC_URL`/TURN para ambiente HTTPS em produção.
- [ ] 3.2 Validar fluxo de backup/restore do PostgreSQL e healthchecks em `COMPOSE_PROFILES=prod`.
- [ ] 3.3 Auditar `design-system/` garantindo que `tokens/` e `themes/` sejam 100% agnósticos de plataforma (Web + React Native), isolando utilitários DOM apenas em `design-system/src/web/`.
- [ ] 3.4 Documentar contrato de consumo do `@design-system` para o futuro app React Native e atualizar `docs/DEPLOY.md` / `README.md`.
