import { describe, expect, it } from 'vitest';
import { resolveApiUrl } from './apiUrl';

describe('resolveApiUrl', () => {
  it('prefere a variável de ambiente, sem barra no final', () => {
    expect(resolveApiUrl({ envUrl: ' https://api.exemplo.com/ ' })).toBe(
      'https://api.exemplo.com',
    );
  });

  it('no site publicado, usa a origem da página com a porta', () => {
    expect(
      resolveApiUrl({ origin: 'https://203.0.113.10:5000', host: 'x' }),
    ).toBe('https://203.0.113.10:5000');
    expect(resolveApiUrl({ origin: 'http://localhost:5000/' })).toBe(
      'http://localhost:5000',
    );
  });

  it('usa a mesma origem em HTTPS', () => {
    expect(
      resolveApiUrl({ host: 'virtual-office.exemplo.com', secure: true }),
    ).toBe('https://virtual-office.exemplo.com');
  });

  it('usa host e porta do servidor em desenvolvimento', () => {
    expect(resolveApiUrl({ host: '192.168.0.5' })).toBe(
      'http://192.168.0.5:5001',
    );
    expect(resolveApiUrl({})).toBe('http://localhost:5001');
  });
});
