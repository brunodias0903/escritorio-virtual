import { describe, expect, it } from 'vitest';
import { describeMediaError } from './mediaErrors';

const named = (name: string) => Object.assign(new Error('x'), { name });

describe('describeMediaError', () => {
  it('em página insegura, manda abrir por HTTPS ou localhost', () => {
    expect(describeMediaError(named('NotAllowedError'), false)).toContain(
      'https://',
    );
  });

  it('explica cada tipo de erro do navegador', () => {
    expect(describeMediaError(named('NotAllowedError'), true)).toContain(
      'cadeado',
    );
    expect(describeMediaError(named('SecurityError'), true)).toContain(
      'cadeado',
    );
    expect(describeMediaError(named('NotFoundError'), true)).toContain(
      'Não encontrei',
    );
    expect(describeMediaError(named('OverconstrainedError'), true)).toContain(
      'Não encontrei',
    );
    expect(describeMediaError(named('NotReadableError'), true)).toContain(
      'em uso',
    );
    expect(describeMediaError(named('AbortError'), true)).toContain(
      'cancelada',
    );
  });

  it('tem uma mensagem para erros desconhecidos e valores estranhos', () => {
    expect(describeMediaError(new Error('?'), true)).toContain(
      'Não foi possível',
    );
    expect(describeMediaError(null, true)).toContain('Não foi possível');
    expect(describeMediaError('texto', true)).toContain('Não foi possível');
  });
});
