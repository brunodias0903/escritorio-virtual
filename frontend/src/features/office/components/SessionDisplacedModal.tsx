import { Smartphone } from 'lucide-react';

import { ConfirmDialog } from '@/shared/ui/tamagui';

type Props = {
  onTakeover: () => void;
  onLogout: () => void;
};

/**
 * Diálogo em Tamagui (`AlertDialog`) exibido quando a mesma conta é aberta em outro dispositivo.
 */
export function SessionDisplacedModal({ onTakeover, onLogout }: Props) {
  return (
    <ConfirmDialog
      open
      tone="warning"
      icon={<Smartphone size={20} color="#f59e0b" aria-hidden={true} />}
      title="Sua conta foi acessada em outro dispositivo"
      description="Para evitar duplicidade no escritório e conflito de áudio/vídeo, sua sessão neste dispositivo foi pausada. Você pode assumir o acesso aqui a qualquer momento."
      confirmLabel="Usar aqui (assumir sessão)"
      cancelLabel="Sair da conta"
      onConfirm={onTakeover}
      onCancel={onLogout}
    />
  );
}
