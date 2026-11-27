import { Coffee, Utensils } from 'lucide-react';

import { ConfirmDialog } from '@/shared/ui/tamagui';

type Props = {
  kind: 'coffee' | 'lunch';
  onFinishBreak: () => void;
  onReturnToPantry: () => void;
};

/**
 * Diálogo em Tamagui (`AlertDialog`) exibido quando o usuário sai da copa
 * enquanto está em pausa para café ou almoço.
 */
export function PantryExitPrompt({
  kind,
  onFinishBreak,
  onReturnToPantry,
}: Props) {
  const isLunch = kind === 'lunch';

  return (
    <ConfirmDialog
      open
      tone="accent"
      icon={
        isLunch ? (
          <Utensils size={20} color="var(--accent-link)" aria-hidden={true} />
        ) : (
          <Coffee size={20} color="var(--accent-link)" aria-hidden={true} />
        )
      }
      title={
        isLunch ? 'Você já terminou o almoço?' : 'Você já terminou o seu café?'
      }
      description={`Você saiu da área da copa. Enquanto estiver com o status ${isLunch ? 'Almoçando' : 'Tomando um café'}, ninguém consegue iniciar chamadas ou interagir por voz com você.`}
      confirmLabel="Sim, ficar Disponível"
      cancelLabel={isLunch ? 'Voltar para a copa' : 'Continuar no café'}
      onConfirm={onFinishBreak}
      onCancel={onReturnToPantry}
    />
  );
}
