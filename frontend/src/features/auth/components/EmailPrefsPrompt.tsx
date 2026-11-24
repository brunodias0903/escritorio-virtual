import { useId, useState } from 'react';

import { authApi } from '@/app/api';

import styles from './EmailPrefsPrompt.module.css';

type Props = {
  token: string;
  onDone: (marketingOptIn: boolean) => void;
};

/**
 * Pergunta única para contas criadas antes da opção de preferência de e-mail:
 * permite escolher entre receber todas as novidades/patch notes ou somente e-mails importantes.
 */
export function EmailPrefsPrompt({ token, onDone }: Props) {
  const titleId = useId();
  const [busy, setBusy] = useState(false);

  const choose = async (marketingOptIn: boolean) => {
    setBusy(true);
    await authApi.updateEmailPreferences(token, marketingOptIn);
    setBusy(false);
    onDone(marketingOptIn);
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-scroll-lock="true"
    >
      <div className={styles.card}>
        <h2 id={titleId} className={styles.title}>
          Preferências de e-mail ✉️
        </h2>
        <p className={styles.desc}>
          Como sua conta foi criada antes dessa opção, escolha quais e-mails
          você deseja receber da nossa equipe:
        </p>

        <div className={styles.options}>
          <button
            type="button"
            disabled={busy}
            className={`${styles.optionBtn} ${styles.optionPrimary}`}
            onClick={() => void choose(true)}
          >
            <span className={styles.optionTitle}>
              Todas as notificações e novidades
            </span>
            <span className={styles.optionSub}>
              Códigos de conta, avisos urgentes, patch notes, novidades e dicas.
            </span>
          </button>

          <button
            type="button"
            disabled={busy}
            className={styles.optionBtn}
            onClick={() => void choose(false)}
          >
            <span className={styles.optionTitle}>Somente os importantes</span>
            <span className={styles.optionSub}>
              Apenas códigos de verificação, recuperação de senha e alertas
              urgentes.
            </span>
          </button>
        </div>

        <p className={styles.footnote}>
          Você pode alterar essa escolha a qualquer momento na aba Perfil e
          conta.
        </p>
      </div>
    </div>
  );
}
