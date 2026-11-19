import { describe, expect, it } from 'vitest';
import { formatTime } from './formatTime';

describe('formatTime', () => {
  it('formata a hora local com dois dígitos', () => {
    expect(formatTime(new Date(2026, 0, 1, 9, 5).getTime())).toBe('09:05');
    expect(formatTime(new Date(2026, 0, 1, 18, 30).getTime())).toBe('18:30');
  });
});
