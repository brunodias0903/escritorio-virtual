import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Redis } from 'ioredis';
import pg from 'pg';
import type { AppConfig } from '../config/env.js';
import { loadMigrations, runMigrations } from '../infra/database/migrate.js';
import {
  MemoryChannelRepository,
  MemoryChatRepository,
  MemoryDeskRepository,
  MemoryEmailCodeRepository,
  MemoryLocalAccountRepository,
  MemoryProfileRepository,
  MemoryRateLimiter,
  MemoryReadStateRepository,
  MemoryRevocations,
} from '../infra/persistence/memory/index.js';
import {
  PgChannelRepository,
  PgChatRepository,
  PgDeskRepository,
  PgEmailCodeRepository,
  PgLocalAccountRepository,
  PgProfileRepository,
  PgReadStateRepository,
} from '../infra/persistence/postgres/index.js';
import {
  MemoryBus,
  MemoryPresence,
  RedisBus,
  RedisPresence,
  RedisRateLimiter,
  RedisRevocations,
} from '../infra/redis/index.js';
import type {
  EmailCodeRepository,
  LocalAccountRepository,
  RateLimit,
  Revocations,
} from '../modules/auth/auth.repository.js';
import { AuthService } from '../modules/auth/auth.service.js';
import { CodeService } from '../modules/auth/codes.service.js';
import { ConsoleMailer, SmtpMailer } from '../modules/auth/mailer.js';
import type {
  ChannelRepository,
  ChatRepository,
  ReadStateRepository,
} from '../modules/chat/chat.repository.js';
import { ChatService } from '../modules/chat/chat.service.js';
import type { DeskRepository } from '../modules/desks/desks.repository.js';
import { DeskService } from '../modules/desks/desks.service.js';
import { MediaService } from '../modules/media/media.service.js';
import { OfficeService } from '../modules/office/office.service.js';
import type { ProfileRepository } from '../modules/office/profile.repository.js';
import type { Bus, Presence } from '../modules/realtime/cluster.ports.js';
import { Cluster } from '../modules/realtime/cluster.js';
import { WsGateway } from '../transport/ws/gateway.js';

const MIGRATIONS_DIR = fileURLToPath(
  new URL('../../migrations', import.meta.url),
);

const LOGIN_RATE_LIMIT = 10;
const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;

export type AppContainer = {
  instanceId: string;
  config: AppConfig;
  auth: AuthService;
  chat: ChatService;
  desks: DeskService;
  media: MediaService;
  office: OfficeService;
  cluster: Cluster;
  wsGateway: WsGateway;
  close: () => Promise<void>;
};

const connectRedis = (url: string): Redis =>
  new Redis(url, { maxRetriesPerRequest: 3 });

/**
 * Composition Root: inicializa banco/migrações (ou memória), Redis/Valkey (ou
 * memória), instancia os serviços de domínio e prepara o cluster.
 */
export const createContainer = async (
  config: AppConfig,
): Promise<AppContainer> => {
  const closers: Array<() => Promise<unknown>> = [];

  let channels: ChannelRepository = new MemoryChannelRepository();
  let chatRepo: ChatRepository = new MemoryChatRepository();
  let reads: ReadStateRepository = new MemoryReadStateRepository();
  let profiles: ProfileRepository = new MemoryProfileRepository();
  let deskRepo: DeskRepository = new MemoryDeskRepository();
  let accounts: LocalAccountRepository = new MemoryLocalAccountRepository();
  let emailCodes: EmailCodeRepository = new MemoryEmailCodeRepository();

  if (config.databaseUrl) {
    const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 });
    closers.push(() => pool.end());

    // Migração com uma conexão só: transação e advisory lock dependem disso.
    const client = await pool.connect();
    try {
      const applied = await runMigrations(
        client,
        loadMigrations(MIGRATIONS_DIR),
      );
      if (applied.length > 0) {
        console.log(`[banco] migrações aplicadas: ${applied.join(', ')}`);
      }
    } finally {
      client.release();
    }

    channels = new PgChannelRepository(pool);
    chatRepo = new PgChatRepository(pool);
    reads = new PgReadStateRepository(pool);
    profiles = new PgProfileRepository(pool);
    deskRepo = new PgDeskRepository(pool);
    accounts = new PgLocalAccountRepository(pool);
    emailCodes = new PgEmailCodeRepository(pool);
  }

  let loginLimiter: RateLimit = new MemoryRateLimiter(
    LOGIN_RATE_LIMIT,
    LOGIN_RATE_WINDOW_MS,
  );
  let revocations: Revocations = new MemoryRevocations();
  let bus: Bus = new MemoryBus();
  let presence: Presence = new MemoryPresence();

  if (config.redisUrl) {
    const commands = connectRedis(config.redisUrl);
    const publisher = connectRedis(config.redisUrl);
    const subscriber = connectRedis(config.redisUrl);
    for (const connection of [commands, publisher, subscriber]) {
      connection.on('error', (error) =>
        console.error('[redis]', error.message),
      );
    }
    loginLimiter = new RedisRateLimiter(
      commands,
      'virtual-office:rl:login:',
      LOGIN_RATE_LIMIT,
      LOGIN_RATE_WINDOW_MS,
    );
    revocations = new RedisRevocations(commands);
    bus = new RedisBus(publisher, subscriber);
    presence = new RedisPresence(commands);
    closers.push(async () => commands.quit());
  }

  const instanceId = randomUUID();

  const auth = new AuthService({
    accounts,
    secret: config.sessionSecret,
    adminEmails: config.adminEmails,
    access: config.access,
    loginLimiter,
    revocations,
    codes: config.emailCodes
      ? new CodeService({
          codes: emailCodes,
          mailer: config.smtp
            ? new SmtpMailer(config.smtp)
            : new ConsoleMailer(),
          secret: config.sessionSecret,
        })
      : null,
  });

  const chat = new ChatService({
    channels,
    chat: chatRepo,
    reads,
    profiles,
  });
  const desks = new DeskService(deskRepo);
  const media = new MediaService(config.media);
  const office = new OfficeService();

  const wsGateway = new WsGateway({
    office,
    auth,
    chat,
    desks,
    media,
    profiles,
    accounts,
    allowedOrigins: config.allowedOrigins,
  });

  const cluster = new Cluster({
    origin: instanceId,
    bus,
    presence,
    deliver: wsGateway.deliverLocal,
    onRemote: (message) => office.applyRemote(message),
  });

  await cluster.start();
  office.replaceRemote(await cluster.remotePlayers());
  office.syncDesks(await desks.list());

  return {
    instanceId,
    config,
    auth,
    chat,
    desks,
    media,
    office,
    cluster,
    wsGateway,
    close: async () => {
      await cluster.close();
      await Promise.allSettled(closers.map((close) => close()));
    },
  };
};
