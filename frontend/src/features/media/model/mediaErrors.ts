/** Explica em português por que o microfone, a câmera ou a tela não ligaram. */
export const describeMediaError = (
  error: unknown,
  secureContext: boolean,
): string => {
  if (!secureContext) {
    return 'O navegador só libera microfone e câmera em páginas seguras. Abra por https:// ou por http://localhost.';
  }
  const name = (error as { name?: string } | null)?.name ?? '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'O navegador bloqueou o acesso. Clique no cadeado ao lado do endereço e libere microfone e câmera.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'Não encontrei microfone ou câmera neste aparelho.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'O microfone ou a câmera está em uso por outro programa.';
    case 'AbortError':
      return 'A escolha da tela foi cancelada.';
    default:
      return 'Não foi possível ligar o microfone, a câmera ou a tela.';
  }
};
