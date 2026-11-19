// Sobe a infraestrutura de desenvolvimento (Postgres, Valkey, Mailpit e LiveKit)
// anunciando o IP do computador na rede para chamadas WebRTC funcionarem no celular.
//
// Uso: pnpm dev:infra            (descobre o IP sozinho)
//      LIVEKIT_NODE_IP=10.0.0.5 pnpm dev:infra   (força um IP)
import { spawnSync } from 'node:child_process';
import { networkInterfaces } from 'node:os';

// Placas virtuais (WSL, Docker, VPN, VM) não são alcançáveis pelo celular.
const VIRTUAL =
  /vethernet|wsl|docker|virtual|vmware|vbox|hyper-v|loopback|tailscale|vpn|tap|tun/i;

/** Pontuação do endereço: redes caseiras e de escritório primeiro. */
const rank = (address) => {
  if (address.startsWith('192.168.')) return 0;
  if (address.startsWith('10.')) return 1;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) return 2;
  return 3;
};

export const pickLanIp = (interfaces) => {
  const candidates = [];
  for (const [name, list] of Object.entries(interfaces)) {
    if (VIRTUAL.test(name)) continue;
    for (const item of list ?? []) {
      if (item.family === 'IPv4' && !item.internal)
        candidates.push(item.address);
    }
  }
  return candidates.sort((a, b) => rank(a) - rank(b))[0];
};

const ip = process.env.LIVEKIT_NODE_IP || pickLanIp(networkInterfaces());
if (!ip) {
  console.error(
    'Não achei o IP do computador na rede. Informe: LIVEKIT_NODE_IP=<ip> pnpm dev:infra',
  );
  process.exit(1);
}

console.log(
  `LiveKit anunciando o IP ${ip} (celulares precisam alcançar este endereço).`,
);
const result = spawnSync(
  'docker',
  [
    'compose',
    '-f',
    'docker-compose.dev.yml',
    'up',
    '-d',
    '--wait',
    '--force-recreate',
  ],
  {
    stdio: 'inherit',
    env: { ...process.env, LIVEKIT_NODE_IP: ip },
  },
);
if (result.status !== 0) process.exit(result.status ?? 1);

console.log(`
Infraestrutura de desenvolvimento pronta:
  Postgres : 127.0.0.1:5004
  Valkey   : 127.0.0.1:5005
  Mailpit  : http://localhost:5007 (SMTP em 127.0.0.1:5006)
  LiveKit  : ws://${ip}:5002

Agora rode o servidor com: pnpm dev:local
`);
