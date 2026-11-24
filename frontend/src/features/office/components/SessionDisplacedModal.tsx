import styles from './SessionDisplacedModal.module.css';

type Props = {
  onTakeover: () => void;
  onLogout: () => void;
};

/**
 * Popup exibido no dispositivo anterior quando a mesma conta é aberta em outro
 * dispositivo, permitindo reassumir o acesso aqui com um clique.
 */
export function SessionDisplacedModal({ onTakeover, onLogout }: Props) {
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Conta acessada em outro dispositivo"
      data-scroll-lock="true"
    >
      <div className={styles.card}>
        <div className={styles.badge}>📱 Sessão ativa em outro dispositivo</div>
        <h2 className={styles.title}>
          Sua conta foi acessada em outro dispositivo
        </h2>
        <p className={styles.desc}>
          Para evitar duplicidade no escritório e conflito de áudio/vídeo, sua
          sessão neste dispositivo foi pausada. Você pode assumir o acesso aqui
          a qualquer momento.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={onTakeover}
          >
            Usar aqui (assumir sessão)
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onLogout}
          >
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}
