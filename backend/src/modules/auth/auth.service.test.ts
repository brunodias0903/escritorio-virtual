import { describe, expect, it } from 'vitest';
import {
  MemoryEmailCodeRepository,
  MemoryLocalAccountRepository,
  MemoryRateLimiter,
  MemoryRevocations,
} from '../../infra/persistence/memory/index.js';
import {
  parseAccountAccess,
  type Register,
} from '../../shared/domain/index.js';
import { AuthService, SESSION_TTL_SECONDS } from './auth.service.js';
import { CodeService } from './codes.service.js';
import type { Mail } from './mailer.js';

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres';
const ADMIN = 'bruno.dias@empresa.com';
const PASSWORD = 'senha-segura-123';

/** O último código mandado para o e-mail. */
const codeIn = (mails: Mail[], email: string): string =>
  /(\d{6})/.exec(
    [...mails].reverse().find((m) => m.to === email.toLowerCase())?.text ?? '',
  )?.[1] ?? '000000';

const setup = () => {
  let time = 1_800_000_000_000;
  const mails: Mail[] = [];
  const accounts = new MemoryLocalAccountRepository();
  const service = new AuthService({
    accounts,
    secret: SECRET,
    adminEmails: [ADMIN, 'chefe@parceiro.com'],
    access: parseAccountAccess('empresa.com,parceiro.com:externo', ''),
    loginLimiter: new MemoryRateLimiter(5, 60_000, () => time),
    revocations: new MemoryRevocations(() => time),
    codes: new CodeService({
      codes: new MemoryEmailCodeRepository(),
      mailer: { send: async (mail) => void mails.push(mail) },
      secret: SECRET,
      now: () => time,
    }),
    now: () => time,
  });
  // Nos testes, cadastro sem código pede um e usa o que "chegou" no e-mail.
  const register = service.register.bind(service);
  service.register = async (input: Register, ip: string) => {
    if (input.code) return register(input, ip);
    const sent = await service.requestCode(
      { email: input.email, purpose: 'register' },
      ip,
    );
    if (!sent.ok) return sent;
    return register({ ...input, code: codeIn(mails, input.email) }, ip);
  };
  return {
    accounts,
    service,
    mails,
    codeIn: (email: string) => codeIn(mails, email),
    advance: (ms: number) => (time += ms),
  };
};

const ana = {
  fullName: 'Ana Souza',
  nickname: 'AnaS',
  email: 'Ana.Souza@empresa.com',
  role: 'Desenvolvedora',
  code: '',
  password: PASSWORD,
};

const token = (result: Awaited<ReturnType<AuthService['login']>>) => {
  if (!result.ok) throw new Error(result.error);
  return result.value.token;
};

describe('códigos por e-mail', () => {
  it('cadastro exige o código certo do e-mail', async () => {
    const { service, codeIn } = setup();
    expect(
      await service.register({ ...ana, code: '123456' }, '1.1.1.1'),
    ).toMatchObject({ ok: false, status: 400, error: 'invalid_code' });
    await service.requestCode(
      { email: ana.email, purpose: 'register' },
      '1.1.1.1',
    );
    const code = codeIn(ana.email);
    expect(code).toMatch(/^\d{6}$/);
    expect((await service.register({ ...ana, code }, '1.1.1.1')).ok).toBe(true);
    // O código foi gasto.
    expect(
      await service.register({ ...ana, nickname: 'outra', code }, '1.1.1.1'),
    ).toMatchObject({ error: 'invalid_code' });
  });

  it('não manda código de cadastro para e-mail que já tem conta', async () => {
    const { service } = setup();
    await service.register(ana, '1.1.1.1');
    expect(
      await service.requestCode(
        { email: ana.email, purpose: 'register' },
        '1.1.1.1',
      ),
    ).toMatchObject({ ok: false, status: 409, error: 'email_taken' });
  });

  it('pedir outro código só depois de 1 minuto; o código vence em 10', async () => {
    const { service, advance, codeIn } = setup();
    const ask = () =>
      service.requestCode({ email: ana.email, purpose: 'register' }, '1.1.1.1');
    expect((await ask()).ok).toBe(true);
    expect(await ask()).toMatchObject({ status: 429, error: 'code_wait' });
    advance(61_000);
    expect((await ask()).ok).toBe(true);
    const code = codeIn(ana.email);
    advance(10 * 60_000 + 1);
    expect(await service.register({ ...ana, code }, '1.1.1.1')).toMatchObject({
      error: 'invalid_code',
    });
  });

  it('5 erros matam o código', async () => {
    const { service, codeIn } = setup();
    await service.requestCode(
      { email: ana.email, purpose: 'register' },
      '1.1.1.1',
    );
    const code = codeIn(ana.email);
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      await service.register({ ...ana, code: wrong }, `9.9.9.${i}`);
    }
    expect(await service.register({ ...ana, code }, '8.8.8.8')).toMatchObject({
      error: 'invalid_code',
    });
  });

  it('e-mail que falha: avisa e deixa pedir de novo na hora', async () => {
    let time = 0;
    const codes = new CodeService({
      codes: new MemoryEmailCodeRepository(),
      mailer: {
        send: async () => {
          throw new Error('smtp fora');
        },
      },
      secret: SECRET,
      now: () => time,
    });
    expect(await codes.send('a@parceiro.com', 'register')).toBe('mail_failed');
    time += 1000;
    expect(await codes.send('a@parceiro.com', 'register')).toBe('mail_failed');
  });
});

describe('esqueci a senha', () => {
  it('com o código do e-mail, troca a senha e já entra', async () => {
    const { service, codeIn } = setup();
    await service.register(ana, '1.1.1.1');
    expect(
      (
        await service.requestCode(
          { email: ana.email, purpose: 'reset' },
          '1.1.1.1',
        )
      ).ok,
    ).toBe(true);
    const reset = await service.resetPassword(
      { email: ana.email, code: codeIn(ana.email), password: 'nova-senha-123' },
      '1.1.1.1',
    );
    expect(reset).toMatchObject({
      ok: true,
      value: { user: { nickname: 'AnaS' } },
    });
    expect((await service.login('anas', PASSWORD, '1.1.1.1')).ok).toBe(false);
    expect((await service.login('anas', 'nova-senha-123', '1.1.1.1')).ok).toBe(
      true,
    );
  });

  it('e-mail sem conta: responde igual, mas não manda nada', async () => {
    const { service, mails } = setup();
    expect(
      await service.requestCode(
        { email: 'ninguem@parceiro.com', purpose: 'reset' },
        '1.1.1.1',
      ),
    ).toEqual({ ok: true, value: null });
    expect(mails).toHaveLength(0);
    expect(
      await service.resetPassword(
        {
          email: 'ninguem@parceiro.com',
          code: '123456',
          password: 'nova-senha-123',
        },
        '1.1.1.1',
      ),
    ).toMatchObject({ ok: false, status: 400, error: 'invalid_code' });
  });

  it('código de cadastro não serve para trocar a senha', async () => {
    const { service, codeIn } = setup();
    await service.register(ana, '1.1.1.1');
    expect(
      await service.resetPassword(
        {
          email: ana.email,
          code: codeIn(ana.email),
          password: 'nova-senha-123',
        },
        '1.1.1.1',
      ),
    ).toMatchObject({ error: 'invalid_code' });
  });
});

describe('register', () => {
  it('cadastra e já entra, com o nickname como nome', async () => {
    const { service } = setup();
    expect(await service.register(ana, '1.1.1.1')).toMatchObject({
      ok: true,
      value: {
        user: {
          email: 'ana.souza@empresa.com',
          name: 'Ana Souza',
          nickname: 'AnaS',
          role: 'Desenvolvedora',
          admin: false,
          kind: 'company',
        },
      },
    });
  });

  it('a empresa vem do domínio: @parceiro.com é terceiro', async () => {
    const { service } = setup();
    const result = await service.register(
      { ...ana, nickname: 'joao', email: 'joao@parceiro.com' },
      '1.1.1.1',
    );
    expect(result).toMatchObject({
      ok: true,
      value: { user: { kind: 'third_party', admin: false } },
    });
  });

  it('só o time da casa tem administradores', async () => {
    const { service } = setup();
    expect(
      await service.register(
        { ...ana, nickname: 'bruno', email: ADMIN },
        '1.1.1.1',
      ),
    ).toMatchObject({ ok: true, value: { user: { admin: true } } });
    // Mesmo na lista, um e-mail de convidado externo não vira administrador.
    expect(
      await service.register(
        { ...ana, nickname: 'chefe', email: 'chefe@parceiro.com' },
        '1.1.1.1',
      ),
    ).toMatchObject({ ok: true, value: { user: { admin: false } } });
  });

  it('recusa outros domínios, nickname e e-mail repetidos', async () => {
    const { service } = setup();
    expect(
      await service.register({ ...ana, email: 'ana@gmail.com' }, '1.1.1.1'),
    ).toMatchObject({ ok: false, status: 403, error: 'email_not_allowed' });
    expect(
      await service.register(
        { ...ana, email: 'ana@evilempresa.com' },
        '1.1.1.1',
      ),
    ).toMatchObject({ ok: false, status: 403, error: 'email_not_allowed' });

    await service.register(ana, '1.1.1.1');
    expect(
      await service.register({ ...ana, email: 'outra@empresa.com' }, '1.1.1.1'),
    ).toMatchObject({ ok: false, status: 409, error: 'nickname_taken' });
    expect(
      await service.register({ ...ana, nickname: 'outro' }, '1.1.1.1'),
    ).toMatchObject({ ok: false, status: 409, error: 'email_taken' });
  });

  it('limita cadastros por IP', async () => {
    const { service } = setup();
    for (let i = 0; i < 5; i++) {
      await service.register({ ...ana, email: 'x@gmail.com' }, '7.7.7.7');
    }
    expect(await service.register(ana, '7.7.7.7')).toMatchObject({
      ok: false,
      status: 429,
    });
  });
});

describe('account e updateAccount', () => {
  it('mostra e muda nome, nickname e cargo; a sessão nova já traz os novos', async () => {
    const { service } = setup();
    const claims = await service.authenticate(
      token(await service.register(ana, '1.1.1.1')),
    );
    expect(await service.account(claims!)).toEqual({
      ok: true,
      value: {
        fullName: 'Ana Souza',
        nickname: 'AnaS',
        email: 'ana.souza@empresa.com',
        role: 'Desenvolvedora',
        tier: 'tester',
        secondaryTiers: [],
        emailVerified: true,
        mfaEnabled: false,
        emailMarketingOptIn: false,
        uiTheme: null,
      },
    });
    expect(
      await service.updateTheme(claims!, {
        presetId: 'games',
        colors: {
          rail: '#0f091d',
          surface: '#17102b',
          accent: '#ff2e93',
          presence: '#00f5d4',
        },
        customized: false,
      }),
    ).toEqual({ ok: true, value: { ok: true } });
    expect((await service.account(claims!)).ok).toBe(true);
    const updated = await service.updateAccount(
      claims!,
      {
        fullName: 'Ana Maria Souza',
        nickname: 'ana.m',
        role: 'Tech Lead',
        currentPassword: '',
        newPassword: '',
      },
      '1.1.1.1',
    );
    expect(updated).toMatchObject({
      ok: true,
      value: {
        user: { name: 'Ana Maria Souza', nickname: 'ana.m', role: 'Tech Lead' },
      },
    });
    expect((await service.login('ana.m', PASSWORD, '1.1.1.1')).ok).toBe(true);
    expect((await service.login('anas', PASSWORD, '1.1.1.1')).ok).toBe(false);
  });

  it('troca a senha só com a atual certa', async () => {
    const { service } = setup();
    const claims = await service.authenticate(
      token(await service.register(ana, '1.1.1.1')),
    );
    const change = (currentPassword: string) =>
      service.updateAccount(
        claims!,
        {
          fullName: 'Ana Souza',
          nickname: 'AnaS',
          role: '',
          currentPassword,
          newPassword: 'nova-senha-123',
        },
        '1.1.1.1',
      );
    expect(await change('errada-errada')).toMatchObject({
      ok: false,
      status: 403,
      error: 'wrong_password',
    });
    expect((await change(PASSWORD)).ok).toBe(true);
    expect((await service.login('anas', 'nova-senha-123', '1.1.1.1')).ok).toBe(
      true,
    );
  });

  it('nickname de outra pessoa: 409; sessão sem conta: 404', async () => {
    const { service } = setup();
    await service.register(
      { ...ana, nickname: 'outra', email: 'outra@parceiro.com' },
      '1.1.1.1',
    );
    const claims = await service.authenticate(
      token(await service.register(ana, '1.1.1.1')),
    );
    expect(
      await service.updateAccount(
        claims!,
        {
          fullName: 'Ana Souza',
          nickname: 'OUTRA',
          role: '',
          currentPassword: '',
          newPassword: '',
        },
        '1.1.1.1',
      ),
    ).toMatchObject({ ok: false, status: 409, error: 'nickname_taken' });
    const ghost = { ...claims!, email: 'ninguem@empresa.com' };
    expect(await service.account(ghost)).toMatchObject({
      ok: false,
      status: 404,
    });
  });
});

describe('login', () => {
  it('entra pelo nickname ou pelo e-mail, sem diferenciar maiúsculas', async () => {
    const { service } = setup();
    await service.register(ana, '1.1.1.1');
    for (const login of ['anas', 'ANAS', ' ana.souza@EMPRESA.com ']) {
      expect(await service.login(login, PASSWORD, '2.2.2.2')).toMatchObject({
        ok: true,
        value: { user: { name: 'Ana Souza', nickname: 'AnaS' } },
      });
    }
  });

  it('senha errada ou conta inexistente: a mesma resposta', async () => {
    const { service } = setup();
    await service.register(ana, '1.1.1.1');
    for (const [login, password] of [
      ['anas', 'senha-errada-123'],
      ['ninguem', PASSWORD],
      ['ninguem@parceiro.com', PASSWORD],
    ] as const) {
      expect(await service.login(login, password, '2.2.2.2')).toEqual({
        ok: false,
        status: 401,
        error: 'invalid_login',
      });
    }
  });

  it('limita tentativas por conta e libera depois de acertar', async () => {
    const { service, advance } = setup();
    await service.register(ana, '1.1.1.1');
    for (let i = 0; i < 5; i++) {
      await service.login('anas', 'senha-errada-123', `9.9.9.${i}`);
    }
    expect(await service.login('anas', PASSWORD, '8.8.8.8')).toMatchObject({
      ok: false,
      status: 429,
    });
    advance(60_001);
    expect((await service.login('anas', PASSWORD, '8.8.8.8')).ok).toBe(true);
  });
});

describe('sessão', () => {
  it('autentica o token e encerra no logout', async () => {
    const { service } = setup();
    await service.register(ana, '1.1.1.1');
    const session = token(await service.login('anas', PASSWORD, '1.1.1.1'));
    const claims = await service.authenticate(session);
    expect(claims).toMatchObject({ email: 'ana.souza@empresa.com' });

    await service.logout(claims!);
    expect(await service.authenticate(session)).toBeNull();
  });

  it('o token vence e não aceita segredo diferente', async () => {
    const { service, advance } = setup();
    await service.register(ana, '1.1.1.1');
    const session = token(await service.login('anas', PASSWORD, '1.1.1.1'));
    expect(await service.authenticate(`${session}x`)).toBeNull();
    advance(SESSION_TTL_SECONDS * 1000 + 1);
    expect(await service.authenticate(session)).toBeNull();
  });

  it('logout de sessão já vencida não quebra', async () => {
    const { service } = setup();
    await service.logout({
      email: 'a@empresa.com',
      name: 'a',
      admin: false,
      kind: 'company',
      nickname: 'a',
      role: '',
      jti: 'x',
      exp: 1,
    });
  });

  it('bloqueia login e sessão ativa de conta banida ou restringida', async () => {
    const { accounts, service, advance } = setup();
    await service.register(ana, '1.1.1.1');
    const session = token(await service.login('anas', PASSWORD, '1.1.1.1'));
    expect(await service.authenticate(session)).not.toBeNull();

    // Restrição temporária (30 min)
    await accounts.setModeration('ana.souza@empresa.com', {
      restrictedUntil: 1_800_000_000_000 + 30 * 60_000,
      restrictionReason: 'Pausa',
    });
    expect(await service.authenticate(session)).toBeNull();
    expect(await service.login('anas', PASSWORD, '1.1.1.1')).toMatchObject({
      ok: false,
      status: 403,
      error: 'account_restricted',
    });

    // Após expirar, volta a funcionar
    advance(31 * 60_000);
    expect(await service.authenticate(session)).not.toBeNull();

    // Banimento permanente
    await accounts.setModeration('ana.souza@empresa.com', {
      bannedAt: 1_800_000_000_000 + 31 * 60_000,
      banReason: 'Banido',
    });
    expect(await service.authenticate(session)).toBeNull();
    expect(await service.login('anas', PASSWORD, '1.1.1.1')).toMatchObject({
      ok: false,
      status: 403,
      error: 'account_banned',
    });

    // Desbane, adiciona cargo secundário 'admin' e confirma sessão com admin=true + secondaryTiers
    await accounts.setModeration('ana.souza@empresa.com', {
      bannedAt: null,
      banReason: '',
    });
    await accounts.setRoles('ana.souza@empresa.com', {
      tier: 'developer',
      secondaryTiers: ['admin', 'designer'],
    });
    const promotedLogin = await service.login('anas', PASSWORD, '1.1.1.1');
    expect(promotedLogin).toMatchObject({
      ok: true,
      value: {
        user: {
          tier: 'developer',
          secondaryTiers: ['admin', 'designer'],
          admin: true,
        },
      },
    });
  });
});
