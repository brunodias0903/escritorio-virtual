import { describe, expect, it } from 'vitest';
import { resolveWsUrl } from './wsUrl';

describe('resolveWsUrl', () => {
  it('prefere a variável de ambiente', () => {
    expect(resolveWsUrl({ envUrl: ' wss://x.dev ', host: '10.0.0.2' })).toBe(
      'wss://x.dev',
    );
  });

  it('usa o host do app com a porta padrão', () => {
    expect(resolveWsUrl({ host: '192.168.0.5' })).toBe('ws://192.168.0.5:5001');
  });

  it('usa wss pelo proxy quando a página é segura', () => {
    expect(
      resolveWsUrl({ host: 'virtual-office.exemplo.com', secure: true }),
    ).toBe('wss://virtual-office.exemplo.com/ws');
  });

  it('no site publicado, usa a origem da página em /ws, com a porta', () => {
    expect(resolveWsUrl({ origin: 'https://203.0.113.10:5000' })).toBe(
      'wss://203.0.113.10:5000/ws',
    );
    expect(resolveWsUrl({ origin: 'http://localhost:5000' })).toBe(
      'ws://localhost:5000/ws',
    );
  });

  it('cai para localhost sem host', () => {
    expect(resolveWsUrl({ envUrl: '  ' })).toBe('ws://localhost:5001');
    expect(resolveWsUrl({ port: 3000 })).toBe('ws://localhost:3000');
  });
});
