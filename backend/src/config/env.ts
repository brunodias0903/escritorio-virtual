import { randomBytes } from 'node:crypto';
import {
  APP_NAME,
  normalizeEmail,
  parseAccountAccess,
  type AccountAccess,
} from '../shared/domain/index.js';
import { parseAllowedOrigins } from './origin.js';

export type SmtpConfig = {
  host: string;
  port: number;
  /** true na porta 465 (TLS direto). Na 587, o STARTTLS liga sozinho. */
  secure: boolean;
  user: string | undefined;
  pass: string | undefined;
  /** Remetente, ex.: "Escritório Virtual <nao-responda@exemplo.com>". */
  from: string;
};

export type MediaConfig = {
  /** Endereço público do LiveKit que o navegador/app usa, ex.: wss://virtual-office.exemplo.com/livekit */
  url: string;
  apiKey: string;
  apiSecret: string;
};

export type AppConfig = {
  port: number;
  host: string;
  production: boolean;
  allowedOrigins: string[];
  sessionSecret: string;
  adminEmails: string[];
  /** Quem pode criar conta: ACCOUNT_DOMAINS (domínios) e ALLOWED_EMAILS (e-mails soltos). */
  access: AccountAccess;
  /** Postgres: contas, canais, chat e mesas. Sem ele, tudo fica em memória. */
  databaseUrl: string | undefined;
  /** Redis/Valkey: limites compartilhados, revogações e várias instâncias. Opcional. */
  redisUrl: string | undefined;
  /** LiveKit (voz e vídeo). Sem ele, o escritório funciona sem chamadas. */
  media: MediaConfig | null;
  /** Atrás do nginx/Caddy: o IP real vem do cabeçalho X-Forwarded-For. */
  trustProxy: boolean;
  /** EMAIL_CODES=true: pede código por e-mail ao criar conta e libera "esqueci a senha". */
  emailCodes: boolean;
  /** Servidor de e-mail (códigos de confirmação). Sem ele, só em desenvolvimento (terminal). */
  smtp: SmtpConfig | null;
  warnings: string[];
};

const list = (raw: string | undefined): string[] => {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean);
      }
    } catch {
      // Se não for JSON válido, segue para a separação por vírgula.
    }
  }
  return trimmed
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

/** Lê e valida as variáveis de ambiente. Em produção, recusa subir sem segredo, banco ou acesso. */
export const loadConfig = (
  env: Record<string, string | undefined>,
): AppConfig => {
  const production = env.NODE_ENV === 'production';
  const emailCodes = env.EMAIL_CODES === 'true';
  const access = parseAccountAccess(env.ACCOUNT_DOMAINS, env.ALLOWED_EMAILS);
  const nobodyAllowed =
    access.domains.length === 0 && access.emails.length === 0;
  const warnings: string[] = [];
  let sessionSecret = env.SESSION_SECRET ?? '';

  if (production) {
    if (sessionSecret.length < 32) {
      throw new Error('SESSION_SECRET precisa ter 32 caracteres ou mais.');
    }
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL é obrigatório em produção.');
    }
    if (nobodyAllowed) {
      throw new Error(
        'Defina ACCOUNT_DOMAINS ou ALLOWED_EMAILS (quem pode criar conta).',
      );
    }
    if (emailCodes && !env.SMTP_HOST) {
      throw new Error(
        'SMTP_HOST é obrigatório com EMAIL_CODES=true (envio dos códigos).',
      );
    }
  } else {
    if (sessionSecret.length < 32) {
      sessionSecret = randomBytes(32).toString('hex');
      warnings.push(
        'SESSION_SECRET ausente: usando um segredo temporário (sessões caem ao reiniciar).',
      );
    }
    if (emailCodes && !env.SMTP_HOST) {
      warnings.push(
        'SMTP_HOST ausente: os códigos de e-mail aparecem só no terminal do servidor.',
      );
    }
    if (!env.DATABASE_URL) {
      warnings.push(
        'DATABASE_URL ausente: contas e chat ficam em memória e somem ao reiniciar.',
      );
    }
    if (nobodyAllowed) {
      warnings.push(
        'ACCOUNT_DOMAINS e ALLOWED_EMAILS vazios: ninguém consegue criar conta.',
      );
    }
  }

  return {
    port: Number(env.PORT ?? 5001),
    host: env.HOST ?? '0.0.0.0',
    production,
    allowedOrigins: parseAllowedOrigins(env.ALLOWED_ORIGINS),
    sessionSecret,
    adminEmails: list(env.ADMIN_EMAILS).map(normalizeEmail),
    access,
    databaseUrl: env.DATABASE_URL || undefined,
    redisUrl: env.REDIS_URL || undefined,
    media:
      env.LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET
        ? {
            url: env.LIVEKIT_URL,
            apiKey: env.LIVEKIT_API_KEY,
            apiSecret: env.LIVEKIT_API_SECRET,
          }
        : null,
    trustProxy: env.TRUST_PROXY === 'true',
    emailCodes,
    smtp: env.SMTP_HOST
      ? {
          host: env.SMTP_HOST,
          port: Number(env.SMTP_PORT ?? 587),
          secure: env.SMTP_SECURE === 'true',
          user: env.SMTP_USER || undefined,
          pass: env.SMTP_PASS || undefined,
          from: env.SMTP_FROM ?? `${APP_NAME} <nao-responda@exemplo.com>`,
        }
      : null,
    warnings,
  };
};
