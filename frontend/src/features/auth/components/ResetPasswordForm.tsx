import { useState, type FormEvent } from 'react';

import { authApi } from '@/app/api';
import { beginSession } from '@/app/session';
import { errorMessage } from '@/shared/domain';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';

import { validateReset } from '../model/validation';
import styles from './AuthForm.module.css';
import { LockIcon, MailIcon } from './AuthIcons';
import { CodeField } from './CodeField';

/** Esqueci a senha: código no e-mail e a senha nova. Depois, já entra. */
export function ResetPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{
    text: string;
    kind: 'error' | 'info';
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateReset({
      email,
      code,
      password,
      confirmPassword,
    });
    if (!validation.ok) {
      return setMessage({ text: validation.message, kind: 'error' });
    }
    setMessage(null);
    setBusy(true);
    const result = await authApi.resetPassword(validation.data);
    setBusy(false);
    if (result.ok) beginSession(result.data);
    else setMessage({ text: errorMessage(result.error), kind: 'error' });
  };

  return (
    <form className={styles.form} onSubmit={(e) => void submit(e)} noValidate>
      <div className={styles.header}>
        <h2 className={styles.title}>Trocar senha</h2>
        <p className={styles.subtitle}>
          Informe seu e-mail para receber o código e definir uma nova senha
        </p>
      </div>

      <Field
        label="E-mail da conta"
        value={email}
        onChange={setEmail}
        type="email"
        autoComplete="email"
        placeholder="seu.nome@gmail.com"
        leadingIcon={<MailIcon />}
        variant="auth"
        fullWidth
      />

      <CodeField
        email={email}
        purpose="reset"
        code={code}
        onCode={setCode}
        fullWidth
        onMessage={(text, kind) => setMessage({ text, kind })}
      />

      <div className={styles.row}>
        <Field
          label="Senha nova (10+ caracteres)"
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete="new-password"
          placeholder="Nova senha"
          leadingIcon={<LockIcon />}
          variant="auth"
          fullWidth
        />
        <Field
          label="Confirme a senha"
          value={confirmPassword}
          onChange={setConfirmPassword}
          type="password"
          autoComplete="new-password"
          placeholder="Repita a senha"
          leadingIcon={<LockIcon />}
          variant="auth"
          fullWidth
        />
      </div>

      {message ? (
        <p
          className={message.kind === 'error' ? styles.error : styles.info}
          role={message.kind === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      ) : null}

      <Button
        type="submit"
        title={busy ? 'Trocando…' : 'Trocar a senha e entrar'}
        variant="gradient"
        disabled={busy}
        fullWidth
      />

      <div className={styles.links}>
        <button type="button" onClick={onBack} className={styles.switchLink}>
          Voltar para o login
        </button>
      </div>
    </form>
  );
}
