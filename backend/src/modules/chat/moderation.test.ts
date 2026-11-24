import { describe, expect, it } from 'vitest';
import { ChatModerator, moderateText } from './moderation.js';

describe('chat moderation', () => {
  it('censura palavrões e abreviações preservando o restante da frase', () => {
    const res = moderateText('Que porra é essa, fdp?');
    expect(res.censored).toBe(true);
    expect(res.severeHate).toBe(false);
    expect(res.text).toBe('Que *** é essa, ***');
  });

  it('detecta e bloqueia discurso de ódio mesmo com acentos ou leetspeak', () => {
    const res = moderateText('seu ret4rdado');
    expect(res.severeHate).toBe(true);
  });

  it('mantém mensagens normais intactas', () => {
    const res = moderateText('Bom dia equipe! Vamos para a daily às 10h.');
    expect(res).toEqual({
      text: 'Bom dia equipe! Vamos para a daily às 10h.',
      censored: false,
      severeHate: false,
    });
  });

  it('aplica aviso progressivo e restringe chat no 3º abuso verbal', () => {
    const mod = new ChatModerator();
    const t = 1_000_000;
    const first = mod.evaluate('u@x.com', 'que merda', t);
    expect(first).toEqual({
      allowed: true,
      text: 'que ***',
      warning: 'verbal_abuse_warning',
    });

    const second = mod.evaluate('u@x.com', 'pqp de novo', t + 1000);
    expect(second).toEqual({
      allowed: true,
      text: '*** de novo',
      warning: 'verbal_abuse_warning',
    });

    const third = mod.evaluate('u@x.com', 'vai se foder', t + 2000);
    expect(third).toEqual({ allowed: false, code: 'chat_muted' });

    // Continua restrito mesmo com mensagem normal dentro da janela de 5 min
    const muted = mod.evaluate('u@x.com', 'desculpa', t + 5000);
    expect(muted).toEqual({ allowed: false, code: 'chat_muted' });
  });

  it('bloqueia spam por rajada, duplicação, flood de caracteres e excesso de links', () => {
    const mod = new ChatModerator();
    const t = 2_000_000;
    // Flood de caracteres
    expect(mod.evaluate('a@x.com', 'a'.repeat(25), t)).toEqual({
      allowed: false,
      code: 'spam_blocked',
    });
    // Excesso de links
    expect(
      mod.evaluate(
        'b@x.com',
        'https://a.com https://b.com https://c.com https://d.com',
        t,
      ),
    ).toEqual({ allowed: false, code: 'spam_blocked' });
    // Repetição 3x
    expect(mod.evaluate('c@x.com', 'oi pessoal', t).allowed).toBe(true);
    expect(mod.evaluate('c@x.com', 'oi pessoal', t + 500).allowed).toBe(true);
    expect(mod.evaluate('c@x.com', 'oi pessoal', t + 1000)).toEqual({
      allowed: false,
      code: 'spam_blocked',
    });
    // Cooldown ativo após spam
    expect(mod.evaluate('c@x.com', 'outra msg', t + 2000)).toEqual({
      allowed: false,
      code: 'spam_blocked',
    });

    // Rajada (6 mensagens diferentes em < 10s)
    for (let i = 0; i < 5; i++) {
      expect(mod.evaluate('d@x.com', `msg ${i}`, t + i * 500).allowed).toBe(
        true,
      );
    }
    expect(mod.evaluate('d@x.com', 'msg 5', t + 3000)).toEqual({
      allowed: false,
      code: 'spam_blocked',
    });

    // Discurso de ódio bloqueado imediatamente e silencia no 3º strike
    expect(mod.evaluate('e@x.com', 'seu nazista', t)).toEqual({
      allowed: false,
      code: 'hate_speech_blocked',
    });
    expect(mod.evaluate('e@x.com', 'seu nazista', t + 1000)).toEqual({
      allowed: false,
      code: 'hate_speech_blocked',
    });
    expect(mod.evaluate('e@x.com', 'seu nazista', t + 2000)).toEqual({
      allowed: false,
      code: 'chat_muted',
    });

    // Expressão composta censurada
    const comp = moderateText('esse filho da puta');
    expect(comp.censored).toBe(true);
  });
});
