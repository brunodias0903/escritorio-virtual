/**
 * Confere a chamada de ponta a ponta no seu computador, sem navegador:
 * cria/entra com uma conta de sonda, pede acesso à chamada de uma mesa e abre
 * a conexão de sinalização com o LiveKit, como o app faz.
 *
 * Antes: pnpm dev:infra e pnpm dev:local
 * Uso:   pnpm exec tsx scripts/media-probe.ts
 */
import { once } from 'node:events';
import WebSocket from 'ws';

const API = process.env.API ?? 'http://127.0.0.1:5001';
const PROBE_USER = {
  fullName: 'Sonda LiveKit',
  nickname: 'sonda_media',
  email: 'sonda.media@empresa.com',
  password: 'senha-sonda-livekit-123',
};

const getToken = async (): Promise<string> => {
  const registered = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(PROBE_USER),
  });
  if (registered.ok) {
    const body = (await registered.json()) as { token: string };
    return body.token;
  }
  const logged = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      login: PROBE_USER.nickname,
      password: PROBE_USER.password,
    }),
  });
  if (!logged.ok) {
    throw new Error(
      `Falha ao autenticar sonda (${logged.status}): ${await logged.text()}`,
    );
  }
  const body = (await logged.json()) as { token: string };
  return body.token;
};

const token = await getToken();
console.log('sessão da sonda autenticada');

const office = new WebSocket(API.replace(/^http/, 'ws'));
let media: { url: string; token: string } | null = null;
let unavailable = false;
let noneReceived = false;
let zone = '';

office.on('message', (raw) => {
  const message = JSON.parse(raw.toString()) as {
    type: string;
    zone?: string;
    url?: string;
    token?: string;
  };
  if (message.type === 'media' && message.url && message.token) {
    media = { url: message.url, token: message.token };
    zone = message.zone ?? '';
  }
  if (message.type === 'mediaNone') noneReceived = true;
  if (message.type === 'mediaUnavailable') unavailable = true;
});

await once(office, 'open');
office.send(JSON.stringify({ type: 'join', token }));
await new Promise((resolve) => setTimeout(resolve, 1000));
office.send(JSON.stringify({ type: 'media' }));
await new Promise((resolve) => setTimeout(resolve, 600));
console.log(
  'na estrada (sem zona):',
  noneReceived ? 'sem chamada (certo)' : 'ERRO: recebeu chamada',
);

// Anda da entrada (496, 560) até a zona da mesa 7 (496, 432).
for (const y of [528, 496, 464, 432]) {
  office.send(JSON.stringify({ type: 'move', x: 496, y }));
  await new Promise((resolve) => setTimeout(resolve, 50));
}
office.send(JSON.stringify({ type: 'media' }));
await new Promise((resolve) => setTimeout(resolve, 800));

if (unavailable || !media) {
  console.log(
    'FALHA: o servidor respondeu "chamada indisponível" (sem LIVEKIT_*)',
  );
  process.exit(1);
}
const access = media as { url: string; token: string };
console.log('acesso à chamada da zona:', zone, access.url);

const signal = new WebSocket(
  `${access.url}/rtc?access_token=${access.token}&auto_subscribe=0&protocol=16&sdk=js&version=2.0.0`,
);
let bytes = 0;
signal.on('message', (data: Buffer) => {
  bytes += data.length;
});
const outcome = await Promise.race([
  once(signal, 'open').then(() => 'aberta'),
  once(signal, 'error').then(([error]) => `erro: ${(error as Error).message}`),
  new Promise<string>((resolve) =>
    setTimeout(() => resolve('tempo esgotado'), 5000),
  ),
]);
await new Promise((resolve) => setTimeout(resolve, 1500));
console.log(
  'sinalização com o LiveKit:',
  outcome,
  `(${bytes} bytes recebidos)`,
);
signal.close();
office.close();
process.exit(outcome === 'aberta' && bytes > 0 ? 0 : 1);
