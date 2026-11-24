import { useState, type FormEvent } from 'react';

import { authApi } from '@/app/api';
import { errorMessage } from '@/shared/domain';

import styles from './VerifyEmailPrompt.module.css';

type Props = {
  token: string;
  email: string;
  onVerified: () => void;
  onDismiss: () => void;
};

/**
 * Destaque exibido logo ao entrar para contas criadas antes da verificação
 * obrigatória de e-mail, incentivando a confirmação com código de 6 dígitos.
 */
export function VerifyEmailPrompt({
  token,
  email,
  onVerified,
  onDismiss,
}: Props) {
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const sendCode = async () => {
    setBusy(true);
    setError('');
    setInfo('');
    const res = await authApi.startVerifyEmail(token);
    setBusy(false);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setCodeSent(true);
    setInfo(`Código de 6 dígitos enviado para ${email}.`);
  };

  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    const clean = code.replace(/\D/g, '').slice(0, 6);
    if (clean.length !== 6) {
      setError('Digite os 6 números do código enviado ao seu e-mail.');
      return;
    }
    setBusy(true);
    setError('');
    const res = await authApi.confirmVerifyEmail(token, clean);
    setBusy(false);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    onVerified();
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Confirme seu e-mail"
      data-scroll-lock="true"
    >
      <div className={styles.card}>
        <div className={styles.badge}>✉️ Verificação pendente</div>
        <h2 className={styles.title}>
          Confirme seu e-mail para proteger sua conta
        </h2>
        <p className={styles.subtitle}>
          Sua conta (<strong>{email}</strong>) foi criada antes da confirmação
          por código. Verifique seu e-mail agora para garantir recuperação de
          senha e mais segurança no Escritório Virtual.
        </p>

        {!codeSent ? (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={busy}
              onClick={() => void sendCode()}
            >
              {busy ? 'Enviando código…' : 'Enviar código de verificação'}
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={busy}
              onClick={onDismiss}
            >
              Verificar depois
            </button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={(e) => void confirm(e)}>
            {info ? <p className={styles.info}>{info}</p> : null}
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className={styles.codeInput}
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              autoFocus
            />
            <div className={styles.actions}>
              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={busy || code.length !== 6}
              >
                {busy ? 'Confirmando…' : 'Confirmar e-mail'}
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={busy}
                onClick={() => void sendCode()}
              >
                Reenviar código
              </button>
            </div>
            <button
              type="button"
              className={styles.laterLink}
              onClick={onDismiss}
            >
              Fazer isso depois
            </button>
          </form>
        )}

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
