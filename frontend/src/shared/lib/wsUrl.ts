export const DEFAULT_WS_PORT = 5001;
/** Caminho do proxy (nginx) que encaminha o WebSocket ao servidor. */
export const WS_PROXY_PATH = '/ws';

type Options = {
  /** Valor de VITE_WS_URL, quando definido. */
  envUrl?: string | undefined;
  /**
   * Origem da página (ex.: `https://203.0.113.10:5000`), no site publicado:
   * o WebSocket fica no mesmo endereço, em /ws (nginx).
   */
  origin?: string | undefined;
  /** Host onde o app está sendo servido. */
  host?: string | undefined;
  /** Página aberta em HTTPS: o WebSocket precisa ser seguro (wss) e passar pelo proxy. */
  secure?: boolean;
  port?: number;
};

/**
 * Endereço do servidor em tempo real:
 * 1. VITE_WS_URL, quando definido;
 * 2. site publicado: a mesma origem da página, em /ws (mantém a porta);
 * 3. página em HTTPS: `wss://host/ws`;
 * 4. senão `ws://host:porta` (desenvolvimento).
 */
export const resolveWsUrl = ({
  envUrl,
  origin,
  host,
  secure = false,
  port = DEFAULT_WS_PORT,
}: Options): string => {
  const fromEnv = envUrl?.trim();
  if (fromEnv) return fromEnv;
  if (origin) {
    const base = origin.replace(/\/+$/, '').replace(/^http/, 'ws');
    return `${base}${WS_PROXY_PATH}`;
  }
  const name = host || 'localhost';
  return secure ? `wss://${name}${WS_PROXY_PATH}` : `ws://${name}:${port}`;
};
