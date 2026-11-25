# Proposta: Roadmap da Fase 3 — Escritório Virtual

## Why

Com a primeira versão Beta estabilizada na `main` (autenticação, verificação de e-mail, MFA por E-mail e TOTP, controle multi-dispositivo, permissões de servidor/canal, conformidade ECA/LGPD, acessibilidade e UI Mobile dedicada), a **Fase 3** prepara o **Escritório Virtual** para uso multi-equipe, segurança ampliada e operação em produção (nuvem com HTTPS) alinhada ao futuro app React Native.

## What Changes

1. **Multi-servidor e Convites** (Prioridade 1 — maior valor para usuários e desbloqueio do botão `+` na `WorkspaceSidebar`):
   - Criação de novos servidores/workspaces por administradores/usuários habilitados.
   - Geração, listagem, revogação e resgate de links/códigos de convite com expiração e limite de usos.
   - Alternância fluida entre servidores na `WorkspaceSidebar` mantendo estado isolado de canais, mesas, presença e permissões por servidor.
2. **MFA por WhatsApp** (Prioridade 2 — habilitação da opção hoje marcada como "Em breve (Fase 3)" no `AccountModal`):
   - Integração com a WhatsApp Business Cloud API para envio de códigos de 2FA, mantendo a V1 gratuita e fallback para E-mail/TOTP.
   - Cadastro e validação de número de telefone (E.164) com proteção contra abuso (rate limit por conta/IP/telefone).
3. **Preparação para nuvem/produção (HTTPS) e alinhamento React Native** (Prioridade 3 — fundação de infraestrutura e compartilhamento de tokens):
   - Checklist e automação de deploy HTTPS (Caddy, headers de segurança, CORS/WSS, LiveKit TLS/TURN, backup e observabilidade).
   - Consolidação do pacote `@design-system` (tokens e temas agnósticos de DOM) para consumo direto tanto na Web quanto no futuro app React Native.

## Impact

- **Backend**: novas migrações SQL para `servers` / `server_members` / `server_invites`, suporte a `whatsapp` como método de MFA e endpoints HTTP/WebSocket escopados por servidor.
- **Frontend**: substituição do placeholder `+` na `WorkspaceSidebar` por fluxo de criação/entrada em servidor, seletor de servidores, fluxo de convites e ativação de MFA por WhatsApp no `AccountModal`.
- **Design System**: revisão de tokens compartilhados (`design-system/src/tokens/`) garantindo zero dependência de `window`/`document` nos módulos base.
