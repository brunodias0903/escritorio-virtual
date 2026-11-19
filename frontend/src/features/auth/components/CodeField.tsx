import { useEffect, useId, useState } from 'react';

import { authApi } from '@/app/api';
import { CODE_LENGTH, errorMessage, type CodePurpose } from '@/shared/domain';

import { validateCodeEmail } from '../model/validation';
import styles from './CodeField.module.css';

/** Espera para pedir outro código (igual ao servidor). */
const COOLDOWN_S = 60;

type Props = {
  email: string;
  purpose: CodePurpose;
  code: string;
  onCode: (code: string) => void;
  /** Mostra erro ou aviso (ex.: "código enviado"). */
  onMessage: (message: string, kind: 'error' | 'info') => void;
  fullWidth?: boolean;
};

/**
 * Campo do código com o botão "Enviar código" ao lado. Depois de enviar,
 * o botão espera 1 minuto para deixar pedir outro.
 */
export function CodeField({
  email,
  purpose,
  code,
  onCode,
  onMessage,
  fullWidth = false,
}: Props) {
  const id = useId();
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait(wait - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);

  const send = async () => {
    const valid = validateCodeEmail(email);
    if (!valid.ok) return onMessage(valid.message, 'error');
    setBusy(true);
    const result = await authApi.requestCode({ email: valid.data, purpose });
    setBusy(false);
    if (!result.ok) return onMessage(errorMessage(result.error), 'error');
    setWait(COOLDOWN_S);
    onMessage(
      `Enviamos um código para ${valid.data}. Veja a sua caixa de entrada (e o spam).`,
      'info',
    );
  };

  const label = busy
    ? 'Enviando…'
    : wait > 0
      ? `Reenviar (${wait}s)`
      : 'Enviar código';

  return (
    <div className={`${styles.container} ${fullWidth ? styles.fullWidth : ''}`}>
      <label htmlFor={id} className={styles.label}>
        Código do e-mail
      </label>
      <div className={styles.row}>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(event) =>
            onCode(event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))
          }
          placeholder="000000"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          className={styles.input}
          aria-label="Código do e-mail"
        />
        <span className={styles.count}>
          {code.length}/{CODE_LENGTH}
        </span>
        <button
          type="button"
          aria-label={label}
          disabled={busy || wait > 0}
          onClick={() => void send()}
          className={styles.button}
        >
          {label}
        </button>
      </div>
    </div>
  );
}
