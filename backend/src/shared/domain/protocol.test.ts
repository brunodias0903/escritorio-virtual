import { describe, expect, it } from 'vitest';
import { defaultAppearance } from './appearance.js';
import {
  ChatMessageSchema,
  ClientMessageSchema,
  DEFAULT_NAME,
  NAME_MAX_LENGTH,
  ServerMessageSchema,
  sanitizeName,
} from './protocol.js';

const player = {
  id: 'a',
  name: 'Ana',
  color: 255,
  x: 1,
  y: 2,
  map: 'lobby',
  status: 'available',
  appearance: defaultAppearance('a'),
};

describe('sanitizeName', () => {
  it('remove símbolos e espaços nas pontas', () => {
    expect(sanitizeName('  Ana<script>  ')).toBe('Anascript');
  });

  it('mantém acentos', () => {
    expect(sanitizeName('João')).toBe('João');
  });

  it('mantém o ponto do nickname', () => {
    expect(sanitizeName('bruno.dias')).toBe('bruno.dias');
  });

  it('usa o nome padrão quando sobra vazio', () => {
    expect(sanitizeName('!!!')).toBe(DEFAULT_NAME);
  });

  it('corta no tamanho máximo', () => {
    expect(sanitizeName('a'.repeat(100))).toHaveLength(NAME_MAX_LENGTH);
  });
});

describe('ClientMessageSchema', () => {
  it.each([
    { type: 'join', token: 'abc.def.ghi' },
    { type: 'move', x: 1, y: 2 },
    { type: 'chat', channel: 'geral', text: 'oi' },
    { type: 'chat', channel: 'geral', text: 'resposta', threadId: 'm1' },
    { type: 'status', status: 'busy' },
    { type: 'emote', emote: '👋' },
    { type: 'appearance', appearance: defaultAppearance('x') },
    { type: 'media' },
    { type: 'markRead', channel: 'geral' },
    { type: 'thread', threadId: 'm1' },
  ])('aceita %j', (message) => {
    expect(ClientMessageSchema.safeParse(message).success).toBe(true);
  });

  it.each([
    { type: 'x' },
    { type: 'move', x: 'a', y: 2 },
    { type: 'move', x: Infinity, y: 2 },
    { type: 'status', status: 'offline' },
    { type: 'emote', emote: '💣' },
    {
      type: 'appearance',
      appearance: { skin: 99, hair: 0, style: 0, shirt: 0 },
    },
    { type: 'chat', channel: '', text: 'oi' },
  ])('recusa %j', (message) => {
    expect(ClientMessageSchema.safeParse(message).success).toBe(false);
  });
});

describe('ServerMessageSchema', () => {
  it('aceita init, map e mensagens de presença', () => {
    expect(
      ServerMessageSchema.safeParse({
        type: 'init',
        id: 'a',
        map: 'lobby',
        players: [player],
      }).success,
    ).toBe(true);
    expect(
      ServerMessageSchema.safeParse({
        type: 'map',
        map: 'andar-2',
        x: 1,
        y: 2,
        players: [],
      }).success,
    ).toBe(true);
    expect(
      ServerMessageSchema.safeParse({ type: 'status', id: 'a', status: 'away' })
        .success,
    ).toBe(true);
    expect(
      ServerMessageSchema.safeParse({ type: 'emote', id: 'a', emote: '🎉' })
        .success,
    ).toBe(true);
    expect(
      ServerMessageSchema.safeParse({ type: 'mediaUnavailable' }).success,
    ).toBe(true);
    expect(ServerMessageSchema.safeParse({ type: 'mediaNone' }).success).toBe(
      true,
    );
    expect(
      ServerMessageSchema.safeParse({
        type: 'media',
        zone: 'mesa-1',
        url: 'wss://x',
        token: 't',
      }).success,
    ).toBe(true);
    expect(
      ServerMessageSchema.safeParse({
        type: 'media',
        url: 'wss://x',
        token: 't',
      }).success,
    ).toBe(false);
  });

  it('recusa cor fora do intervalo e mapa desconhecido', () => {
    expect(
      ServerMessageSchema.safeParse({
        type: 'joined',
        player: { ...player, color: -1 },
      }).success,
    ).toBe(false);
    expect(
      ServerMessageSchema.safeParse({
        type: 'joined',
        player: { ...player, map: 'x' },
      }).success,
    ).toBe(false);
  });
});

describe('ChatMessageSchema', () => {
  it('preenche menções e respostas quando faltam', () => {
    const parsed = ChatMessageSchema.parse({
      id: 'm',
      channel: 'geral',
      authorId: 'a@x.com',
      author: 'Ana',
      color: 1,
      text: 'oi',
      at: 1,
    });
    expect(parsed.mentions).toEqual([]);
    expect(parsed.replyCount).toBe(0);
  });
});
