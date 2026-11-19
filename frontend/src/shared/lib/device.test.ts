import { describe, expect, it } from 'vitest';
import { shouldShowJoystick } from './device';

describe('shouldShowJoystick', () => {
  it('esconde com mouse (ponteiro fino)', () => {
    expect(shouldShowJoystick({ coarsePointer: false })).toBe(false);
  });

  it('mostra com toque (celular ou tablet no navegador)', () => {
    expect(shouldShowJoystick({ coarsePointer: true })).toBe(true);
  });
});
