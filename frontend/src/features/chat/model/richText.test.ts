import { describe, expect, it } from 'vitest';

import { parseMessageParts } from './richText';

describe('parseMessageParts', () => {
  it('detecta links http/https sem engolir pontuação final e preserva @menções', () => {
    const parts = parseMessageParts(
      'Oi @bruno, veja https://exemplo.com/docs?a=1.',
    );
    expect(parts).toEqual([
      { kind: 'text', text: 'Oi ' },
      { kind: 'mention', text: '@bruno' },
      { kind: 'text', text: ', veja ' },
      {
        kind: 'link',
        text: 'https://exemplo.com/docs?a=1',
        href: 'https://exemplo.com/docs?a=1',
      },
      { kind: 'text', text: '.' },
    ]);
  });

  it('retorna texto puro quando não há menção nem link', () => {
    expect(parseMessageParts('Bom dia pessoal')).toEqual([
      { kind: 'text', text: 'Bom dia pessoal' },
    ]);
  });
});
