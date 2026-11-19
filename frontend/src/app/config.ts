import { resolveApiUrl } from '@/shared/lib/apiUrl';
import { resolveWsUrl } from '@/shared/lib/wsUrl';

// Em produção (build Vite atrás do nginx), API e WebSocket ficam na mesma
// origem da página (/api e /ws). Em desenvolvimento, o servidor fica na porta
// 5001 no mesmo host da página. Para sobrescrever, defina VITE_API_URL e
// VITE_WS_URL no ambiente.
const host = window.location.hostname;
const secure = window.location.protocol === 'https:';
const origin = import.meta.env.PROD ? window.location.origin : undefined;

export const WS_URL = resolveWsUrl({
  envUrl: import.meta.env.VITE_WS_URL,
  origin,
  host,
  secure,
});

export const API_URL = resolveApiUrl({
  envUrl: import.meta.env.VITE_API_URL,
  origin,
  host,
  secure,
});
