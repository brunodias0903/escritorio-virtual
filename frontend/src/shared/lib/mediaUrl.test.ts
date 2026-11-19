import { describe, expect, it } from 'vitest';
import { resolveMediaUrl } from './mediaUrl';

describe('resolveMediaUrl', () => {
  it('troca localhost pelo endereço usado para abrir o app', () => {
    expect(resolveMediaUrl('ws://localhost:5002', '192.168.15.12')).toBe(
      'ws://192.168.15.12:5002',
    );
    expect(resolveMediaUrl('ws://127.0.0.1:5002/x', '192.168.15.12')).toBe(
      'ws://192.168.15.12:5002/x',
    );
  });

  it('não mexe quando o app também está em localhost', () => {
    expect(resolveMediaUrl('ws://localhost:5002', 'localhost')).toBe(
      'ws://localhost:5002',
    );
    expect(resolveMediaUrl('ws://localhost:5002', '127.0.0.1')).toBe(
      'ws://localhost:5002',
    );
  });

  it('não mexe em endereços reais, em texto inválido nem sem host', () => {
    expect(
      resolveMediaUrl('wss://virtual-office.exemplo.com/livekit', '10.0.0.5'),
    ).toBe('wss://virtual-office.exemplo.com/livekit');
    expect(resolveMediaUrl('não é url', '10.0.0.5')).toBe('não é url');
    expect(resolveMediaUrl('ws://localhost:5002', '')).toBe(
      'ws://localhost:5002',
    );
  });
});
