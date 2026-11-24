import { PROFILE_PHOTO_MAX_LENGTH } from '@/shared/domain';

const TARGET_SIZE = 128;
const MAX_INPUT_BYTES = 8 * 1024 * 1024;

/**
 * Recorta a imagem escolhida em quadrado central (128x128) e comprime para data URL
 * pequena o suficiente para sincronizar em tempo real via WebSocket.
 */
export async function compressProfilePhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Escolha um arquivo de imagem (PNG, JPG ou WebP).');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('A imagem é muito grande. Escolha uma foto de até 8 MB.');
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Não foi possível ler essa imagem.'));
      el.src = url;
    });

    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (side <= 0) {
      throw new Error('Imagem inválida.');
    }
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Navegador sem suporte a processamento de imagem.');
    }

    ctx.drawImage(img, sx, sy, side, side, 0, 0, TARGET_SIZE, TARGET_SIZE);

    const attempts: Array<[string, number]> = [
      ['image/webp', 0.82],
      ['image/jpeg', 0.8],
      ['image/jpeg', 0.6],
    ];
    for (const [mime, quality] of attempts) {
      const dataUrl = canvas.toDataURL(mime, quality);
      if (
        dataUrl.startsWith(`data:${mime};base64,`) &&
        dataUrl.length <= PROFILE_PHOTO_MAX_LENGTH
      ) {
        return dataUrl;
      }
    }

    throw new Error('Não foi possível comprimir a imagem. Tente outra foto.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
