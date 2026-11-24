import { describe, expect, it } from 'vitest';

import { en } from './en';
import { es } from './es';
import { translate } from './index';
import { ptBR } from './pt-BR';

describe('i18n', () => {
  it('mantém 100% de paridade de chaves entre pt-BR, en e es', () => {
    const ptKeys = Object.keys(ptBR).sort();
    expect(Object.keys(en).sort()).toEqual(ptKeys);
    expect(Object.keys(es).sort()).toEqual(ptKeys);
  });

  it('interpola parâmetros corretamente em todos os idiomas', () => {
    expect(translate('pt-BR', 'sidebar.online', { count: 4 })).toBe('4 online');
    expect(translate('en', 'sidebar.online', { count: 4 })).toBe('4 online');
    expect(translate('es', 'sidebar.online', { count: 4 })).toBe('4 en línea');
  });
});
