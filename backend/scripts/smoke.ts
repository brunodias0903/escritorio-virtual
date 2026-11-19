/**
 * Teste de integração com Postgres, Valkey e LiveKit de verdade.
 *
 * 1. Suba a infraestrutura de teste:
 *    docker compose -f scripts/compose.test-infra.yml up -d --wait
 * 2. Rode: pnpm smoke
 * 3. Derrube:
 *    docker compose -f scripts/compose.test-infra.yml down -v
 *
 * Sobe duas instâncias do servidor e confere salas, portas, chat (público,
 * conversa direta, respostas e menções), presença entre elas, contas,
 * encerramento de sessão, acesso à chamada e persistência depois de reiniciar.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { RoomServiceClient, TokenVerifier } from 'livekit-server-sdk';
import WebSocket from 'ws';
import { signSession } from '../src/modules/auth/token.js';
import { dmChannelId, type ServerMessage } from '../src/shared/domain/index.js';

const SECRET = 'segredo-do-teste-de-integracao-com-32-ou-mais';
const DATABASE_URL =
  'postgres://virtual_office:testpass123@127.0.0.1:55432/virtual_office';
const REDIS_URL = 'redis://:testvalkey123@127.0.0.1:5008';
const LIVEKIT = {
  http: 'http://127.0.0.1:57880',
  url: 'ws://127.0.0.1:57880',
  key: 'testkey',
  secret: 'testsecret-testsecret-testsecret-1234',
};
const PORTS = { a: 2611, b: 2612 };
const SERVER_DIR = fileURLToPath(new URL('..', import.meta.url));

const ANA = 'ana@empresa.com';
const BIA = 'bia@empresa.com';

const results: { name: string; ok: boolean; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail?: string) => {
  results.push({ name, ok, ...(detail ? { detail } : {}) });
  console.log(
    `${ok ? 'OK   ' : 'FALHA'} ${name}${!ok && detail ? ` -> ${detail}` : ''}`,
  );
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const until = async (condition: () => boolean, ms = 4000): Promise<boolean> => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (condition()) return true;
    await sleep(25);
  }
  return condition();
};

const servers: ChildProcess[] = [];
/** Tudo o que os servidores escreveram (os e-mails de código aparecem aqui, sem SMTP). */
let serverLog = '';

/** O último código mandado para o e-mail. */
const codeFor = (email: string): string => {
  const marker = `[e-mail] para ${email} |`;
  const start = serverLog.lastIndexOf(marker);
  if (start < 0) return '000000';
  const body = serverLog.slice(start + marker.length, start + 400);
  return /\d{6}/.exec(body)?.[0] ?? '000000';
};

const startServer = async (port: number): Promise<ChildProcess> => {
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/main.ts'], {
    cwd: SERVER_DIR,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      SESSION_SECRET: SECRET,
      ADMIN_EMAILS: 'chefe@empresa.com',
      EMAIL_CODES: 'true',
      ACCOUNT_DOMAINS: 'empresa.com,parceiro.com:externo',
      DATABASE_URL,
      REDIS_URL,
      LIVEKIT_URL: LIVEKIT.url,
      LIVEKIT_API_KEY: LIVEKIT.key,
      LIVEKIT_API_SECRET: LIVEKIT.secret,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  servers.push(child);
  let log = '';
  child.stdout?.on('data', (chunk: Buffer) => {
    log += chunk.toString();
    serverLog += chunk.toString();
  });
  child.stderr?.on('data', (chunk: Buffer) => (log += chunk.toString()));
  const ready = await until(() => log.includes('Servidor em'), 20_000);
  if (!ready) throw new Error(`Servidor da porta ${port} não subiu:\n${log}`);
  return child;
};

const stopServer = async (child: ChildProcess) => {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([once(child, 'exit'), sleep(6000)]);
  if (child.exitCode === null) child.kill('SIGKILL');
};

const session = (email: string, name: string, admin = false) =>
  signSession({ email, name, admin, kind: 'company' }, SECRET, 3600);

type Client = {
  ws: WebSocket;
  inbox: ServerMessage[];
  send: (m: object) => void;
};

const connect = async (port: number, sessionToken: string): Promise<Client> => {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  const inbox: ServerMessage[] = [];
  ws.on('message', (raw) =>
    inbox.push(JSON.parse(raw.toString()) as ServerMessage),
  );
  await once(ws, 'open');
  const client: Client = { ws, inbox, send: (m) => ws.send(JSON.stringify(m)) };
  client.send({ type: 'join', token: sessionToken });
  return client;
};

const http = async (
  port: number,
  method: string,
  path: string,
  body?: unknown,
  bearer?: string,
) => {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
};

const find = <T extends ServerMessage['type']>(client: Client, type: T) =>
  client.inbox.find(
    (m): m is Extract<ServerMessage, { type: T }> => m.type === type,
  );

const filter = <T extends ServerMessage['type']>(client: Client, type: T) =>
  client.inbox.filter(
    (m): m is Extract<ServerMessage, { type: T }> => m.type === type,
  );

const walk = async (client: Client, points: [number, number][]) => {
  for (const [x, y] of points) {
    client.send({ type: 'move', x, y });
    await sleep(40);
  }
};

const route = (
  from: [number, number],
  ...stops: [number, number][]
): [number, number][] => {
  const points: [number, number][] = [];
  let [x, y] = from;
  for (const [tx, ty] of stops) {
    while (x !== tx) points.push([(x += Math.sign(tx - x) * 32), y]);
    while (y !== ty) points.push([x, (y += Math.sign(ty - y) * 32)]);
  }
  return points;
};

const main = async () => {
  const [a, b] = [await startServer(PORTS.a), await startServer(PORTS.b)];
  check('duas instâncias subiram com Postgres, Valkey e LiveKit', true);

  // --- Entrada e presença entre instâncias ---------------------------------------
  const anaToken = session(ANA, 'Ana');
  const ana = await connect(PORTS.a, anaToken);
  check(
    'Ana entra na instância A (canais, histórico e init)',
    await until(
      () =>
        !!find(ana, 'init') &&
        !!find(ana, 'history') &&
        !!find(ana, 'channels'),
    ),
  );
  check(
    'a Ana começa na recepção e vê os 3 canais iniciais',
    find(ana, 'init')?.map === 'lobby' &&
      find(ana, 'channels')?.channels.length === 3,
  );
  await sleep(300);

  const bia = await connect(PORTS.b, session(BIA, 'Bia'));
  check('Bia entra na instância B', await until(() => !!find(bia, 'init')));
  check(
    'Bia, em outra instância, já vê a Ana (presença no Valkey)',
    !!find(bia, 'init')?.players.some((p) => p.name === 'Ana'),
  );
  check(
    'Ana é avisada que a Bia entrou (barramento)',
    await until(() =>
      ana.inbox.some((m) => m.type === 'joined' && m.player.name === 'Bia'),
    ),
  );
  const anaId = find(ana, 'init')!.id;

  // --- Movimento, status, emote e aparência ---------------------------------------
  ana.send({ type: 'move', x: 528, y: 560 });
  check(
    'movimento da Ana chega à Bia',
    await until(() =>
      bia.inbox.some(
        (m) => m.type === 'moved' && m.id === anaId && m.x === 528,
      ),
    ),
  );
  ana.send({ type: 'status', status: 'busy' });
  check(
    'status da Ana chega à Bia',
    await until(() =>
      bia.inbox.some(
        (m) => m.type === 'status' && m.id === anaId && m.status === 'busy',
      ),
    ),
  );
  ana.send({ type: 'emote', emote: '🎉' });
  check(
    'emote da Ana chega à Bia',
    await until(() =>
      bia.inbox.some((m) => m.type === 'emote' && m.id === anaId),
    ),
  );
  ana.send({
    type: 'appearance',
    appearance: { skin: 1, hair: 2, style: 3, shirt: 4 },
  });
  check(
    'aparência da Ana chega à Bia',
    await until(() =>
      bia.inbox.some((m) => m.type === 'appearance' && m.id === anaId),
    ),
  );

  // --- Chat público, menções e respostas -------------------------------------------
  ana.send({ type: 'chat', channel: 'geral', text: 'oi da instância A, @bia' });
  check(
    'chat da Ana chega à Bia, com a menção resolvida',
    await until(() =>
      bia.inbox.some(
        (m) =>
          m.type === 'chat' &&
          m.message.text.startsWith('oi da instância A') &&
          m.message.mentions.includes(BIA),
      ),
    ),
  );
  const root = filter(bia, 'chat').find((m) =>
    m.message.text.startsWith('oi da instância A'),
  )!.message;

  await sleep(350);
  bia.send({
    type: 'chat',
    channel: 'geral',
    text: 'resposta da Bia',
    threadId: root.id,
  });
  check(
    'resposta da Bia chega à Ana, ligada à mensagem',
    await until(() =>
      ana.inbox.some(
        (m) => m.type === 'chat' && m.message.threadId === root.id,
      ),
    ),
  );
  bia.send({ type: 'thread', threadId: root.id });
  check(
    'a conversa (mensagem e resposta) vem do Postgres',
    await until(() => (find(bia, 'thread')?.messages.length ?? 0) === 2),
  );

  await sleep(350);
  ana.send({ type: 'chat', channel: 'projetos', text: 'ping @bia, veja isto' });
  await until(() =>
    bia.inbox.some(
      (m) => m.type === 'chat' && m.message.channel === 'projetos',
    ),
  );

  // --- Conversa direta entre instâncias ---------------------------------------------
  ana.send({ type: 'openDm', email: BIA });
  check(
    'Ana abre conversa direta com a Bia',
    await until(() => !!find(ana, 'channelOpened')),
  );
  check(
    'Bia é avisada da nova conversa (outra instância)',
    await until(() => !!find(bia, 'channelsChanged')),
  );
  const dm = dmChannelId(ANA, BIA);
  await sleep(350);
  ana.send({ type: 'chat', channel: dm, text: 'só entre nós' });
  check(
    'mensagem direta chega à Bia',
    await until(() =>
      bia.inbox.some((m) => m.type === 'chat' && m.message.channel === dm),
    ),
  );

  const caio = await connect(PORTS.a, session('caio@empresa.com', 'Caio'));
  await until(() => !!find(caio, 'init'));
  caio.send({ type: 'chat', channel: dm, text: 'intruso' });
  check(
    'terceiro não escreve na conversa direta',
    await until(() => find(caio, 'chatError')?.code === 'forbidden'),
  );
  check(
    'terceiro não recebe a conversa direta',
    !caio.inbox.some((m) => m.type === 'chat' && m.message.channel === dm),
  );
  caio.ws.close();

  // --- Chamada de voz e vídeo ----------------------------------------------------------
  ana.send({ type: 'media' });
  check(
    'na estrada, ao lado da Bia, a Ana entra na conversa por perto',
    await until(() => find(ana, 'media')?.zone.startsWith('perto-') === true),
  );
  await walk(ana, route([528, 560], [592, 560]));
  ana.inbox.length = 0;
  ana.send({ type: 'media' });
  check(
    'dois quadradinhos longe, na estrada, não há chamada',
    await until(() => !!find(ana, 'mediaNone')),
  );
  await walk(ana, route([592, 560], [496, 560], [496, 432]));
  ana.send({ type: 'media' });
  check(
    'ao chegar à mesa 7, o servidor entrega o acesso à chamada dela',
    await until(() => find(ana, 'media')?.zone === 'mesa-7'),
  );
  const media = find(ana, 'media');
  let mediaOk = false;
  let detail: string;
  try {
    const claims = await new TokenVerifier(LIVEKIT.key, LIVEKIT.secret).verify(
      media!.token,
    );
    mediaOk =
      claims.sub === anaId &&
      claims.video?.room === 'zone:lobby:mesa-7' &&
      claims.video?.roomJoin === true;
    detail = JSON.stringify(claims.video);
    const rooms = await new RoomServiceClient(
      LIVEKIT.http,
      LIVEKIT.key,
      LIVEKIT.secret,
    ).listRooms();
    detail += ` salas=${rooms.length}`;
  } catch (error) {
    detail = String(error);
  }
  check(
    'acesso vale no LiveKit: identidade da Ana e sala da mesa 7',
    mediaOk,
    detail,
  );

  // --- Mesinhas ------------------------------------------------------------------------
  ana.send({ type: 'deskAdopt', deskId: 'mesa-7' });
  check(
    'Ana adota a mesa 7 e a Bia, em outra instância, é avisada',
    await until(() =>
      bia.inbox.some(
        (m) =>
          m.type === 'desk' &&
          m.desk.deskId === 'mesa-7' &&
          m.desk.owner?.email === ANA,
      ),
    ),
  );
  ana.send({
    type: 'deskConfig',
    deskId: 'mesa-7',
    config: { color: 2, rug: 1, items: ['lamp', 'mug'], label: 'Canto da Ana' },
  });
  check(
    'Ana decora a mesa e a Bia vê a decoração',
    await until(() =>
      bia.inbox.some(
        (m) => m.type === 'desk' && m.desk.config.label === 'Canto da Ana',
      ),
    ),
  );

  await walk(bia, route([496, 560], [464, 432]));
  bia.send({
    type: 'deskConfig',
    deskId: 'mesa-7',
    config: { color: 0, rug: null, items: [], label: 'Invasão' },
  });
  check(
    'a Bia, na mesa da Ana, não consegue mudar a decoração',
    await until(() => find(bia, 'deskError')?.code === 'not_owner'),
  );

  const dani = await connect(PORTS.a, session('dani@empresa.com', 'Dani'));
  const edu = await connect(PORTS.b, session('edu@empresa.com', 'Edu'));
  await until(() => !!find(dani, 'init') && !!find(edu, 'init'));
  await walk(dani, route([496, 560], [432, 432]));
  await sleep(800);
  await walk(edu, route([496, 560], [496, 464], [496, 432]));
  check(
    'a mesa 7 aceita 3 pessoas e a quarta é barrada com aviso',
    await until(() => find(edu, 'zoneFull')?.zone === 'Mesa 7'),
    JSON.stringify(
      edu.inbox.filter((m) => m.type === 'correct' || m.type === 'zoneFull'),
    ),
  );
  dani.ws.close();
  edu.ws.close();
  await sleep(300);
  await walk(bia, route([464, 432], [464, 560]));
  await walk(ana, route([496, 432], [496, 560]));

  // --- Salas e portas -----------------------------------------------------------------
  await walk(ana, route([496, 560], [912, 560], [912, 304], [944, 304]));
  check(
    'Ana passa pela porta e chega ao Andar 2',
    await until(() =>
      ana.inbox.some((m) => m.type === 'map' && m.map === 'andar-2'),
    ),
  );
  check(
    'Bia, que ficou na recepção, vê a Ana sair',
    await until(() =>
      bia.inbox.some((m) => m.type === 'left' && m.id === anaId),
    ),
  );
  ana.send({ type: 'move', x: 112, y: 304 });
  await sleep(200);
  bia.inbox.length = 0;
  ana.send({ type: 'emote', emote: '👋' });
  await sleep(300);
  check(
    'quem está em outra sala não recebe os emotes da Ana',
    !bia.inbox.some((m) => m.type === 'emote'),
  );

  // --- Contas -------------------------------------------------------------------------
  const nick = `joao${Date.now() % 100000}`;
  const email = `${nick}@parceiro.com`;
  const asked = await http(PORTS.a, 'POST', '/api/auth/code', {
    email,
    purpose: 'register',
  });
  check('pede o código de cadastro (202)', asked.status === 202);
  await until(() => codeFor(email) !== '000000');
  const created = await http(PORTS.b, 'POST', '/api/auth/register', {
    fullName: 'João Terceiro',
    nickname: nick,
    email,
    code: codeFor(email),
    password: 'senha-segura-123',
  });
  check(
    'cadastro com e-mail de parceiro (201), como externo',
    created.status === 201 &&
      (created.body.user as { kind?: string } | undefined)?.kind ===
        'third_party',
    JSON.stringify(created),
  );
  const other = `outro${Date.now() % 100000}@empresa.com`;
  await http(PORTS.b, 'POST', '/api/auth/code', {
    email: other,
    purpose: 'register',
  });
  await until(() => codeFor(other) !== '000000');
  const repeated = await http(PORTS.b, 'POST', '/api/auth/register', {
    fullName: 'Outro Nome',
    nickname: nick,
    email: other,
    code: codeFor(other),
    password: 'senha-segura-123',
  });
  check(
    'a instância B vê o nickname já usado (409)',
    repeated.status === 409 && repeated.body.error === 'nickname_taken',
  );
  const outsider = await http(PORTS.a, 'POST', '/api/auth/register', {
    fullName: 'Fora Daqui',
    nickname: 'fora',
    email: 'fora@gmail.com',
    password: 'senha-segura-123',
  });
  check('e-mail fora da lista não cria conta (403)', outsider.status === 403);

  await sleep(50);
  await http(PORTS.a, 'POST', '/api/auth/code', { email, purpose: 'reset' });
  const resetCode = await (async () => {
    const before = codeFor(email);
    await until(() => codeFor(email) !== before);
    return codeFor(email);
  })();
  const reset = await http(PORTS.b, 'POST', '/api/auth/reset', {
    email,
    code: resetCode,
    password: 'senha-nova-456',
  });
  check('esqueci a senha: troca com o código do e-mail', reset.status === 200);
  await http(PORTS.a, 'POST', '/api/auth/reset', {
    email,
    code: resetCode,
    password: 'outra-senha-789',
  }).then((again) =>
    check('o mesmo código não serve duas vezes', again.status === 400),
  );
  const byNick = await http(PORTS.b, 'POST', '/api/auth/login', {
    login: nick.toUpperCase(),
    password: 'senha-nova-456',
  });
  check('entra pelo nickname na instância B', byNick.status === 200);
  const byEmail = await http(PORTS.a, 'POST', '/api/auth/login', {
    login: email,
    password: 'senha-nova-456',
  });
  check('entra pelo e-mail na instância A', byEmail.status === 200);

  // --- Encerrar sessão -----------------------------------------------------------------
  const logout = await http(
    PORTS.a,
    'POST',
    '/api/auth/logout',
    undefined,
    anaToken,
  );
  check('logout da Ana', logout.status === 200);
  const again = await connect(PORTS.b, anaToken);
  const [closeCode] = (await once(again.ws, 'close')) as [number];
  check(
    'sessão encerrada não entra mais, nem pela outra instância (4401)',
    closeCode === 4401,
    String(closeCode),
  );
  ana.ws.close();
  bia.ws.close();
  await sleep(300);

  // --- Persistência depois de reiniciar ------------------------------------------------
  await Promise.all([stopServer(a), stopServer(b)]);
  const [restartedA, restartedB] = [
    await startServer(PORTS.a),
    await startServer(PORTS.b),
  ];
  const biaBack = await connect(PORTS.a, session(BIA, 'Bia'));
  await until(
    () =>
      !!find(biaBack, 'history') &&
      !!find(biaBack, 'channels') &&
      !!find(biaBack, 'desks') &&
      !!find(biaBack, 'init'),
  );
  const history = find(biaBack, 'history')?.messages ?? [];
  const biaInit = find(biaBack, 'init');
  const biaAgain = biaInit?.players.find((p) => p.id === biaInit.id);
  check(
    'a Bia volta exatamente para onde estava ao sair (464, 560)',
    biaAgain?.x === 464 && biaAgain.y === 560 && biaAgain.map === 'lobby',
    JSON.stringify(biaAgain),
  );
  const geral = history.find((m) => m.text.startsWith('oi da instância A'));
  check(
    'histórico do chat sobrevive ao reinício, com respostas contadas e menções',
    geral?.replyCount === 1 &&
      geral.mentions.includes(BIA) &&
      geral.authorId === ANA,
    JSON.stringify(geral),
  );
  check(
    'a conversa direta e a mensagem sobrevivem ao reinício',
    history.some((m) => m.channel === dm && m.text === 'só entre nós') &&
      !!find(biaBack, 'channels')?.channels.some((c) => c.id === dm),
  );
  check(
    'a mesa adotada e a decoração sobrevivem ao reinício',
    !!find(biaBack, 'desks')?.desks.some(
      (d) =>
        d.deskId === 'mesa-7' &&
        d.owner?.email === ANA &&
        d.config.label === 'Canto da Ana',
    ),
  );
  const channel = find(biaBack, 'channels')?.channels.find(
    (c) => c.id === 'projetos',
  );
  check(
    'a Bia vê a menção como não lida (@1) no #projetos',
    (channel?.mentions ?? 0) === 1 && (channel?.unread ?? 0) === 1,
    JSON.stringify(channel),
  );
  const relogin = await http(PORTS.a, 'POST', '/api/auth/login', {
    login: nick,
    password: 'senha-nova-456',
  });
  check(
    'a conta sobrevive ao reinício',
    relogin.status === 200,
    String(relogin.status),
  );

  // Limite compartilhado no Valkey (bloqueia o IP por 15 minutos, por isso fica no fim).
  let blocked = 0;
  for (let i = 0; i < 12; i++) {
    const wrong = await http(PORTS.a, 'POST', '/api/auth/login', {
      login: 'x@parceiro.com',
      password: 'errada-errada',
    });
    if (wrong.status === 429) blocked++;
  }
  const viaB = await http(PORTS.b, 'POST', '/api/auth/login', {
    login: 'x@parceiro.com',
    password: 'errada-errada',
  });
  check(
    'limite de tentativas vale nas duas instâncias',
    blocked > 0 && viaB.status === 429,
    `bloqueadas=${blocked} B=${viaB.status}`,
  );

  biaBack.ws.close();
  await Promise.all([stopServer(restartedA), stopServer(restartedB)]);
};

main()
  .catch((error) => {
    check('execução sem erro', false, String(error));
  })
  .finally(async () => {
    await Promise.all(servers.map(stopServer));
    const failed = results.filter((r) => !r.ok);
    console.log(
      `\n${results.length - failed.length}/${results.length} verificações passaram.`,
    );
    process.exit(failed.length === 0 ? 0 : 1);
  });
