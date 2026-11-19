import { describe, expect, it } from 'vitest';
import { toHexColor } from './color';

describe('toHexColor', () => {
  it('converte números RGB em hexadecimal com seis dígitos', () => {
    expect(toHexColor(0x000000)).toBe('#000000');
    expect(toHexColor(0x00ff0a)).toBe('#00ff0a');
    expect(toHexColor(0x5b6cff)).toBe('#5b6cff');
    expect(toHexColor(0xffffff)).toBe('#ffffff');
  });
});
