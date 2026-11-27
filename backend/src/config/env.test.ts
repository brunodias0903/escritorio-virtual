import { describe, expect, it } from 'vitest';
import { loadConfig } from './env.js';

const SECRET = 'x'.repeat(32);
const PRODUCTION = {
  NODE_ENV: 'production',
  SESSION_SECRET: SECRET,
  DATABASE_URL: 'postgres://u:p@db:5432/virtual_office',
  SMTP_HOST: 'smtp.empresa.com',
  ACCOUNT_DOMAINS: 'empresa.com',
};

describe('loadConfig', () => {
  it('usa padrões e avisa em desenvolvimento', () => {
    const config = loadConfig({});
    expect(config).toMatchObject({
      port: 5001,
      host: '0.0.0.0',
      production: false,
      adminEmails: [],
      databaseUrl: undefined,
      redisUrl: undefined,
      trustProxy: false,
    });
    expect(config.sessionSecret.length).toBeGreaterThanOrEqual(32);
    expect(config.warnings).toHaveLength(2);
    expect(config.smtp).toBeNull();
    expect(config.emailCodes).toBe(false);
  });

  it('lê quem pode criar conta: domínios, externos e e-mails soltos', () => {
    const { access } = loadConfig({
      ACCOUNT_DOMAINS: ' Empresa.com , @parceiro.com:externo ',
      ALLOWED_EMAILS: 'Ana@Gmail.com',
    });
    expect(access).toEqual({
      domains: [
        { domain: 'empresa.com', kind: 'company' },
        { domain: 'parceiro.com', kind: 'third_party' },
      ],
      emails: ['ana@gmail.com'],
    });
    expect(() =>
      loadConfig({ ...PRODUCTION, ACCOUNT_DOMAINS: '' }),
    ).not.toThrow();
    expect(() =>
      loadConfig({
        ...PRODUCTION,
        ACCOUNT_DOMAINS: '',
        ALLOWED_EMAILS: 'a@b.com',
      }),
    ).not.toThrow();
  });

  it('com EMAIL_CODES=true em desenvolvimento, avisa que falta SMTP', () => {
    const config = loadConfig({ EMAIL_CODES: 'true' });
    expect(config.emailCodes).toBe(true);
    expect(config.warnings).toHaveLength(3);
  });

  it('lê as listas e os endereços do ambiente', () => {
    const config = loadConfig({
      ...PRODUCTION,
      LIVEKIT_URL: 'wss://virtual-office.exemplo.com/livekit',
      LIVEKIT_API_KEY: 'chave',
      LIVEKIT_API_SECRET: 'segredo',
      ADMIN_EMAILS: ' Bruno.Dias@empresa.com ',
      ALLOWED_ORIGINS: 'https://virtual-office.exemplo.com',
      TRUST_PROXY: 'true',
      PORT: '3000',
      HOST: '127.0.0.1',
      REDIS_URL: 'redis://valkey:6379',
    });
    expect(config).toMatchObject({
      production: true,
      sessionSecret: SECRET,
      adminEmails: ['bruno.dias@empresa.com'],
      allowedOrigins: ['https://virtual-office.exemplo.com'],
      trustProxy: true,
      port: 3000,
      host: '127.0.0.1',
      databaseUrl: 'postgres://u:p@db:5432/virtual_office',
      redisUrl: 'redis://valkey:6379',
      media: { url: 'wss://virtual-office.exemplo.com/livekit' },
      smtp: {
        host: 'smtp.empresa.com',
        port: 587,
        secure: false,
        from: 'Escritório Virtual <nao-responda@exemplo.com>',
      },
      warnings: [],
    });
  });

  it('recusa produção sem segredo ou sem banco', () => {
    const without = (key: string) =>
      Object.fromEntries(Object.entries(PRODUCTION).filter(([k]) => k !== key));
    expect(() => loadConfig(without('SESSION_SECRET'))).toThrow(
      'SESSION_SECRET',
    );
    expect(() => loadConfig(without('DATABASE_URL'))).toThrow('DATABASE_URL');
    // SMTP só é obrigatório com os códigos por e-mail ligados.
    expect(() => loadConfig(without('SMTP_HOST'))).not.toThrow();
    expect(() =>
      loadConfig({ ...without('SMTP_HOST'), EMAIL_CODES: 'true' }),
    ).toThrow('SMTP_HOST');
  });

  it('aceita ADMIN_EMAILS como array JSON ou lista separada por vírgula', () => {
    const fromJson = loadConfig({
      ADMIN_EMAILS: '["BDD.Vasconcelos@gmail.com", "outro.adm@outlook.com"]',
    });
    expect(fromJson.adminEmails).toEqual([
      'bdd.vasconcelos@gmail.com',
      'outro.adm@outlook.com',
    ]);

    const fromCsv = loadConfig({
      ADMIN_EMAILS: 'bdd.vasconcelos@gmail.com, outro.adm@icloud.com',
    });
    expect(fromCsv.adminEmails).toEqual([
      'bdd.vasconcelos@gmail.com',
      'outro.adm@icloud.com',
    ]);
  });

  it('lê o SMTP com usuário, senha, porta e TLS', () => {
    expect(
      loadConfig({
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: '465',
        SMTP_SECURE: 'true',
        SMTP_USER: 'a@b.com',
        SMTP_PASS: 'x',
        SMTP_FROM: 'Virtual Office <a@b.com>',
      }).smtp,
    ).toEqual({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      user: 'a@b.com',
      pass: 'x',
      from: 'Virtual Office <a@b.com>',
    });
  });
});
