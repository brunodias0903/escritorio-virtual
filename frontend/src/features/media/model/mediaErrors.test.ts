import { describe, expect, it } from 'vitest';
import { describeMediaError } from './mediaErrors';

const named = (name: string) => Object.assign(new Error('x'), { name });

describe('describeMediaError', () => {
  it('em página insegura, manda abrir por HTTPS ou localhost', () => {
    expect(describeMediaError(named('NotAllowedError'), false)).toContain(
      'https://',
    );
  });

  it('explica cada tipo de erro do navegador separadamente por mídia', () => {
    expect(describeMediaError(named('NotAllowedError'), true, 'mic')).toContain(
      'microfone',
    );
    expect(describeMediaError(named('NotAllowedError'), true, 'cam')).toContain(
      'câmera',
    );
    expect(describeMediaError(named('SecurityError'), true, 'mic')).toContain(
      'cadeado',
    );
    expect(describeMediaError(named('NotFoundError'), true, 'mic')).toContain(
      'Nenhum microfone',
    );
    expect(
      describeMediaError(named('OverconstrainedError'), true, 'cam'),
    ).toContain('Nenhuma câmera');
    expect(
      describeMediaError(named('NotReadableError'), true, 'cam'),
    ).toContain('em uso');
    expect(describeMediaError(named('AbortError'), true, 'screen')).toContain(
      'cancelado',
    );
    expect(
      describeMediaError(named('UnsupportedScreenShare'), true, 'screen'),
    ).toContain('Não é possível compartilhar a tela');
    expect(
      describeMediaError(named('NotAllowedError'), true, 'audio'),
    ).toContain('áudio');
  });

  it('tem uma mensagem para erros desconhecidos e valores estranhos', () => {
    expect(describeMediaError(new Error('?'), true)).toContain(
      'Não foi possível',
    );
    expect(describeMediaError(null, true)).toContain('Não foi possível');
    expect(describeMediaError('texto', true)).toContain('Não foi possível');
  });
});
