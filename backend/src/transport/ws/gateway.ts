import { randomUUID } from 'node:crypto';
import type { Server as HttpServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { isOriginAllowed } from '../../config/origin.js';
import type { LocalAccountRepository } from '../../modules/auth/auth.repository.js';
import type { AuthService } from '../../modules/auth/auth.service.js';
import type { ChatService } from '../../modules/chat/chat.service.js';
import type { DeskService } from '../../modules/desks/desks.service.js';
import type { MediaService } from '../../modules/media/media.service.js';
import type {
  OfficeService,
  Outgoing,
} from '../../modules/office/office.service.js';
import type { ProfileRepository } from '../../modules/office/profile.repository.js';
import type { Cluster } from '../../modules/realtime/cluster.js';
import { Connection } from '../../modules/realtime/connection.js';
import type { ServerMessage } from '../../shared/domain/index.js';

const MAX_WS_PAYLOAD_BYTES = 4096;
const JOIN_TIMEOUT_MS = 5_000;

export type WsGatewayDeps = {
  office: OfficeService;
  auth: AuthService;
  chat: ChatService;
  desks: DeskService;
  media: MediaService;
  profiles: ProfileRepository;
  accounts: LocalAccountRepository;
  allowedOrigins: readonly string[];
  onError?: (error: unknown) => void;
};

const send = (socket: WebSocket, message: ServerMessage): void => {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
};

/**
 * Camada de transporte WebSocket: gerencia os sockets ativos desta instância,
 * entrega mensagens filtradas por sala/e-mail e delega eventos à `Connection`.
 */
export class WsGateway {
  private readonly sockets = new Map<string, WebSocket>();
  private readonly deps: WsGatewayDeps;
  private readonly onError: (error: unknown) => void;
  private wss: WebSocketServer | null = null;

  constructor(deps: WsGatewayDeps) {
    this.deps = deps;
    this.onError = deps.onError ?? ((error) => console.error('[erro]', error));
  }

  /** Entrega aos sockets desta instância que devem receber a mensagem. */
  deliverLocal = (sender: string, outgoing: Outgoing): void => {
    const { office } = this.deps;
    for (const [id, socket] of this.sockets) {
      if (outgoing.to === 'self' && id !== sender) continue;
      if (outgoing.to === 'others' && id === sender) continue;
      if (outgoing.map && office.players.get(id)?.map !== outgoing.map) {
        continue;
      }
      if (outgoing.emails) {
        const email = office.emailOf(id);
        if (!email || !outgoing.emails.includes(email)) continue;
      }
      send(socket, outgoing.message);
    }
  };

  /** Liga o servidor WebSocket ao servidor HTTP e ao cluster. */
  attach(server: HttpServer, cluster: Cluster): void {
    const wss = new WebSocketServer({
      server,
      maxPayload: MAX_WS_PAYLOAD_BYTES,
      verifyClient: ({ origin }: { origin: string }) =>
        isOriginAllowed(origin, this.deps.allowedOrigins),
    });

    wss.on('connection', (socket) => {
      const id = randomUUID();
      const connection = new Connection({
        id,
        office: this.deps.office,
        cluster,
        auth: this.deps.auth,
        chat: this.deps.chat,
        desks: this.deps.desks,
        media: this.deps.media,
        profiles: this.deps.profiles,
        accounts: this.deps.accounts,
        send: (message) => send(socket, message),
        close: (code, reason) => socket.close(code, reason),
        attach: () => this.sockets.set(id, socket),
        detach: () => this.sockets.delete(id),
      });

      // Quem não se identifica logo é desconectado.
      const timer = setTimeout(() => {
        if (!connection.started) socket.close(4401, 'join_timeout');
      }, JOIN_TIMEOUT_MS);

      socket.on('message', (raw) => {
        let data: unknown;
        try {
          data = JSON.parse(raw.toString());
        } catch {
          return;
        }
        connection.handle(data).catch(this.onError);
      });

      socket.on('close', () => {
        clearTimeout(timer);
        connection.dispose().catch(this.onError);
      });
    });

    this.wss = wss;
  }

  /** Encerra novas conexões e fecha os sockets abertos com código 1001. */
  close(): void {
    this.wss?.close();
    for (const socket of this.sockets.values()) {
      socket.close(1001, 'server_shutdown');
    }
  }
}
