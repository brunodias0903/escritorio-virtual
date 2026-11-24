import type {
  AccessibilityNeed,
  AccountTier,
  GenderIdentity,
  MfaMethod,
} from '../../shared/domain/index.js';

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
  /** Cargo principal de acesso (master, admin, developer, designer, tester). */
  tier?: AccountTier;
  /** Cargos secundários (somam permissões e badges, estilo Discord). */
  secondaryTiers?: AccountTier[];
  /** True quando o e-mail já foi confirmado com código. */
  emailVerified?: boolean;
  /** null = ainda não respondeu; true = aceita novidades/patch notes; false = só importantes. */
  emailMarketingOptIn?: boolean | null;
  /** JSON serializado da preferência de tema da interface. */
  uiTheme?: string | null;
  /** True quando a autenticação em 2 etapas (e-mail ou TOTP) está ativa. */
  mfaEnabled?: boolean;
  /** Método de MFA ativo ('none' | 'email' | 'totp'). */
  mfaMethod?: MfaMethod;
  /** Segredo TOTP criptografado em repouso (AES-256-GCM). */
  mfaSecretEnc?: string | null;
  /** Hashes dos códigos de recuperação de uso único restantes. */
  mfaRecoveryHashes?: string[];
  /** Identidade de gênero opcional (LGPD Art. 11). */
  genderIdentity?: GenderIdentity;
  /** Pronomes opcionais (ex.: ele/dele, ela/dela, elu/delu). */
  pronouns?: string;
  /** Necessidades de acessibilidade privadas (nunca exibidas publicamente). */
  accessibilityNeeds?: AccessibilityNeed[];
  /** JSON serializado das preferências de acessibilidade (alto contraste, etc.). */
  accessibilityPrefs?: string | null;
  /** Timestamp (ms) em que a conta foi banida permanentemente (null = ativa). */
  bannedAt?: number | null;
  /** Motivo do banimento informado pela conta master. */
  banReason?: string;
  /** Timestamp (ms) até quando a conta está restringida/suspensa (null = sem restrição). */
  restrictedUntil?: number | null;
  /** Motivo da restrição temporária. */
  restrictionReason?: string;
};

export type AccountModerationPatch = {
  bannedAt?: number | null;
  banReason?: string;
  restrictedUntil?: number | null;
  restrictionReason?: string;
};

export type AccountChanges = Pick<
  LocalAccount,
  'nickname' | 'fullName' | 'role'
> & {
  passwordHash?: string;
  genderIdentity?: GenderIdentity;
  pronouns?: string;
  accessibilityNeeds?: AccessibilityNeed[];
  accessibilityPrefs?: string | null;
};

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
  /** Marca o e-mail da conta como verificado. */
  markVerified?(email: string): Promise<'ok' | 'not_found'>;
  /** Salva o tema/cores escolhidos pelo usuário (JSON). */
  setUiTheme?(
    email: string,
    uiTheme: string | null,
  ): Promise<'ok' | 'not_found'>;
  /** Salva a preferência de notificações por e-mail (novidades/patch notes vs só importantes). */
  setEmailMarketingOptIn?(
    email: string,
    optIn: boolean,
  ): Promise<'ok' | 'not_found'>;
  /** Atualiza o estado de MFA (e-mail ou TOTP) da conta. */
  setMfa?(
    email: string,
    mfa: {
      enabled: boolean;
      method?: MfaMethod;
      secretEnc: string | null;
      recoveryHashes: string[];
    },
  ): Promise<'ok' | 'not_found'>;
  /** Atualiza cargo principal, cargos secundários e opcionalmente a função exibida. */
  setRoles?(
    email: string,
    roles: {
      tier: AccountTier;
      secondaryTiers: AccountTier[];
      role?: string;
    },
  ): Promise<'ok' | 'not_found'>;
  /** Atualiza banimento ou restrição temporária da conta. */
  setModeration?(
    email: string,
    moderation: AccountModerationPatch,
  ): Promise<'ok' | 'not_found'>;
  /** Exclui a conta (LGPD Art. 18, VI ou remoção pela conta master). */
  deleteByEmail?(email: string): Promise<'ok' | 'not_found'>;
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
