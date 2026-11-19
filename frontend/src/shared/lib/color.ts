/** Converte uma cor numérica (0xRRGGBB) para hexadecimal (#rrggbb). */
export const toHexColor = (color: number): string =>
  `#${color.toString(16).padStart(6, '0')}`;
