import styles from './PantryExitPrompt.module.css';

type Props = {
  kind: 'coffee' | 'lunch';
  onFinishBreak: () => void;
  onReturnToPantry: () => void;
};

/**
 * Pop-up exibido quando o usuário sai da copa enquanto está com o status
 * "Tomando um café" ou "Almoçando", perguntando se já terminou a pausa para
 * voltar ao status Disponível (já que durante a pausa ninguém pode interagir
 * com ele).
 */
export function PantryExitPrompt({
  kind,
  onFinishBreak,
  onReturnToPantry,
}: Props) {
  const isLunch = kind === 'lunch';
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={
        isLunch ? 'Você já terminou o almoço?' : 'Você já terminou o café?'
      }
      data-scroll-lock="true"
    >
      <div className={styles.card}>
        <div className={styles.badge}>
          {isLunch ? '🍽️ Horário de almoço' : '☕ Pausa para o café'}
        </div>
        <h2 className={styles.title}>
          {isLunch
            ? 'Você já terminou o almoço?'
            : 'Você já terminou o seu café?'}
        </h2>
        <p className={styles.desc}>
          Você saiu da área da copa. Enquanto estiver com o status{' '}
          <strong>{isLunch ? 'Almoçando' : 'Tomando um café'}</strong>, ninguém
          consegue iniciar chamadas ou interagir por voz com você.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={onFinishBreak}
          >
            {isLunch
              ? 'Sim, já terminei (ficar Disponível)'
              : 'Sim, já terminei (ficar Disponível)'}
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onReturnToPantry}
          >
            {isLunch
              ? 'Ainda estou almoçando (voltar para a copa)'
              : 'Ainda estou tomando café (voltar para a copa)'}
          </button>
        </div>
      </div>
    </div>
  );
}
