import { describe, expect, it } from 'vitest';
import { isOriginAllowed, parseAllowedOrigins } from './origin.js';

describe('parseAllowedOrigins', () => {
  it('separa por vírgula e ignora vazios', () => {
    expect(parseAllowedOrigins(' https://a.com , ,https://b.com ')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });

  it('devolve lista vazia sem valor', () => {
    expect(parseAllowedOrigins(undefined)).toEqual([]);
  });
});

describe('isOriginAllowed', () => {
  const allowed = ['https://virtual-office.exemplo.com'];

  it('aceita qualquer origem sem lista configurada', () => {
    expect(isOriginAllowed('https://outro.com', [])).toBe(true);
  });

  it('aceita origem da lista e clientes sem Origin', () => {
    expect(isOriginAllowed('https://virtual-office.exemplo.com', allowed)).toBe(
      true,
    );
    expect(isOriginAllowed(undefined, allowed)).toBe(true);
    expect(isOriginAllowed('', allowed)).toBe(true);
  });

  it('recusa origem fora da lista', () => {
    expect(isOriginAllowed('https://mal.com', allowed)).toBe(false);
  });

  it('aceita subdomínios quando a lista usa curinga (ex.: trycloudflare.com)', () => {
    const withWildcard = [
      'http://localhost:5080',
      'https://*.trycloudflare.com',
      'http://*.localhost:5080',
    ];

    expect(
      isOriginAllowed(
        'https://installing-chan-reserved-has.trycloudflare.com',
        withWildcard,
      ),
    ).toBe(true);
    expect(
      isOriginAllowed('https://sub.a.trycloudflare.com', withWildcard),
    ).toBe(true);
    expect(isOriginAllowed('https://FOO.TryCloudflare.COM', withWildcard)).toBe(
      true,
    );
    expect(isOriginAllowed('http://app.localhost:5080', withWildcard)).toBe(
      true,
    );
    expect(isOriginAllowed('http://localhost:5080', withWildcard)).toBe(true);
  });

  it('recusa esquema, porta, domínio raiz, sufixo falso e URLs inválidas no curinga', () => {
    const withWildcard = [
      'https://*.trycloudflare.com',
      'http://*.localhost:5080',
    ];

    // Esquema diferente
    expect(isOriginAllowed('http://abc.trycloudflare.com', withWildcard)).toBe(
      false,
    );
    // Domínio raiz (sem subdomínio)
    expect(isOriginAllowed('https://trycloudflare.com', withWildcard)).toBe(
      false,
    );
    // Sufixo parecido (tentativa de bypass)
    expect(isOriginAllowed('https://eviltrycloudflare.com', withWildcard)).toBe(
      false,
    );
    expect(
      isOriginAllowed('https://abc.trycloudflare.com.evil.com', withWildcard),
    ).toBe(false);
    // Porta diferente
    expect(
      isOriginAllowed('https://abc.trycloudflare.com:8443', withWildcard),
    ).toBe(false);
    expect(isOriginAllowed('http://app.localhost:3000', withWildcard)).toBe(
      false,
    );
    // Credenciais, caminho, barra final ou URL malformada
    expect(
      isOriginAllowed('https://abc.trycloudflare.com@evil.com', withWildcard),
    ).toBe(false);
    expect(
      isOriginAllowed('https://abc.trycloudflare.com/api', withWildcard),
    ).toBe(false);
    expect(
      isOriginAllowed('https://abc.trycloudflare.com/', withWildcard),
    ).toBe(false);
    expect(isOriginAllowed('null', withWildcard)).toBe(false);
    // Padrões inválidos na configuração nunca liberam acesso
    expect(
      isOriginAllowed('https://abc.trycloudflare.com', [
        'https://*.*.trycloudflare.com',
        'https://*.trycloudflare.com/path',
        '*.trycloudflare.com',
        'https://*.',
      ]),
    ).toBe(false);
  });
});
