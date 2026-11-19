import { describe, expect, it } from 'vitest';
import {
  AppearanceSchema,
  EmoteSchema,
  StatusSchema,
  defaultAppearance,
} from './appearance';

describe('defaultAppearance', () => {
  it('é estável para a mesma pessoa e válida', () => {
    const a = defaultAppearance('ana@empresa.com');
    expect(defaultAppearance('ana@empresa.com')).toEqual(a);
    expect(AppearanceSchema.safeParse(a).success).toBe(true);
  });

  it('varia entre pessoas', () => {
    const seeds = Array.from({ length: 30 }, (_, i) => `pessoa${i}@x.com`);
    const unique = new Set(
      seeds.map((s) => JSON.stringify(defaultAppearance(s))),
    );
    expect(unique.size).toBeGreaterThan(20);
  });
});

describe('schemas', () => {
  it('recusa índices fora da paleta', () => {
    expect(
      AppearanceSchema.safeParse({ skin: 9, hair: 0, style: 0, shirt: 0 })
        .success,
    ).toBe(false);
    expect(
      AppearanceSchema.safeParse({ skin: 0, hair: 0, style: 0, shirt: 1.5 })
        .success,
    ).toBe(false);
  });

  it('aceita só status e emotes conhecidos', () => {
    expect(StatusSchema.safeParse('busy').success).toBe(true);
    expect(StatusSchema.safeParse('offline').success).toBe(false);
    expect(EmoteSchema.safeParse('👋').success).toBe(true);
    expect(EmoteSchema.safeParse('💣').success).toBe(false);
  });
});
