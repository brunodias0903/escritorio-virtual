import type { ServerMessage } from '@/shared/domain';
import { describe, expect, it, vi } from 'vitest';
import {
  connectOffice,
  type SocketLike,
  type SocketStatus,
} from './officeSocket';

const fakeSocket = () => {
  const socket: SocketLike & { sent: string[]; closed: boolean } = {
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null,
    sent: [],
    closed: false,
    send(data) {
      this.sent.push(data);
    },
    close() {
      this.closed = true;
    },
  };
  return socket;
};

const setup = () => {
  const socket = fakeSocket();
  const messages: ServerMessage[] = [];
  const statuses: SocketStatus[] = [];
  const office = connectOffice({
    url: 'ws://x',
    token: 'tok',
    onMessage: (m) => messages.push(m),
    onStatus: (s) => statuses.push(s),
    createSocket: () => socket,
  });
  return { socket, messages, statuses, office };
};

describe('connectOffice', () => {
  it('envia join com a sessão ao abrir', () => {
    const { socket, statuses } = setup();
    socket.onopen?.();
    expect(statuses).toEqual(['connecting', 'open']);
    expect(JSON.parse(socket.sent[0]!)).toEqual({ type: 'join', token: 'tok' });
  });

  it('só envia pedidos depois de abrir e para de enviar ao fechar', () => {
    const { socket, office } = setup();
    office.send({ type: 'move', x: 1, y: 2 });
    expect(socket.sent).toHaveLength(0);
    socket.onopen?.();
    office.send({ type: 'move', x: 1, y: 2 });
    expect(JSON.parse(socket.sent[1]!)).toEqual({ type: 'move', x: 1, y: 2 });
    office.send({ type: 'chat', channel: 'geral', text: 'oi' });
    expect(JSON.parse(socket.sent[2]!)).toEqual({
      type: 'chat',
      channel: 'geral',
      text: 'oi',
    });
    socket.onclose?.();
    office.send({ type: 'move', x: 3, y: 4 });
    expect(socket.sent).toHaveLength(3);
  });

  it('entrega apenas mensagens válidas do servidor', () => {
    const { socket, messages } = setup();
    socket.onmessage?.({ data: JSON.stringify({ type: 'left', id: 'b' }) });
    socket.onmessage?.({ data: JSON.stringify({ type: 'nada' }) });
    socket.onmessage?.({ data: 'não é json' });
    socket.onmessage?.({ data: 123 });
    expect(messages).toEqual([{ type: 'left', id: 'b' }]);
  });

  it('marca como fechado em erro e fecha o socket', () => {
    const { socket, statuses, office } = setup();
    socket.onerror?.();
    expect(statuses.at(-1)).toBe('closed');
    office.close();
    expect(socket.closed).toBe(true);
  });

  it('usa WebSocket global por padrão', () => {
    const instances: string[] = [];
    vi.stubGlobal(
      'WebSocket',
      class {
        constructor(url: string) {
          instances.push(url);
        }
      },
    );
    connectOffice({
      url: 'ws://y',
      token: 'tok',
      onMessage: () => {},
      onStatus: () => {},
    });
    expect(instances).toEqual(['ws://y']);
    vi.unstubAllGlobals();
  });
});
