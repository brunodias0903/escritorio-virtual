/**
 * Paleta Master e motor de compilação de matrizes Pixel Art (Detailed Modern RPG Office).
 *
 * Calibrado a partir das 4 novas referências enviadas pelo usuário:
 * - Menos madeira, mais materiais de escritório moderno: aço escovado, grafite, laca branca/off-white,
 *   concreto/pedra arquitetônica, carpete azul-ardósia, vidro e detalhes em azul-petróleo, sálvia e coral.
 * - Mais riqueza de detalhes estruturais: cantos chanfrados, painéis rebaixados, molduras duplas,
 *   puxadores, botões, ar-condicionado, calendário, quadros, prateleiras e equipamentos detalhados.
 */

export const ART_TILE = 16;
export const MAP_TILE = 32;
export const PIXEL_SCALE = 2;

export const PALETTE = {
  // Contorno Universal e Metais Escuros (Grafite / Chumbo)
  O: '#1e191d', // Contorno externo nítido de 1px
  o: '#28252e', // Contorno interno / junta de pedra
  x: '#2d313b', // Grafite quase preto (esquadrias, bases, telas desligadas)
  A: '#454c5c', // Aço grafite escuro (estruturas de mesa, arquivos, gabinetes)
  a: '#697387', // Aço médio / ardósia
  s: '#96a1b5', // Aço claro / alumínio anodizado
  S: '#c3ccd9', // Prata / borda iluminada de metal

  // Laca Branca / Off-White Corporativo (Balcões, Mesas Modernas, Eletros)
  f: '#f5f7fa', // Branco puro (brilho de laca, papel A4, louça, luz)
  F: '#e1e6ef', // Laca off-white / cinza-gelo (corpo de armários e paredes clean)
  e: '#c5cddb', // Sombra suave de laca branca / rejunte frio

  // Pedra Arquitetônica, Concreto e Pisos Claros (Refs 2, 3 e 4)
  P: '#d9d4cc', // Pedra / concreto arquitetônico claro
  p: '#ebe6df', // Brilho de bloco de pedra
  q: '#bab3a8', // Bloco de pedra médio
  Q: '#968e83', // Junta de pedra / sombra arquitetônica
  h: '#f7e8d0', // Porcelanato marfim / tapete creme claro
  H: '#dfd0b8', // Porcelanato marfim médio (piso ref 2 e 4)
  l: '#bdaea0', // Rejunte greige suave
  9: '#5b4e7a', // Lavanda sombra / café escuro

  // Carpete Comercial Azul-Ardósia (Área de Trabalho Tech)
  C: '#42526b', // Carpete corporativo base
  c: '#536582', // Carpete placa alternada
  k: '#323f54', // Carpete sombra / borda

  // Azul-Petróleo / Teal Corporativo (Cadeira executiva ref 4, sofás, detalhes)
  U: '#58a6b8', // Brilho superior teal
  y: '#397f94', // Corpo principal teal
  J: '#245566', // Sombra profunda teal

  // Verde-Sálvia / Menta (Tapetes decorativos ref 2 e 3, frentes de armário, poltronas)
  G: '#7ca36b', // Verde-sálvia claro
  g: '#59804b', // Verde-sálvia base
  t: '#3d5c33', // Verde-sálvia sombra

  // Folhagem Viva (Plantas detalhadas ref 1, 3 e 4)
  j: '#8cd668', // Brilho folha viva
  L: '#52ab3a', // Massa principal da planta
  T: '#2d6e22', // Sombra interna da folhagem

  // Madeiras (Usadas com parcimônia em tampos ou detalhes executivos — Ref 1 e 4)
  w: '#e8be8e', // Freixo claro — brilho 1px
  W: '#cfa06e', // Freixo claro — tampo
  m: '#ab7b4b', // Freixo médio — borda
  n: '#9c653e', // Nogueira escura (Ref 4) — brilho
  N: '#754728', // Nogueira escura — estrutura executiva
  d: '#522f18', // Nogueira profunda — recuo e painel

  // Acentos Vibrantes (Vermelho Coral, Âmbar/Ouro, Lilás/Lavanda, Vidro)
  R: '#e05a52', // Vermelho coral (cafeteira ref 2, pastas, livros, detalhes)
  b: '#a33631', // Sombra carmim
  Y: '#f7cf59', // Amarelo âmbar / luz quente / latão
  2: '#cc962b', // Laranja / bronze / abajur ref 1 e 4
  v: '#d9f5ff', // Reflexo de vidro / tela
  V: '#8cd8f5', // Vidro celeste / água
  i: '#4fa3c7', // Vidro profundo / monitor ligado
  8: '#8478a6', // Lavanda / lilás estofado (banquetas ref 1)
  9: '#5b4e7a', // Lavanda sombra
};

/**
 * Compila uma definição de sprite em retângulos otimizados (Greedy 2D Meshing).
 */
export const compileSprite = (sprite, scale = PIXEL_SCALE) => {
  const palette = sprite.customColors
    ? { ...PALETTE, ...sprite.customColors }
    : PALETTE;

  const rects = [];

  if (sprite.dropShadow) {
    rects.push({
      x: sprite.dropShadow.x * scale,
      y: sprite.dropShadow.y * scale,
      w: sprite.dropShadow.w * scale,
      h: sprite.dropShadow.h * scale,
      fill: '#141218',
      opacity: sprite.dropShadow.opacity ?? 0.22,
    });
  }

  const height = sprite.rows.length;
  const width = sprite.width;
  const visited = Array.from({ length: height }, () => new Uint8Array(width));

  for (let y = 0; y < height; y++) {
    const row = sprite.rows[y] ?? '';
    for (let x = 0; x < width; x++) {
      if (visited[y][x]) continue;
      const ch = row[x];
      if (!ch || ch === '.' || ch === ' ') {
        visited[y][x] = 1;
        continue;
      }
      const fill = palette[ch];
      if (!fill) {
        throw new Error(
          `Caractere de cor desconhecido "${ch}" no sprite "${sprite.id}" (linha ${y}, coluna ${x}).`,
        );
      }

      let w = 1;
      while (x + w < width && !visited[y][x + w] && row[x + w] === ch) {
        w++;
      }

      let h = 1;
      while (y + h < height) {
        const nextRow = sprite.rows[y + h] ?? '';
        let canExpand = true;
        for (let dx = 0; dx < w; dx++) {
          if (visited[y + h][x + dx] || nextRow[x + dx] !== ch) {
            canExpand = false;
            break;
          }
        }
        if (!canExpand) break;
        h++;
      }

      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          visited[y + dy][x + dx] = 1;
        }
      }

      rects.push({
        x: x * scale,
        y: y * scale,
        w: w * scale,
        h: h * scale,
        fill,
      });
    }
  }

  return rects;
};

/** Valida integridade dimensional e caracteres de um sprite. */
export const validateSprite = (sprite) => {
  if (sprite.rows.length !== sprite.height) {
    throw new Error(
      `Sprite "${sprite.id}": altura declarada (${sprite.height}) difere do número de linhas (${sprite.rows.length}).`,
    );
  }
  const palette = sprite.customColors
    ? { ...PALETTE, ...sprite.customColors }
    : PALETTE;
  sprite.rows.forEach((row, index) => {
    if (row.length !== sprite.width) {
      throw new Error(
        `Sprite "${sprite.id}": linha ${index} tem ${row.length} colunas, esperado ${sprite.width}.`,
      );
    }
    for (const ch of row) {
      if (ch !== '.' && ch !== ' ' && !palette[ch]) {
        throw new Error(
          `Sprite "${sprite.id}": caractere "${ch}" na linha ${index} não existe na paleta.`,
        );
      }
    }
  });
};
