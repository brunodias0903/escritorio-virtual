import {
  ServerMessageSchema,
  type ClientMessage,
  type ServerMessage,
} from '@/shared/domain';

export type SocketStatus = 'connecting' | 'open' | 'closed';

/** O mínimo de WebSocket que usamos (facilita injeção nos testes). */
export type SocketLike = {
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  send: (data: string) => void;
  close: () => void;
};

export type OfficeSocket = {
  /** Envia um pedido ao servidor. Só segue depois que a conexão abriu. */
  send: (message: Exclude<ClientMessage, { type: 'join' }>) => void;
  close: () => void;
};

type Options = {
  url: string;
  /** Token de sessão (JWT) devolvido pelo login. */
  token: string;
  /** Servidor ativo cujo escritório esta conexão deve escopar. */
  serverId?: string;
  onMessage: (message: ServerMessage) => void;
  onStatus: (status: SocketStatus) => void;
  createSocket?: (url: string) => SocketLike;
};

const defaultCreateSocket = (url: string): SocketLike =>
  new WebSocket(url) as unknown as SocketLike;

export const connectOffice = ({
  url,
  token,
  serverId = 'default',
  onMessage,
  onStatus,
  createSocket = defaultCreateSocket,
}: Options): OfficeSocket => {
  const socket = createSocket(url);
  let open = false;
  onStatus('connecting');

  const send = (message: ClientMessage) => {
    if (open) socket.send(JSON.stringify(message));
  };

  socket.onopen = () => {
    open = true;
    onStatus('open');
    send({ type: 'join', token, serverId });
  };

  socket.onclose = () => {
    open = false;
    onStatus('closed');
  };

  socket.onerror = () => {
    open = false;
    onStatus('closed');
  };

  socket.onmessage = (event) => {
    if (typeof event.data !== 'string') return;
    let data: unknown;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }
    const parsed = ServerMessageSchema.safeParse(data);
    if (parsed.success) onMessage(parsed.data);
  };

  return { send, close: () => socket.close() };
};
