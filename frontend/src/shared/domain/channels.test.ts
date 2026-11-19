import { describe, expect, it } from 'vitest';
import {
  dmChannelId,
  dmMembers,
  emailHandle,
  extractMentionHandles,
  isDmChannel,
} from './channels';

describe('conversa direta', () => {
  it('gera o mesmo id nas duas direções, sem diferenciar maiúsculas', () => {
    expect(dmChannelId('Ana@x.com', 'bia@x.com')).toBe(
      dmChannelId('bia@x.com', 'ana@X.com'),
    );
  });

  it('reconhece e separa as duas pessoas', () => {
    const id = dmChannelId('b@x.com', 'a@x.com');
    expect(isDmChannel(id)).toBe(true);
    expect(dmMembers(id)).toEqual(['a@x.com', 'b@x.com']);
    expect(isDmChannel('geral')).toBe(false);
    expect(dmMembers('geral')).toBeNull();
    expect(dmMembers('dm:so-um')).toBeNull();
  });
});

describe('menções', () => {
  it('usa o início do e-mail como nome de menção', () => {
    expect(emailHandle('Bruno.Dias@empresa.com')).toBe('bruno.dias');
  });

  it('acha menções, sem repetir e sem pegar e-mails', () => {
    expect(
      extractMentionHandles(
        'oi @Bruno.Dias e @ana, veja @ana! fale com a@x.com',
      ),
    ).toEqual(['bruno.dias', 'ana']);
    expect(extractMentionHandles('sem menção aqui')).toEqual([]);
    expect(extractMentionHandles('(@maria)')).toEqual(['maria']);
  });
});
