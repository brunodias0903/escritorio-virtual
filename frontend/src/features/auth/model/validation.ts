import {
  LoginSchema,
  RegisterSchema,
  RequestCodeSchema,
  ResetPasswordSchema,
  UpdateAccountSchema,
  type Login,
  type Register,
  type ResetPassword,
  type UpdateAccount,
} from '@/shared/domain';

export type Validation<T> =
  { ok: true; data: T } | { ok: false; message: string };

const firstIssue = (issues: { message: string }[]): string =>
  issues[0]?.message ?? 'Dados inválidos.';

/** Login: nickname ou e-mail, e a senha. */
export const validateLogin = (input: {
  login: string;
  password: string;
}): Validation<Login> => {
  const parsed = LoginSchema.safeParse(input);
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, message: firstIssue(parsed.error.issues) };
};

/** Edição da conta: confere tudo e que as duas senhas novas são iguais. */
export const validateUpdate = (
  input: UpdateAccount & { confirmPassword: string },
): Validation<UpdateAccount> => {
  const { confirmPassword, ...fields } = input;
  const parsed = UpdateAccountSchema.safeParse(fields);
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error.issues) };
  }
  if (parsed.data.newPassword !== confirmPassword) {
    return { ok: false, message: 'As senhas novas não são iguais.' };
  }
  return { ok: true, data: parsed.data };
};

/** Pedir o código: só o e-mail precisa estar certo. */
export const validateCodeEmail = (email: string): Validation<string> => {
  const parsed = RequestCodeSchema.shape.email.safeParse(email);
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, message: firstIssue(parsed.error.issues) };
};

/** Esqueci a senha: e-mail, código e a senha nova duas vezes. */
export const validateReset = (
  input: ResetPassword & { confirmPassword: string },
): Validation<ResetPassword> => {
  const { confirmPassword, ...fields } = input;
  const parsed = ResetPasswordSchema.safeParse(fields);
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error.issues) };
  }
  if (parsed.data.password !== confirmPassword) {
    return { ok: false, message: 'As senhas não são iguais.' };
  }
  return { ok: true, data: parsed.data };
};

/** Cadastro: confere tudo e que as duas senhas são iguais. */
export const validateRegister = (
  input: Register & { confirmPassword: string },
): Validation<Register> => {
  const { confirmPassword, ...fields } = input;
  const parsed = RegisterSchema.safeParse(fields);
  if (!parsed.success) {
    return { ok: false, message: firstIssue(parsed.error.issues) };
  }
  if (parsed.data.password !== confirmPassword) {
    return { ok: false, message: 'As senhas não são iguais.' };
  }
  return { ok: true, data: parsed.data };
};
