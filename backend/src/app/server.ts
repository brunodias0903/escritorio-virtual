import { createServer } from 'node:http';
import { flushPresence } from '../modules/realtime/cluster.js';
import { createHttpHandler } from '../transport/http/handler.js';
import type { AppContainer } from './container.js';

const PRESENCE_FLUSH_MS = 1_000;
const PRESENCE_HEARTBEAT_MS = 20_000;
const REMOTE_REFRESH_MS = 10_000;
const SHUTDOWN_FORCE_MS = 5_000;

export type RunningServer = {
  shutdown: (signal: string) => Promise<void>;
};

/** Sobe o servidor HTTP + WebSocket, liga os timers de presença e prepara o encerramento limpo. */
export const startServer = (container: AppContainer): RunningServer => {
  const { config, auth, media, office, cluster, wsGateway, instanceId } =
    container;
  const logError = (error: unknown) => console.error('[erro]', error);

  const httpServer = createServer(
    createHttpHandler({
      auth,
      allowedOrigins: config.allowedOrigins,
      trustProxy: config.trustProxy,
      onError: logError,
    }),
  );
  httpServer.requestTimeout = 30_000;
  httpServer.headersTimeout = 15_000;
  httpServer.keepAliveTimeout = 65_000;

  wsGateway.attach(httpServer, cluster);

  const lastSaved = new Map<string, string>();
  const timers = [
    setInterval(() => {
      flushPresence(cluster, office.players.values(), lastSaved).catch(
        logError,
      );
    }, PRESENCE_FLUSH_MS),
    setInterval(() => {
      cluster.heartbeat().catch(logError);
    }, PRESENCE_HEARTBEAT_MS),
    // O Valkey é a fonte da verdade de quem está online: corrige fantasmas.
    setInterval(() => {
      cluster
        .remotePlayers()
        .then((players) => office.replaceRemote(players))
        .catch(logError);
    }, REMOTE_REFRESH_MS),
  ];

  let closing = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (closing) return;
    closing = true;
    console.log(`[servidor] ${signal}: encerrando`);
    for (const timer of timers) clearInterval(timer);
    wsGateway.close();
    await Promise.allSettled(
      [...office.players.keys()].map((id) => cluster.playerLeft(id)),
    );
    await container.close();
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), SHUTDOWN_FORCE_MS).unref();
  };

  httpServer.listen(config.port, config.host, () => {
    console.log(
      `Servidor em http://${config.host}:${config.port} (instância ${instanceId.slice(0, 8)}, ` +
        `banco: ${config.databaseUrl ? 'Postgres' : 'memória'}, ` +
        `redis: ${config.redisUrl ? 'sim' : 'não'}, ` +
        `códigos por e-mail: ${config.emailCodes ? 'sim' : 'não'}, ` +
        `chamadas: ${media.enabled ? 'sim' : 'não'})`,
    );
  });

  return { shutdown };
};
