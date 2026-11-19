import { decodeJwt } from 'jose';
import { describe, expect, it } from 'vitest';
import { MediaService } from './media.service.js';

const config = {
  url: 'wss://virtual-office.exemplo.com/livekit',
  apiKey: 'chave-de-teste',
  apiSecret: 'segredo-de-teste-com-mais-de-32-caracteres-ok',
};

describe('MediaService', () => {
  it('fica desligado sem configuração', async () => {
    const service = new MediaService(null);
    expect(service.enabled).toBe(false);
    expect(
      await service.accessFor('p1', 'Ana', 'zone:lobby:mesa-1'),
    ).toBeNull();
  });

  it('emite acesso só à sala da zona, com a identidade do jogador', async () => {
    const service = new MediaService(config);
    expect(service.enabled).toBe(true);
    const access = await service.accessFor('p1', 'Ana', 'zone:lobby:mesa-1');
    expect(access?.url).toBe(config.url);

    const claims = decodeJwt(access!.token) as {
      iss: string;
      sub: string;
      name: string;
      exp: number;
      video: {
        room: string;
        roomJoin: boolean;
        canPublish: boolean;
        canSubscribe: boolean;
      };
    };
    expect(claims.iss).toBe(config.apiKey);
    expect(claims.sub).toBe('p1');
    expect(claims.name).toBe('Ana');
    expect(claims.video).toMatchObject({
      room: 'zone:lobby:mesa-1',
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });
    expect(claims.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});
