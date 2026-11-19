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
  onRegister: () => void;
  /** Abre o "Esqueci minha senha". Sem ele, o botão some (códigos desligados). */
  onForgot?: () => void;
};

/** Entrar com o nickname ou o e-mail, e a senha. */
export function LocalLoginForm({ onRegister, onForgot }: Props) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateLogin({ login, password });
    if (!validation.ok) return setError(validation.message);
    setError('');
    setBusy(true);
    const result = await authApi.login(validation.data);
    setBusy(false);
    if (result.ok) beginSession(result.data);
    else setError(errorMessage(result.error));
  };

  return (
    <form className={styles.form} onSubmit={(e) => void submit(e)} noValidate>
      <div className={styles.header}>
        <h2 className={styles.title}>Entrar</h2>
        <p className={styles.subtitle}>
          Acesse com seu e-mail ou nickname e senha
        </p>
      </div>

      <Field
        label="Nickname ou e-mail"
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
    </form>
  );
}
