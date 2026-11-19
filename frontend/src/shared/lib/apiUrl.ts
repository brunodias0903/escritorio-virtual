import { DEFAULT_WS_PORT } from './wsUrl';

type Options = {
  /** Valor de VITE_API_URL, quando definido (sem barra no final). */
  envUrl?: string | undefined;
  /**
   * Origem da página (ex.: `https://203.0.113.10:5000`), no site publicado:
   * a API fica no mesmo endereço, atrás do nginx (/api).
   */
  origin?: string | undefined;
  host?: string | undefined;
  /** Página aberta em HTTPS: a API fica na mesma origem, atrás do nginx. */
  secure?: boolean;
  port?: number;
};

/** Endereço base da API HTTP (as rotas já começam com /api). */
export const resolveApiUrl = ({
  envUrl,
  origin,
  host,
  secure = false,
  port = DEFAULT_WS_PORT,
}: Options): string => {
  const fromEnv = envUrl?.trim().replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  if (origin) return origin.replace(/\/+$/, '');
  const name = host || 'localhost';
  return secure ? `https://${name}` : `http://${name}:${port}`;
};
