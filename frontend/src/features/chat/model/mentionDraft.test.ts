import { describe, expect, it } from 'vitest';

import { applyMention, mentionQuery } from './mentionDraft';

describe('mentionQuery', () => {
  it('acha o @ que está sendo digitado no fim', () => {
    expect(mentionQuery('@')).toBe('');
    expect(mentionQuery('oi @bru')).toBe('bru');
    expect(mentionQuery('(@ana')).toBe('ana');
  });

  it('sem @ no fim, ou @ no meio de uma palavra: não é menção', () => {
    expect(mentionQuery('oi')).toBeNull();
    expect(mentionQuery('oi @bruno ')).toBeNull();
    expect(mentionQuery('a@b')).toBeNull();
  });
});

describe('applyMention', () => {
  it('completa com o início do e-mail e um espaço', () => {
    expect(applyMention('oi @bru', 'bruno.dias@empresa.com')).toBe(
      'oi @bruno.dias ',
    );
    expect(applyMention('@', 'ana@parceiro.com')).toBe('@ana ');
  });
});
