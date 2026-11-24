const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export const isHexColor = (value: string): boolean => HEX_RE.test(value);

/** Clareia (`amount > 0`) ou escurece (`amount < 0`) uma cor hex `#rrggbb`. */
export const adjustHex = (hex: string, amount: number): string => {
  if (!HEX_RE.test(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) =>
    Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) + 255 * amount)));
  return `#${[16, 8, 0].map((s) => channel(s).toString(16).padStart(2, '0')).join('')}`;
};

/** Converte `#rrggbb` + opacidade em `rgba(r, g, b, a)`. */
export const hexToRgba = (hex: string, alpha: number): string => {
  if (!HEX_RE.test(hex)) return `rgba(18, 22, 58, ${alpha})`;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
