import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Tipo da conta: `company` (time da casa, pode ser administrador) ou
 * `third_party` (convidado externo, nunca administrador).
 */
export type AccountKind = 'company' | 'third_party';

/**
 * Quem pode criar conta. Vem do ambiente do servidor:
 * - ACCOUNT_DOMAINS: domínios inteiros, ex.: `empresa.com,parceiro.com:externo`;
 * - ALLOWED_EMAILS: e-mails soltos, ex.: `ana@gmail.com,bia@gmail.com`.
 */
export type AccountAccess = {
  domains: { domain: string; kind: AccountKind }[];
  emails: string[];
};

export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

const items = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

/** Lê ACCOUNT_DOMAINS e ALLOWED_EMAILS. O sufixo `:externo` marca convidados. */
export const parseAccountAccess = (
  domainsRaw: string | undefined,
  emailsRaw: string | undefined,
): AccountAccess => ({
  domains: items(domainsRaw).map((item) => {
    const [domain = '', tag] = item.replace(/^@/, '').split(':');
    return { domain, kind: tag === 'externo' ? 'third_party' : 'company' };
  }),
  emails: items(emailsRaw).map(normalizeEmail),
});

/**
 * O tipo da conta para o e-mail, ou undefined se ele não pode criar conta.
 * Confere o domínio inteiro: `x@evilparceiro.com` não passa por `parceiro.com`.
 */
export const accountKindOf = (
  email: string,
  access: AccountAccess,
): AccountKind | undefined => {
  const normalized = normalizeEmail(email);
  const parts = normalized.split('@');
  if (parts.length !== 2 || parts[0] === '') return undefined;
  if (access.emails.includes(normalized)) return 'company';
  return access.domains.find((d) => d.domain === parts[1])?.kind;
};

const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'E-mail muito longo.')
  .pipe(z.email('E-mail inválido.'));

const PasswordSchema = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `A senha precisa de ${PASSWORD_MIN_LENGTH} caracteres ou mais.`,
  )
  .max(PASSWORD_MAX_LENGTH, 'Senha muito longa.');

// --- Requisições -------------------------------------------------------------

/** Nickname (o "username"): letras, números, ponto, hífen ou sublinhado. */
export const NICKNAME_PATTERN = /^[A-Za-z0-9._-]{3,20}$/;

const NicknameSchema = z
  .string()
  .trim()
  .regex(
    NICKNAME_PATTERN,
    'O nickname precisa de 3 a 20 letras, números, ponto, hífen ou _.',
  );

/** Nome completo: pelo menos nome e sobrenome. */
const FullNameSchema = z
  .string()
  .trim()
  .max(80, 'Nome muito longo.')
  .transform((name) => name.replace(/\s+/g, ' '))
  .refine(
    (name) => name.split(' ').filter((part) => part.length >= 2).length >= 2,
    'Informe o nome completo (nome e sobrenome).',
  );

export const ROLE_MAX_LENGTH = 60;

/** Cargo da pessoa (ex.: "Desenvolvedor"). Pode ficar em branco. */
const RoleSchema = z
  .string()
  .trim()
  .max(ROLE_MAX_LENGTH, 'Cargo muito longo.')
  .transform((role) => role.replace(/\s+/g, ' '))
  .default('');

/** Código de confirmação enviado por e-mail: 6 números. */
export const CODE_LENGTH = 6;

const CodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, `Informe o código de ${CODE_LENGTH} números do e-mail.`);

/** Quem pode criar conta é conferido no servidor (ACCOUNT_DOMAINS e ALLOWED_EMAILS). */
const AccountEmailSchema = EmailSchema;

/** Para que serve o código: criar conta, trocar senha esquecida, verificar e-mail ou login 2FA. */
export const CODE_PURPOSES = ['register', 'reset', 'verify', 'mfa'] as const;
export type CodePurpose = (typeof CODE_PURPOSES)[number];

export const RequestCodeSchema = z.object({
  email: AccountEmailSchema,
  purpose: z.enum(CODE_PURPOSES),
});
export type RequestCode = z.infer<typeof RequestCodeSchema>;

/** Confirmação de verificação do e-mail da conta já logada. */
export const VerifyEmailSchema = z.object({
  code: CodeSchema,
});
export type VerifyEmail = z.infer<typeof VerifyEmailSchema>;

export const MFA_METHODS = ['none', 'email', 'totp'] as const;
export type MfaMethod = (typeof MFA_METHODS)[number];

export const MfaEmailToggleSchema = z.object({
  enabled: z.boolean(),
});
export type MfaEmailToggle = z.infer<typeof MfaEmailToggleSchema>;

/** Ativação de MFA (TOTP) com código de 6 dígitos do app autenticador. */
export const MfaEnableSchema = z.object({
  code: CodeSchema,
});
export type MfaEnable = z.infer<typeof MfaEnableSchema>;

/** Desativação de MFA: exige senha atual e código TOTP ou código de recuperação. */
export const MfaDisableSchema = z.object({
  password: z.string().min(1, 'Informe a senha.').max(PASSWORD_MAX_LENGTH),
  code: z.string().trim().min(6, 'Informe o código.').max(20),
});
export type MfaDisable = z.infer<typeof MfaDisableSchema>;

export const MfaSetupResponseSchema = z.object({
  secret: z.string(),
  otpauthUrl: z.string(),
  qrDataUrl: z.string(),
});
export type MfaSetupResponse = z.infer<typeof MfaSetupResponseSchema>;

export const MfaEnableResponseSchema = z.object({
  mfaEnabled: z.literal(true),
  recoveryCodes: z.array(z.string()),
});
export type MfaEnableResponse = z.infer<typeof MfaEnableResponseSchema>;

const HexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/** Preferência de tema/cores da interface salva na conta do usuário. */
export const UiThemeSchema = z.object({
  presetId: z.enum(['default', 'games', 'fantasy', 'scifi']),
  colors: z.object({
    rail: HexColorSchema,
    surface: HexColorSchema,
    accent: HexColorSchema,
    presence: HexColorSchema,
  }),
  customized: z.boolean(),
});
export type UiTheme = z.infer<typeof UiThemeSchema>;

// --- Inclusão & Acessibilidade (100% opcionais, LGPD Art. 11) -----------------

export const GENDER_IDENTITIES = [
  'prefer_not_to_say',
  'cis_man',
  'cis_woman',
  'trans_man',
  'trans_woman',
  'non_binary',
  'gender_fluid',
  'agender',
  'other',
] as const;
export type GenderIdentity = (typeof GENDER_IDENTITIES)[number];

export const GENDER_IDENTITY_LABELS: Record<GenderIdentity, string> = {
  prefer_not_to_say: 'Prefiro não informar',
  cis_man: 'Homem cisgênero',
  cis_woman: 'Mulher cisgênero',
  trans_man: 'Homem transgênero',
  trans_woman: 'Mulher transgênero',
  non_binary: 'Pessoa não-binária',
  gender_fluid: 'Gênero fluido',
  agender: 'Agênero',
  other: 'Outro',
};

export const PRONOUN_PRESETS = [
  '',
  'ele/dele',
  'ela/dela',
  'elu/delu',
  'ele/elu',
  'ela/elu',
  'qualquer pronome',
] as const;

export const ACCESSIBILITY_NEEDS = [
  'visual',
  'colorblind',
  'hearing',
  'motor',
  'neurodivergent',
] as const;
export type AccessibilityNeed = (typeof ACCESSIBILITY_NEEDS)[number];

export const ACCESSIBILITY_NEED_LABELS: Record<AccessibilityNeed, string> = {
  visual: 'Deficiência visual / baixa visão',
  colorblind: 'Daltonismo / dificuldade com cores',
  hearing: 'Deficiência auditiva / surdez',
  motor: 'Deficiência motora / mobilidade reduzida',
  neurodivergent: 'Neurodivergência (TEA, TDAH, dislexia, sensibilidade)',
};

export const COLORBLIND_MODES = [
  'none',
  'protanopia',
  'deuteranopia',
  'tritanopia',
] as const;
export type ColorblindMode = (typeof COLORBLIND_MODES)[number];

export const AccessibilityPrefsSchema = z.object({
  highContrast: z.boolean().default(false),
  reducedMotion: z.boolean().default(false),
  largeText: z.boolean().default(false),
  dyslexiaFont: z.boolean().default(false),
  visualAlerts: z.boolean().default(false),
  colorblindMode: z.enum(COLORBLIND_MODES).default('none'),
});
export type AccessibilityPrefs = z.infer<typeof AccessibilityPrefsSchema>;

export const DEFAULT_ACCESSIBILITY_PREFS: AccessibilityPrefs = {
  highContrast: false,
  reducedMotion: false,
  largeText: false,
  dyslexiaFont: false,
  visualAlerts: false,
  colorblindMode: 'none',
};

/** Esqueci a senha: e-mail, o código que chegou nele e a senha nova. */
export const ResetPasswordSchema = z.object({
  email: AccountEmailSchema,
  code: CodeSchema,
  password: PasswordSchema,
});
export type ResetPassword = z.infer<typeof ResetPasswordSchema>;

/**
 * Tiers de conta na V1 (equipe e acesso antecipado).
 * Na Fase 3 serão combinados com os tiers de assinatura (trial, starter, pro, business, convidado).
 */
export const ACCOUNT_TIERS = [
  'master',
  'admin',
  'developer',
  'designer',
  'tester',
] as const;
export type AccountTier = (typeof ACCOUNT_TIERS)[number];

export const ACCOUNT_TIER_LABELS: Record<AccountTier, string> = {
  master: 'Master',
  admin: 'Administrador',
  developer: 'Desenvolvedor',
  designer: 'Designer',
  tester: 'Tester',
};

/** Cores estilo Discord para identificar cada cargo nos painéis e lista de pessoas. */
export const ACCOUNT_TIER_COLORS: Record<AccountTier, string> = {
  master: '#f59e0b',
  admin: '#f43f5e',
  developer: '#3b82f6',
  designer: '#a855f7',
  tester: '#10b981',
};

/** Cargos atribuíveis pelo painel administrativo (Master é exclusivo da conta dona). */
export const ASSIGNABLE_TIERS = [
  'admin',
  'developer',
  'designer',
  'tester',
] as const satisfies readonly AccountTier[];

/** Normaliza o conjunto efetivo de cargos (principal primeiro, sem repetição). */
export const effectiveTiersOf = (
  primary: AccountTier,
  secondary?: readonly AccountTier[],
): AccountTier[] => {
  const seen = new Set<AccountTier>([primary]);
  const result: AccountTier[] = [primary];
  for (const t of secondary ?? []) {
    if (!seen.has(t)) {
      seen.add(t);
      result.push(t);
    }
  }
  return result;
};

/** Preferência de notificações por e-mail (LGPD opt-in). */
export const EmailPreferencesSchema = z.object({
  marketingOptIn: z.boolean(),
});
export type EmailPreferences = z.infer<typeof EmailPreferencesSchema>;

export const RegisterSchema = z.object({
  fullName: FullNameSchema,
  nickname: NicknameSchema,
  email: AccountEmailSchema,
  /** O código que chegou no e-mail. Só é pedido com EMAIL_CODES=true. */
  code: CodeSchema.optional(),
  role: RoleSchema,
  password: PasswordSchema,
  /** Aceite explícito para receber novidades, patch notes e avisos por e-mail. */
  emailMarketingOptIn: z.boolean().optional(),
  /** Declaração de maioridade (18+ / ECA) e aceite dos Termos de Uso e LGPD. */
  acceptedTerms: z.boolean().optional(),
  /** Campos inclusivos 100% opcionais (LGPD Art. 11). */
  genderIdentity: z.enum(GENDER_IDENTITIES).optional(),
  pronouns: z.string().trim().max(30).optional(),
  accessibilityNeeds: z.array(z.enum(ACCESSIBILITY_NEEDS)).optional(),
  accessibilityPrefs: AccessibilityPrefsSchema.optional(),
});
export type Register = z.infer<typeof RegisterSchema>;

export const DeleteAccountSchema = z.object({
  password: z.string().min(1, 'Informe a senha.').max(PASSWORD_MAX_LENGTH),
});
export type DeleteAccount = z.infer<typeof DeleteAccountSchema>;

/**
 * Mudar os dados da conta já logado. O e-mail não muda (ele diz a empresa).
 * Para trocar a senha, informe a atual.
 */
export const UpdateAccountSchema = z
  .object({
    fullName: FullNameSchema,
    nickname: NicknameSchema,
    role: RoleSchema,
    genderIdentity: z.enum(GENDER_IDENTITIES).optional(),
    pronouns: z.string().trim().max(30).optional(),
    accessibilityNeeds: z.array(z.enum(ACCESSIBILITY_NEEDS)).optional(),
    accessibilityPrefs: AccessibilityPrefsSchema.optional(),
    currentPassword: z.string().max(PASSWORD_MAX_LENGTH).default(''),
    newPassword: z.union([PasswordSchema, z.literal('')]).default(''),
  })
  .refine((u) => u.newPassword === '' || u.currentPassword !== '', {
    message: 'Informe a senha atual para trocar a senha.',
    path: ['currentPassword'],
  });
export type UpdateAccount = z.infer<typeof UpdateAccountSchema>;

/** O que o servidor liga ou desliga. A tela de login se ajusta a isso. */
export const AuthOptionsSchema = z.object({
  emailCodes: z.boolean(),
  /** Domínios aceitos no cadastro, para a dica da tela. Os e-mails soltos não aparecem. */
  domains: z.array(z.string()).default([]),
});
export type AuthOptions = z.infer<typeof AuthOptionsSchema>;

/** Os dados da conta, para preencher a tela de edição. */
export const AccountSchema = z.object({
  fullName: z.string(),
  nickname: z.string(),
  email: z.string(),
  role: z.string(),
  tier: z.enum(ACCOUNT_TIERS).default('tester'),
  secondaryTiers: z.array(z.enum(ACCOUNT_TIERS)).default([]),
  emailVerified: z.boolean().default(false),
  mfaEnabled: z.boolean().default(false),
  mfaMethod: z.enum(MFA_METHODS).optional(),
  /** null = ainda não respondeu (conta criada antes dessa opção). */
  emailMarketingOptIn: z.boolean().nullable().optional(),
  uiTheme: UiThemeSchema.nullable().optional(),
  genderIdentity: z.enum(GENDER_IDENTITIES).optional(),
  pronouns: z.string().optional(),
  accessibilityNeeds: z.array(z.enum(ACCESSIBILITY_NEEDS)).optional(),
  accessibilityPrefs: AccessibilityPrefsSchema.nullable().optional(),
});
export type Account = z.infer<typeof AccountSchema>;

/** Entra com o nickname OU o e-mail, e a senha (mais código MFA se ativado). */
export const LoginSchema = z.object({
  login: z
    .string()
    .trim()
    .min(1, 'Informe o nickname ou o e-mail.')
    .max(254, 'Muito longo.'),
  password: z.string().min(1, 'Informe a senha.').max(PASSWORD_MAX_LENGTH),
  mfaCode: z.string().trim().max(20).optional(),
});
export type Login = z.infer<typeof LoginSchema>;

/** O login não diferencia maiúsculas: "Bruno" e "bruno" são o mesmo. */
export const nicknameKey = (nickname: string): string =>
  nickname.trim().toLowerCase();
// --- Respostas -----------------------------------------------------------------

export const SessionUserSchema = z.object({
  email: z.string(),
  /** Nome completo: é o que aparece no escritório e no chat. */
  name: z.string(),
  admin: z.boolean(),
  kind: z.enum(['company', 'third_party']) satisfies z.ZodType<AccountKind>,
  tier: z.enum(ACCOUNT_TIERS).default('tester'),
  secondaryTiers: z.array(z.enum(ACCOUNT_TIERS)).default([]),
  nickname: z.string().default(''),
  role: z.string().default(''),
});
export type SessionUser = z.infer<typeof SessionUserSchema>;

export const SessionSchema = z.object({
  token: z.string(),
  user: SessionUserSchema,
});
export type Session = z.infer<typeof SessionSchema>;

export const ApiErrorSchema = z.object({ error: z.string() });

/** Mensagens para os códigos de erro da API. */
export const ERROR_MESSAGES: Record<string, string> = {
  invalid_request: 'Dados inválidos. Confira os campos.',
  invalid_login: 'Nickname, e-mail ou senha incorretos.',
  wrong_password: 'A senha atual está errada.',
  mfa_required: 'Informe o código de 6 dígitos do seu aplicativo autenticador.',
  mfa_required_email:
    'Enviamos um código de 6 dígitos para o seu e-mail. Digite-o para concluir o login.',
  email_not_verified:
    'Confirme seu e-mail primeiro antes de ativar o 2FA por e-mail.',
  invalid_mfa_code: 'Código de autenticação inválido ou expirado.',
  invalid_code: 'Código errado ou vencido. Peça um novo.',
  code_wait: 'Espere um minuto para pedir outro código.',
  mail_failed: 'Não foi possível enviar o e-mail. Tente de novo.',
  no_account: 'Esta sessão não tem conta para editar. Entre de novo.',
  nickname_taken: 'Esse nickname já está em uso. Escolha outro.',
  email_taken: 'Já existe uma conta com esse e-mail.',
  email_not_allowed: 'Esse e-mail não tem permissão para criar conta.',
  too_many_attempts: 'Muitas tentativas. Aguarde alguns minutos.',
  unauthorized: 'Sessão expirada. Entre novamente.',
  forbidden: 'Você não tem permissão para isso.',
  not_found: 'Não encontrado.',
  account_banned: 'Esta conta foi banida do servidor.',
  account_restricted: 'Esta conta está temporariamente restringida.',
  cannot_moderate_self: 'Você não pode aplicar moderação à própria conta.',
  cannot_moderate_master: 'Não é possível moderar a conta master.',
  cannot_edit_own_roles: 'Você não pode alterar os próprios cargos.',
  cannot_manage_higher_role:
    'Você não tem permissão para alterar os cargos desta conta.',
  cannot_assign_master: 'O cargo Master é exclusivo da conta proprietária.',
  cannot_assign_admin:
    'Apenas a conta Master pode atribuir ou remover o cargo Administrador.',
  rate_limited: 'Calma: você está enviando mensagens rápido demais.',
  spam_blocked:
    'Filtro anti-spam ativado: aguarde 1 minuto antes de enviar novas mensagens.',
  verbal_abuse_warning:
    'Aviso de conduta: termos ofensivos foram censurados. Reincidências restringem temporariamente seu chat.',
  hate_speech_blocked:
    'Mensagem bloqueada por conter discurso de ódio ou discriminação. Reincidências restringem sua conta.',
  chat_muted:
    'Seu chat foi restringido temporariamente (5 min) por reincidência de abuso verbal.',
  terms_required:
    'É obrigatório confirmar que você tem 18 anos ou mais e aceitar os Termos de Uso e Privacidade.',
  empty: 'Escreva uma mensagem.',
  archived: 'Este canal foi arquivado.',
  channel_read_only:
    'Apenas administradores ou tiers autorizados podem enviar mensagens neste canal.',
  invalid_thread: 'Não é possível responder a esta mensagem.',
  invalid_name:
    'Nome inválido. Use letras minúsculas, números e hífen (2 a 30 caracteres).',
  name_taken: 'Já existe um canal com esse nome.',
  desk_taken: 'Esta mesa já tem dono.',
  desk_limit: 'Você já tem uma mesa. Devolva a outra antes de adotar esta.',
  not_owner: 'Só quem adotou a mesa pode mudá-la.',
  not_in_desk: 'Chegue até a mesa para adotá-la.',
  invalid_desk: 'Mesa não encontrada.',
  invalid_desk_position: 'Não é possível colocar a mesa nesse lugar.',
  zone_full: 'A mesa está cheia (3 de 3).',
  network: 'Não foi possível falar com o servidor.',
};

export const errorMessage = (code: string): string =>
  ERROR_MESSAGES[code] ?? 'Algo deu errado. Tente de novo.';
