import { AccessToken } from 'livekit-server-sdk';
import type { MediaConfig } from '../../config/env.js';

/** Quanto tempo o acesso à chamada vale. O app pede outro ao mudar de zona. */
const MEDIA_TOKEN_TTL_SECONDS = 2 * 60 * 60;

/**
 * Emite o acesso à chamada de voz e vídeo (LiveKit) de uma zona. A identidade
 * é o id do jogador no escritório, assim o app liga cada voz ao avatar certo.
 */
export class MediaService {
  private readonly config: MediaConfig | null;

  constructor(config: MediaConfig | null) {
    this.config = config;
  }

  get enabled(): boolean {
    return this.config !== null;
  }

  /** `room` é o nome da sala de chamada da zona (veja `callRoomName`). */
  async accessFor(
    playerId: string,
    name: string,
    room: string,
  ): Promise<{ url: string; token: string } | null> {
    if (!this.config) return null;
    const token = new AccessToken(this.config.apiKey, this.config.apiSecret, {
      identity: playerId,
      name,
      ttl: MEDIA_TOKEN_TTL_SECONDS,
    });
    token.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: false,
    });
    return { url: this.config.url, token: await token.toJwt() };
  }
}
