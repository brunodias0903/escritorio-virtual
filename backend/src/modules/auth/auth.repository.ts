/** Conta: entra com o nickname (ou o e-mail) e a senha. */
export type LocalAccount = {
  /** Como a pessoa digitou (pode usar para entrar). */
  nickname: string;
  /** Nome completo: é o que aparece no escritório. */
  fullName: string;
  email: string;
  /** Cargo (pode ficar em branco). */
  role: string;
  passwordHash: string;
  createdAt: number;
};

export type AccountChanges = Pick<
  LocalAccount,
  'nickname' | 'fullName' | 'role'
> & { passwordHash?: string };

export interface LocalAccountRepository {
  /** Pelo nickname, sem diferenciar maiúsculas. */
  byNickname(nickname: string): Promise<LocalAccount | undefined>;
  /** Pelo e-mail (já normalizado). */
  byEmail(email: string): Promise<LocalAccount | undefined>;
  /** Todas as contas (para a lista de pessoas). */
  all(): Promise<LocalAccount[]>;
  /** Cria a conta. Diz qual dado já está em uso, se for o caso. */
  create(
    account: LocalAccount,
  ): Promise<'ok' | 'nickname_taken' | 'email_taken'>;
  /** Muda os dados da conta do e-mail. O novo nickname não pode ser de outra pessoa. */
  update(
    email: string,
    changes: AccountChanges,
  ): Promise<'ok' | 'nickname_taken' | 'not_found'>;
}

/** Código de e-mail guardado (só o hash). */
export type EmailCode = {
  email: string;
  purpose: string;
  codeHash: string;
  expiresAt: number;
  sentAt: number;
  attempts: number;
};

export interface EmailCodeRepository {
  get(email: string, purpose: string): Promise<EmailCode | undefined>;
  /** Grava o código novo no lugar do anterior (zera as tentativas). */
  put(code: EmailCode): Promise<void>;
  /** Conta uma tentativa errada. */
  bump(email: string, purpose: string): Promise<void>;
  remove(email: string, purpose: string): Promise<void>;
}

/** Contador de tentativas por chave (IP, e-mail) em uma janela de tempo. */
export interface RateLimit {
  /** Registra a tentativa. Devolve false quando passou do limite. */
  attempt(key: string): Promise<boolean>;
  reset(key: string): Promise<void>;
}

/** Sessões encerradas antes de vencer (saída da conta). */
export interface Revocations {
  /** Marca a sessão como encerrada por `ttlSeconds`, o tempo que ela ainda valeria. */
  revoke(sessionId: string, ttlSeconds: number): Promise<void>;
  isRevoked(sessionId: string): Promise<boolean>;
}
