import { describe, expect, it } from 'vitest';
import { splitMentions } from './mentions';

describe('splitMentions', () => {
  it('devolve o texto inteiro quando não há menção', () => {
    expect(splitMentions('bom dia')).toEqual([
      { text: 'bom dia', mention: false },
    ]);
    expect(splitMentions('')).toEqual([]);
  });

  it('destaca as menções no meio e nas pontas', () => {
    expect(splitMentions('@ana olha isso com @bruno.dias, ok?')).toEqual([
      { text: '@ana', mention: true },
      { text: ' olha isso com ', mention: false },
      { text: '@bruno.dias', mention: true },
      { text: ', ok?', mention: false },
    ]);
  });

  it('não trata e-mail como menção', () => {
    expect(splitMentions('fale com ana@x.com')).toEqual([
      { text: 'fale com ana@x.com', mention: false },
    ]);
  });
});
