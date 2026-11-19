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

/** Para que serve o código: criar conta ou trocar a senha esquecida. */
export const CODE_PURPOSES = ['register', 'reset'] as const;
export type CodePurpose = (typeof CODE_PURPOSES)[number];

export const RequestCodeSchema = z.object({
  email: AccountEmailSchema,
  purpose: z.enum(CODE_PURPOSES),
});
export type RequestCode = z.infer<typeof RequestCodeSchema>;

/** Esqueci a senha: e-mail, o código que chegou nele e a senha nova. */
export const ResetPasswordSchema = z.object({
  email: AccountEmailSchema,
  code: CodeSchema,
  password: PasswordSchema,
});
export type ResetPassword = z.infer<typeof ResetPasswordSchema>;

export const RegisterSchema = z.object({
  fullName: FullNameSchema,
  nickname: NicknameSchema,
  email: AccountEmailSchema,
  /** O código que chegou no e-mail. Só é pedido com EMAIL_CODES=true. */
  code: CodeSchema.optional(),
  role: RoleSchema,
  password: PasswordSchema,
});
export type Register = z.infer<typeof RegisterSchema>;

/**
 * Mudar os dados da conta já logado. O e-mail não muda (ele diz a empresa).
 * Para trocar a senha, informe a atual.
 */
export const UpdateAccountSchema = z
  .object({
    fullName: FullNameSchema,
    nickname: NicknameSchema,
    role: RoleSchema,
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
});
export type Account = z.infer<typeof AccountSchema>;

/** Entra com o nickname OU o e-mail, e a senha. */
export const LoginSchema = z.object({
  login: z
    .string()
    .trim()
    .min(1, 'Informe o nickname ou o e-mail.')
    .max(254, 'Muito longo.'),
  password: z.string().min(1, 'Informe a senha.').max(PASSWORD_MAX_LENGTH),
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
  rate_limited: 'Calma: você está enviando mensagens rápido demais.',
  empty: 'Escreva uma mensagem.',
  archived: 'Este canal foi arquivado.',
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
