// Gera o arquivo .env na raiz a partir de .env.example com segredos aleatórios.
// Funciona em Mac, Windows (WSL2/PowerShell) e Linux usando apenas Node.js.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXAMPLE_PATH = resolve(ROOT, '.env.example');
const ENV_PATH = resolve(ROOT, '.env');

const args = new Set(process.argv.slice(2));
const force = args.has('--force');
const prod = args.has('--prod');

const readFlag = (prefix) => {
  const match = process.argv.slice(2).find((item) => item.startsWith(prefix));
  return match ? match.slice(prefix.length).trim() : '';
};

const domain = readFlag('--domain=');
const publicIp = readFlag('--ip=');

if (existsSync(ENV_PATH) && !force) {
  console.log('.env já existe (use --force para sobrescrever).');
  process.exit(0);
}

const randomHex = (bytes) => randomBytes(bytes).toString('hex');

const replacements = new Map([
  ['POSTGRES_PASSWORD', randomHex(16)],
  ['VALKEY_PASSWORD', randomHex(16)],
  ['SESSION_SECRET', randomHex(32)],
  ['LIVEKIT_API_SECRET', randomHex(32)],
]);

if (prod) {
  replacements.set('COMPOSE_PROFILES', 'prod');
  if (domain) {
    replacements.set('SITE_DOMAIN', domain);
    replacements.set('ALLOWED_ORIGINS', `https://${domain}`);
    replacements.set('LIVEKIT_PUBLIC_URL', `wss://${domain}/livekit`);
  }
  if (publicIp) {
    replacements.set('LIVEKIT_NODE_IP', publicIp);
  }
}

const template = readFileSync(EXAMPLE_PATH, 'utf8');
const lines = template.split(/\r?\n/).map((line) => {
  if (!line || line.startsWith('#')) return line;
  const eq = line.indexOf('=');
  if (eq === -1) return line;
  const key = line.slice(0, eq);
  const current = line.slice(eq + 1);
  if (replacements.has(key) && (current === '' || prod)) {
    return `${key}=${replacements.get(key)}`;
  }
  return line;
});

writeFileSync(ENV_PATH, `${lines.join('\n')}`, { mode: 0o600 });
console.log(`.env criado em ${ENV_PATH} com segredos aleatórios.`);
if (prod && (!domain || !publicIp)) {
  console.log(
    'Atenção (VPS): preencha SITE_DOMAIN, ALLOWED_ORIGINS, LIVEKIT_NODE_IP e LIVEKIT_PUBLIC_URL no .env.',
  );
}
