import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { APP_NAME, type CodePurpose } from '../../shared/domain/index.js';
import type { EmailCodeRepository } from './auth.repository.js';
import type { Mailer } from './mailer.js';

/** O código vale por 10 minutos. */
export const CODE_TTL_MS = 10 * 60 * 1000;
/** Pedir outro código só depois de 1 minuto. */
export const CODE_COOLDOWN_MS = 60 * 1000;
/** Depois de 5 erros, o código morre e é preciso pedir outro. */
export const CODE_MAX_ATTEMPTS = 5;

const SUBJECTS: Record<CodePurpose, string> = {
  register: `Seu código para criar a conta no ${APP_NAME}`,
  reset: `Seu código para trocar a senha do ${APP_NAME}`,
};

const ACTIONS: Record<CodePurpose, string> = {
  register: 'criar a sua conta',
  reset: 'trocar a sua senha',
};

type Deps = {
  codes: EmailCodeRepository;
  mailer: Mailer;
  /** Segredo do servidor: o banco guarda só o HMAC do código. */
  secret: string;
  now?: () => number;
};

/**
 * Códigos de 6 números por e-mail: provam que o e-mail é da pessoa antes de
 * criar a conta ou trocar uma senha esquecida.
 */
export class CodeService {
  private readonly deps: Deps;
  private readonly now: () => number;

  constructor(deps: Deps) {
    this.deps = deps;
    this.now = deps.now ?? Date.now;
  }

  private hash(email: string, purpose: string, code: string): string {
    return createHmac('sha256', this.deps.secret)
      .update(`${purpose}|${email}|${code}`)
      .digest('hex');
  }

  /** Gera e envia um código. 'wait' se pediu outro há menos de 1 minuto. */
  async send(
    email: string,
    purpose: CodePurpose,
  ): Promise<'ok' | 'wait' | 'mail_failed'> {
    const { codes, mailer } = this.deps;
    const now = this.now();
    const current = await codes.get(email, purpose);
    if (current && now - current.sentAt < CODE_COOLDOWN_MS) return 'wait';

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await codes.put({
      email,
      purpose,
      codeHash: this.hash(email, purpose, code),
      expiresAt: now + CODE_TTL_MS,
      sentAt: now,
      attempts: 0,
    });
    const text = [
      `Seu código para ${ACTIONS[purpose]} no ${APP_NAME} é: ${code}`,
      '',
      'Ele vale por 10 minutos.',
      'Se não foi você que pediu, ignore este e-mail.',
    ].join('\n');
    const html = `<p>Seu código para ${ACTIONS[purpose]} no <b>${APP_NAME}</b> é:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>
<p>Ele vale por 10 minutos.<br>Se não foi você que pediu, ignore este e-mail.</p>`;
    try {
      await mailer.send({ to: email, subject: SUBJECTS[purpose], text, html });
      return 'ok';
    } catch (error) {
      console.error('[e-mail] falhou:', (error as Error).message);
      // Deixa pedir de novo na hora.
      await codes.remove(email, purpose);
      return 'mail_failed';
    }
  }

  /** O código confere? Errar conta tentativa; acertar não gasta (veja `consume`). */
  async check(
    email: string,
    purpose: CodePurpose,
    code: string,
  ): Promise<boolean> {
    const { codes } = this.deps;
    const saved = await codes.get(email, purpose);
    if (!saved) return false;
    if (saved.expiresAt <= this.now() || saved.attempts >= CODE_MAX_ATTEMPTS) {
      await codes.remove(email, purpose);
      return false;
    }
    const expected = Buffer.from(saved.codeHash, 'hex');
    const received = Buffer.from(this.hash(email, purpose, code), 'hex');
    const ok =
      expected.length === received.length &&
      timingSafeEqual(expected, received);
    if (!ok) await codes.bump(email, purpose);
    return ok;
  }

  /** Gasta o código (depois que a conta foi criada ou a senha trocada). */
  async consume(email: string, purpose: CodePurpose): Promise<void> {
    await this.deps.codes.remove(email, purpose);
  }
}
