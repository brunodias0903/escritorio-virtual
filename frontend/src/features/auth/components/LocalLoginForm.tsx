import { useState, type FormEvent } from 'react';

import { authApi } from '@/app/api';
import { beginSession } from '@/app/session';
import { errorMessage } from '@/shared/domain';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';

import { validateLogin } from '../model/validation';
import styles from './AuthForm.module.css';
import { LockIcon, MailIcon } from './AuthIcons';
import { SocialAuthButtons } from './SocialAuthButtons';

type Props = {
  /** Abre o cadastro. Sem ele, o botão some (ex.: ambiente de preview). */
  onRegister?: () => void;
  /** Abre o "Esqueci minha senha". Sem ele, o botão some (códigos desligados). */
  onForgot?: () => void;
};

/** Entrar com o nickname ou o e-mail, e a senha. */
export function LocalLoginForm({ onRegister, onForgot }: Props) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [mfaMode, setMfaMode] = useState<'none' | 'totp' | 'email'>('none');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateLogin({ login, password });
    if (!validation.ok) return setError(validation.message);
    if (mfaMode !== 'none' && mfaCode.trim().length < 6) {
      return setError(
        mfaMode === 'email'
          ? 'Digite o código de 6 dígitos enviado para o seu e-mail.'
          : 'Digite o código de 6 dígitos do autenticador (ou um código de recuperação).',
      );
    }
    setError('');
    setBusy(true);
    const result = await authApi.login({
      ...validation.data,
      ...(mfaMode !== 'none' ? { mfaCode: mfaCode.trim() } : {}),
    });
    setBusy(false);
    if (result.ok) {
      beginSession(result.data);
      return;
    }
    if (result.error === 'mfa_required') {
      setMfaMode('totp');
      setError('');
      return;
    }
    if (result.error === 'mfa_required_email') {
      setMfaMode('email');
      setError('');
      return;
    }
    setError(errorMessage(result.error));
  };

  return (
    <form className={styles.form} onSubmit={(e) => void submit(e)} noValidate>
      <div className={styles.header}>
        <h2 className={styles.title}>Entrar</h2>
        <p className={styles.subtitle}>
          Acesse com seu nome de usuário ou e-mail e senha
        </p>
      </div>

      <Field
        label="Nome de usuário ou e-mail"
        value={login}
        onChange={setLogin}
        autoComplete="username"
        placeholder="seu.nome@gmail.com"
        leadingIcon={<MailIcon />}
        variant="auth"
        fullWidth
      />

      <Field
        label="Senha"
        value={password}
        onChange={setPassword}
        type="password"
        autoComplete="current-password"
        placeholder="Digite sua senha"
        leadingIcon={<LockIcon />}
        variant="auth"
        fullWidth
      />

      {mfaMode !== 'none' ? (
        <>
          <Field
            label={
              mfaMode === 'email'
                ? 'Código de 6 dígitos enviado no seu e-mail'
                : 'Código de autenticação (2FA)'
            }
            value={mfaCode}
            onChange={setMfaCode}
            autoComplete="one-time-code"
            placeholder={mfaMode === 'email' ? '000000' : '000000 ou XXXX-XXXX'}
            leadingIcon={<LockIcon />}
            variant="auth"
            fullWidth
          />
          <div className={styles.inlineAction}>
            <button
              type="button"
              onClick={() => {
                setMfaMode(mfaMode === 'totp' ? 'email' : 'totp');
                setMfaCode('');
                setError('');
              }}
              className={styles.inlineLink}
            >
              {mfaMode === 'totp'
                ? 'Perdeu acesso ao aplicativo? Usar código por e-mail'
                : 'Prefere usar o aplicativo autenticador?'}
            </button>
          </div>
        </>
      ) : null}

      {onForgot ? (
        <div className={styles.inlineAction}>
          <button
            type="button"
            onClick={onForgot}
            className={styles.inlineLink}
          >
            Esqueci minha senha
          </button>
        </div>
      ) : null}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        title={busy ? 'Entrando…' : 'Entrar'}
        variant="gradient"
        disabled={busy}
        fullWidth
      />

      {onRegister ? (
        <>
          <SocialAuthButtons />

          <div className={styles.links}>
            <p className={styles.switchText}>
              Não tem conta?
              <button
                type="button"
                onClick={onRegister}
                className={styles.switchLink}
              >
                Cadastre-se
              </button>
            </p>
          </div>
        </>
      ) : null}
    </form>
  );
}
