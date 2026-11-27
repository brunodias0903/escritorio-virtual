const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export const isHexColor = (value: string): boolean => HEX_RE.test(value);

const parseRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const relativeLuminance = (hex: string): number => {
  if (!HEX_RE.test(hex)) return 0;
  const [r, g, b] = parseRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Calcula a razão de contraste WCAG (1 a 21) entre duas cores `#rrggbb`. */
export const contrastRatio = (hexA: string, hexB: string): number => {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

/** Clareia (`amount > 0`) ou escurece (`amount < 0`) uma cor hex `#rrggbb`. */
export const adjustHex = (hex: string, amount: number): string => {
  if (!HEX_RE.test(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) =>
    Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) + 255 * amount)));
  return `#${[16, 8, 0].map((s) => channel(s).toString(16).padStart(2, '0')).join('')}`;
};

/**
 * Ajusta gradualmente `fgHex` (clareando ou escurecendo) até atingir a razão de
 * contraste mínima desejada contra `bgHex`.
 */
export const ensureContrast = (
  fgHex: string,
  bgHex: string,
  minRatio = 4.5,
): string => {
  if (!HEX_RE.test(fgHex) || !HEX_RE.test(bgHex)) return fgHex;
  if (contrastRatio(fgHex, bgHex) >= minRatio) return fgHex;

  const bgLum = relativeLuminance(bgHex);
  const step = bgLum > 0.5 ? -0.04 : 0.04;
  let current = fgHex;
  for (let i = 0; i < 25; i++) {
    current = adjustHex(current, step);
    if (contrastRatio(current, bgHex) >= minRatio) return current;
  }
  return current;
};

/** Converte `#rrggbb` + opacidade em `rgba(r, g, b, a)`. */
export const hexToRgba = (hex: string, alpha: number): string => {
  if (!HEX_RE.test(hex)) return `rgba(18, 22, 58, ${alpha})`;
  const [r, g, b] = parseRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
