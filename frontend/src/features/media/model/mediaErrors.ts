export type MediaErrorTarget = 'mic' | 'cam' | 'screen' | 'audio';

/** Explica em português, de forma direta, por que o microfone, câmera, som ou tela não ligaram. */
export const describeMediaError = (
  error: unknown,
  secureContext: boolean,
  target: MediaErrorTarget = 'mic',
): string => {
  if (!secureContext) {
    if (target === 'screen') {
      return 'O compartilhamento de tela exige uma página segura (https:// ou http://localhost).';
    }
    if (target === 'cam') {
      return 'O navegador só libera a câmera em páginas seguras. Abra por https:// ou http://localhost.';
    }
    if (target === 'audio') {
      return 'O navegador só libera o áudio da chamada em páginas seguras (https:// ou http://localhost).';
    }
    return 'O navegador só libera o microfone em páginas seguras. Abra por https:// ou http://localhost.';
  }

  const name = (error as { name?: string } | null)?.name ?? '';

  if (target === 'screen') {
    switch (name) {
      case 'UnsupportedScreenShare':
      case 'NotSupportedError':
      case 'TypeError':
        return 'Não é possível compartilhar a tela neste aparelho ou navegador (o iOS/Safari mobile bloqueia essa função na web).';
      case 'NotAllowedError':
      case 'SecurityError':
        return 'Permissão negada para compartilhar a tela. Libere o compartilhamento nas configurações do navegador.';
      case 'AbortError':
        return 'O compartilhamento de tela foi cancelado.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'Nenhuma tela ou janela disponível para compartilhar.';
      default:
        return 'Não foi possível compartilhar a tela neste dispositivo.';
    }
  }

  if (target === 'cam') {
    switch (name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return 'Acesso à câmera bloqueado. Clique no cadeado ao lado do endereço ou nas permissões do app e libere a câmera.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
      case 'OverconstrainedError':
        return 'Nenhuma câmera encontrada neste aparelho.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'A câmera está em uso por outro aplicativo ou aba.';
      case 'AbortError':
        return 'A ativação da câmera foi cancelada.';
      default:
        return 'Não foi possível ligar a câmera.';
    }
  }

  if (target === 'audio') {
    switch (name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return 'O navegador bloqueou a reprodução de som. Toque novamente para liberar o áudio.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'Nenhuma saída de áudio encontrada neste aparelho.';
      default:
        return 'Não foi possível ativar o áudio da chamada.';
    }
  }

  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Acesso ao microfone bloqueado. Clique no cadeado ao lado do endereço ou nas permissões do app e libere o microfone.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'Nenhum microfone encontrado neste aparelho.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'O microfone está em uso por outro aplicativo ou aba.';
    case 'AbortError':
      return 'A ativação do microfone foi cancelada.';
    default:
      return 'Não foi possível ligar o microfone.';
  }
};
