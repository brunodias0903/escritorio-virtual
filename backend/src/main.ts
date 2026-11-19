import { createContainer } from './app/container.js';
import { startServer } from './app/server.js';
import { loadConfig } from './config/env.js';

const config = loadConfig(process.env);
for (const warning of config.warnings) {
  console.warn(`[aviso] ${warning}`);
}

const container = await createContainer(config);
const server = startServer(container);

process.once('SIGTERM', () => void server.shutdown('SIGTERM'));
process.once('SIGINT', () => void server.shutdown('SIGINT'));
