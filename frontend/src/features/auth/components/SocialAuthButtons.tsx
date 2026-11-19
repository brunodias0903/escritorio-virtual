import { useState } from 'react';

import styles from './SocialAuthButtons.module.css';

type Provider = 'Gmail' | 'iCloud';

function GmailIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 6.5A2.5 2.5 0 0 1 5.5 4h.6L12 8.7 17.9 4h.6A2.5 2.5 0 0 1 21 6.5V18a2 2 0 0 1-2 2h-1.5V10.6L12 14.9 6.5 10.6V20H5a2 2 0 0 1-2-2V6.5Z"
        fill="#EA4335"
      />
      <path d="M3 7.4V18a2 2 0 0 0 2 2h1.5V10.6L3 7.4Z" fill="#4285F4" />
      <path d="M21 7.4V18a2 2 0 0 1-2 2h-1.5V10.6L21 7.4Z" fill="#34A853" />
      <path
        d="M17.5 10.6V4h1A2.5 2.5 0 0 1 21 6.5v.9l-3.5 3.2Z"
        fill="#FBBC05"
      />
      <path d="M6.5 10.6V4h-1A2.5 2.5 0 0 0 3 6.5v.9l3.5 3.2Z" fill="#C5221F" />
    </svg>
  );
}

function ICloudIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7.2 18.5h10.1a4.2 4.2 0 0 0 .7-8.34A5.5 5.5 0 0 0 7.4 8.55a4.3 4.3 0 0 0-.2 9.95Z"
        fill="#5AC8FA"
      />
      <path
        d="M17.3 18.5H7.2a4.3 4.3 0 0 1-.83-8.52A5.5 5.5 0 0 1 17.6 10.1a4.2 4.2 0 0 1-.3 8.4Z"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="1.1"
      />
    </svg>
  );
}

/**
 * Botões pré-prontos de acesso rápido (Gmail e iCloud).
 * Ficam visualmente desabilitados, mas capturam o clique para avisar que o recurso virá em breve.
 */
export function SocialAuthButtons() {
  const [notice, setNotice] = useState('');

  const handleUnavailable = (provider: Provider) => {
    setNotice(`O acesso rápido com ${provider} será adicionado futuramente.`);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.divider}>
        <span className={styles.line} />
        <span className={styles.label}>Ou continue com</span>
        <span className={styles.line} />
      </div>

      <div className={styles.grid}>
        <button
          type="button"
          aria-disabled="true"
          title="Em breve"
          onClick={() => handleUnavailable('Gmail')}
          className={styles.socialBtn}
        >
          <GmailIcon />
          <span>Gmail</span>
        </button>

        <button
          type="button"
          aria-disabled="true"
          title="Em breve"
          onClick={() => handleUnavailable('iCloud')}
          className={styles.socialBtn}
        >
          <ICloudIcon />
          <span>iCloud</span>
        </button>
      </div>

      {notice ? (
        <p className={styles.notice} role="status" aria-live="polite">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
