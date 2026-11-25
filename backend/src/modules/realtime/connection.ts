import {
  ClientMessageSchema,
  callKey,
  callRoomName,
  canManageDesks,
  canManageServer,
  canViewChannel,
  defaultAppearance,
  effectiveTiersOf,
  isUnavailableStatus,
  sortPeople,
  type AccountTier,
  type ClientMessage,
  type DeskInfo,
  type Person,
  type ServerMessage,
} from '../../shared/domain/index.js';
import type { Result } from '../../shared/result.js';
import type { LocalAccountRepository } from '../auth/auth.repository.js';
import type { AuthService } from '../auth/auth.service.js';
import type { SessionClaims } from '../auth/token.js';
import type { ChatService } from '../chat/chat.service.js';
import type { DeskService } from '../desks/desks.service.js';
import type { MediaService } from '../media/media.service.js';
import type { OfficeService } from '../office/office.service.js';
import type { ProfileRepository } from '../office/profile.repository.js';
import type { Cluster } from './cluster.js';

export type ConnectionDeps = {
  /** Id desta ligação (também o id do jogador no escritório). */
  id: string;
  office: OfficeService;
  cluster: Cluster;
  auth: AuthService;
  chat: ChatService;
  desks: DeskService;
  media: MediaService;
  profiles: ProfileRepository;
  /** Contas: nome, nickname e cargo de quem já se cadastrou (lista de pessoas). */
  accounts: LocalAccountRepository;
  /** Envia uma mensagem só a esta ligação. */
  send: (message: ServerMessage) => void;
  close: (code: number, reason: string) => void;
  /** Passa a entregar mensagens do escritório a esta ligação. */
  attach: () => void;
  detach: () => void;
  /** Reivindica a sessão ativa para o e-mail; devolve true se outro dispositivo foi deslocado. */
  claimSession?: (email: string) => Promise<boolean>;
  /** Libera o registro da sessão ativa quando o socket fecha. */
  releaseSession?: (email: string) => void;
  now?: () => number;
};

type State = 'new' | 'joining' | 'joined' | 'displaced';

/** Enquanto anda, grava o lugar no máximo a cada este tempo (além de gravar ao sair). */
export const POSITION_SAVE_MS = 5000;

/**
 * Uma pessoa conectada. Recebe os pedidos dela (já lidos do JSON) e decide o
 * que fazer. Não conhece sockets: quem a usa entrega e recebe as mensagens.
 */
export class Connection {
  private state: State = 'new';
  private claims: SessionClaims | null = null;
  private savedAt = 0;
  private readonly deps: ConnectionDeps;
  private readonly now: () => number;

  constructor(deps: ConnectionDeps) {
    this.deps = deps;
    this.now = deps.now ?? Date.now;
  }

  get joined(): boolean {
    return this.state === 'joined';
  }

  /** Há uma entrada em andamento ou concluída (o tempo de espera do login acabou de valer). */
  get started(): boolean {
    return this.state !== 'new';
  }

  async handle(data: unknown): Promise<void> {
    const parsed = ClientMessageSchema.safeParse(data);
    if (!parsed.success) return;
    const message = parsed.data;

    if (message.type === 'join') {
      if (this.state === 'new') await this.join(message.token);
      return;
    }
    if (message.type === 'takeover') {
      if (this.state === 'displaced' && this.claims) {
        await this.activate(this.claims);
      }
      return;
    }
    if (this.state !== 'joined' || !this.claims) return;
    await this.handleJoined(this.claims, message);
  }

  /** Desloca esta conexão porque outro dispositivo assumiu a mesma conta. */
  async displace(): Promise<void> {
    if (this.state !== 'joined') return;
    const { id, office, cluster } = this.deps;
    this.state = 'displaced';
    this.deps.detach();
    await this.savePosition();
    await cluster.dispatch(id, office.leave(id));
    await cluster.playerLeft(id);
    this.deps.send({ type: 'sessionDisplaced', reason: 'other_device' });
  }

  /** Desconecta imediatamente por ação de moderação (ban, kick, restrição ou remoção). */
  async kick(
    action: 'banned' | 'kicked' | 'restricted' | 'removed',
    reason?: string,
  ): Promise<void> {
    const claims = this.claims;
    if (claims) {
      await this.deps.auth.logout(claims);
      this.deps.releaseSession?.(claims.email);
    }
    if (this.state === 'joined') {
      const { id, office, cluster } = this.deps;
      this.state = 'new';
      this.deps.detach();
      await cluster.dispatch(id, office.leave(id));
      await cluster.playerLeft(id);
    } else {
      this.state = 'new';
      this.deps.detach();
    }
    this.deps.send({
      type: 'accountModerated',
      action,
      ...(reason ? { reason } : {}),
    });
    this.deps.close(4403, action);
  }

  /** A ligação caiu: tira a pessoa do escritório e avisa os outros. */
  async dispose(): Promise<void> {
    if (this.claims) this.deps.releaseSession?.(this.claims.email);
    if (this.state !== 'joined') return;
    const { id, office, cluster } = this.deps;
    this.state = 'new';
    this.deps.detach();
    await this.savePosition();
    await cluster.dispatch(id, office.leave(id));
    await cluster.playerLeft(id);
  }

  /** Todas as contas, com o status de quem está online agora. */
  private async people(): Promise<Person[]> {
    const online = new Map(
      this.deps.office
        .everyone()
        .filter((p) => p.email)
        .map((p) => [p.email!, p]),
    );
    const accounts = (await this.deps.accounts.all()).filter(
      (a) => !a.bannedAt,
    );
    const people: Person[] = accounts.map((a) => {
      const player = online.get(a.email);
      return {
        email: a.email,
        name: a.fullName,
        nickname: a.nickname,
        role: a.role,
        ...(a.tier ? { tier: a.tier } : {}),
        ...(a.secondaryTiers?.length
          ? { secondaryTiers: a.secondaryTiers }
          : {}),
        status: player?.status ?? 'offline',
        appearance: player?.appearance ?? null,
        map: player?.map ?? null,
      };
    });
    // Quem está online sem conta (ex.: sessão antiga) também aparece.
    const known = new Set(accounts.map((a) => a.email));
    for (const [email, p] of online) {
      if (known.has(email)) continue;
      people.push({
        email,
        name: p.name,
        nickname: '',
        role: '',
        status: p.status,
        appearance: p.appearance,
        map: p.map,
      });
    }
    // Offline: a aparência guardada no perfil.
    const missing = people.filter((p) => !p.appearance).map((p) => p.email);
    await Promise.all(
      missing.map(async (email) => {
        const profile = await this.deps.profiles.get(email);
        const person = people.find((p) => p.email === email)!;
        person.appearance = profile?.appearance ?? null;
      }),
    );
    return sortPeople(people);
  }

  private async effectiveTiers(claims: SessionClaims): Promise<AccountTier[]> {
    const account = await this.deps.accounts.byEmail(claims.email);
    const primary = account?.tier ?? (claims.admin ? 'admin' : 'tester');
    return effectiveTiersOf(primary, account?.secondaryTiers);
  }

  /** Grava onde a pessoa está, para ela voltar ao mesmo lugar ao entrar de novo. */
  private async savePosition(): Promise<void> {
    const player = this.deps.office.players.get(this.deps.id);
    if (!player || !this.claims) return;
    this.savedAt = this.now();
    await this.deps.profiles.setPosition(this.claims.email, {
      map: player.map,
      x: player.x,
      y: player.y,
    });
  }

  /** Avisa todo mundo da mudança numa mesinha, ou só quem pediu do erro. */
  private async announceDesk(result: Result<DeskInfo>): Promise<void> {
    if (!result.ok) {
      return this.deps.send({ type: 'deskError', code: result.error });
    }
    this.deps.office.setDeskLock(result.value);
    await this.deps.cluster.dispatch(this.deps.id, [
      { to: 'all', message: { type: 'desk', desk: result.value } },
    ]);
  }

  private async join(sessionToken: string): Promise<void> {
    const claims = await this.deps.auth.authenticate(sessionToken);
    if (!claims) return this.deps.close(4401, 'unauthorized');
    this.claims = claims;
    await this.activate(claims);
  }

  private async activate(claims: SessionClaims): Promise<void> {
    const { id, office, cluster, chat, profiles } = this.deps;
    this.state = 'joining';

    const hadOther = (await this.deps.claimSession?.(claims.email)) ?? false;

    await profiles.touch(claims.email, claims.name, this.now());
    const profile = await profiles.get(claims.email);
    office.replaceRemote(await cluster.remotePlayers());

    this.deps.attach();
    const outgoing = office.join(
      id,
      claims.name,
      claims.email,
      profile?.appearance ?? defaultAppearance(claims.email),
      profile?.position,
    );
    this.state = 'joined';

    const tiers = await this.effectiveTiers(claims);
    this.deps.send({
      type: 'channels',
      channels: await chat.channelsFor(claims.email, tiers),
    });
    this.deps.send({
      type: 'history',
      messages: await chat.history(claims.email, tiers),
    });
    this.deps.send({ type: 'desks', desks: await this.deps.desks.list() });
    await cluster.dispatch(id, outgoing);
    await cluster.playerChanged(office.players.get(id)!);
    if (hadOther) {
      this.deps.send({ type: 'multiDeviceNotice', activeElsewhere: true });
    }
    // A pessoa mudou nome ou cargo na conta: a mesa dela mostra os novos para todos.
    const desk = await this.deps.desks.syncOwner({
      email: claims.email,
      name: office.players.get(id)!.name,
      role: claims.role,
    });
    if (desk) {
      await cluster.dispatch(id, [
        { to: 'all', message: { type: 'desk', desk } },
      ]);
    }
  }

  private async handleJoined(
    claims: SessionClaims,
    message: Exclude<ClientMessage, { type: 'join' }>,
  ): Promise<void> {
    const { id, office, cluster, chat, media, profiles, send } = this.deps;
    const player = office.players.get(id);
    if (!player) return;

    switch (message.type) {
      case 'move': {
        await cluster.dispatch(id, office.move(id, message.x, message.y));
        if (this.now() - this.savedAt >= POSITION_SAVE_MS) {
          await this.savePosition();
        }
        return;
      }
      case 'status':
        return cluster.dispatch(id, office.setStatus(id, message.status));
      case 'emote':
        return cluster.dispatch(id, office.emote(id, message.emote));

      case 'appearance': {
        await profiles.setAppearance(claims.email, message.appearance);
        return cluster.dispatch(
          id,
          office.setAppearance(id, message.appearance),
        );
      }

      case 'chat': {
        const tiers = await this.effectiveTiers(claims);
        const result = await chat.send(
          {
            email: claims.email,
            name: player.name,
            color: player.color,
            tier: tiers[0] ?? 'tester',
            tiers,
          },
          message.channel,
          message.text,
          message.threadId,
        );
        if (!result.ok) {
          // Restrição automática no chat (mute por abuso/ódio): remove a mesa do usuário.
          if (result.error === 'chat_muted') {
            const freed = await this.deps.desks.releaseByOwner(claims.email);
            if (freed) {
              this.deps.office.setDeskLock(freed);
              await cluster.dispatch(id, [
                { to: 'all', message: { type: 'desk', desk: freed } },
              ]);
            }
          }
          return send({ type: 'chatError', code: result.error });
        }
        if (result.value.warning) {
          send({ type: 'chatError', code: result.value.warning });
        }
        let recipients = result.value.emails;
        if (!recipients && result.value.restrictedAccess) {
          const accessRule = result.value.restrictedAccess;
          const onlineEmails = [
            ...new Set(
              office
                .everyone()
                .map((p) => p.email)
                .filter((e): e is string => Boolean(e)),
            ),
          ];
          const allowed: string[] = [];
          await Promise.all(
            onlineEmails.map(async (email) => {
              const acc = await this.deps.accounts.byEmail(email);
              const accTiers = effectiveTiersOf(
                acc?.tier ?? 'tester',
                acc?.secondaryTiers,
              );
              if (canViewChannel(accessRule, accTiers, email)) {
                allowed.push(email);
              }
            }),
          );
          if (!allowed.includes(claims.email)) allowed.push(claims.email);
          recipients = allowed;
        }
        return cluster.dispatch(id, [
          {
            to: 'all',
            message: { type: 'chat', message: result.value.message },
            ...(recipients ? { emails: recipients } : {}),
          },
        ]);
      }

      case 'editChat': {
        const tiers = await this.effectiveTiers(claims);
        const result = await chat.editMessage(
          {
            email: claims.email,
            name: player.name,
            color: player.color,
            tier: tiers[0] ?? 'tester',
            tiers,
          },
          message.channel,
          message.messageId,
          message.text,
        );
        if (!result.ok) return send({ type: 'chatError', code: result.error });
        const recipients = await this.chatRecipients(
          claims.email,
          result.value.emails,
          result.value.restrictedAccess,
        );
        return cluster.dispatch(id, [
          {
            to: 'all',
            message: { type: 'chatUpdated', message: result.value.message },
            ...(recipients ? { emails: recipients } : {}),
          },
        ]);
      }

      case 'deleteChat': {
        const tiers = await this.effectiveTiers(claims);
        const result = await chat.deleteMessage(
          {
            email: claims.email,
            name: player.name,
            color: player.color,
            tier: tiers[0] ?? 'tester',
            tiers,
          },
          message.channel,
          message.messageId,
        );
        if (!result.ok) return send({ type: 'chatError', code: result.error });
        const recipients = await this.chatRecipients(
          claims.email,
          result.value.emails,
          result.value.restrictedAccess,
        );
        return cluster.dispatch(id, [
          {
            to: 'all',
            message: { type: 'chatUpdated', message: result.value.message },
            ...(recipients ? { emails: recipients } : {}),
          },
        ]);
      }

      case 'typing': {
        const tiers = await this.effectiveTiers(claims);
        const result = await chat.typingTargets(
          claims.email,
          message.channel,
          tiers,
        );
        if (!result.ok) return;
        const recipients = await this.chatRecipients(
          claims.email,
          result.value.emails,
          result.value.restrictedAccess,
        );
        return cluster.dispatch(id, [
          {
            to: 'others',
            message: {
              type: 'typing',
              channel: message.channel,
              userId: claims.email,
              name: player.name,
              typing: message.typing,
            },
            ...(recipients ? { emails: recipients } : {}),
          },
        ]);
      }

      case 'thread': {
        const tiers = await this.effectiveTiers(claims);
        const result = await chat.thread(claims.email, message.threadId, tiers);
        if (!result.ok) return send({ type: 'chatError', code: result.error });
        return send({
          type: 'thread',
          threadId: message.threadId,
          messages: result.value,
        });
      }

      case 'markRead': {
        const tiers = await this.effectiveTiers(claims);
        await chat.markRead(claims.email, message.channel, tiers);
        return;
      }

      case 'channels': {
        const tiers = await this.effectiveTiers(claims);
        return send({
          type: 'channels',
          channels: await chat.channelsFor(claims.email, tiers),
        });
      }

      case 'createChannel': {
        const result = await chat.createChannel(claims.email, message.name);
        if (!result.ok) return send({ type: 'chatError', code: result.error });
        send({ type: 'channelOpened', channel: result.value });
        return cluster.dispatch(id, [
          { to: 'all', message: { type: 'channelsChanged' } },
        ]);
      }

      case 'archiveChannel': {
        const tiers = await this.effectiveTiers(claims);
        const result = await chat.archiveChannel(
          claims.email,
          message.id,
          claims.admin || canManageServer(tiers),
        );
        if (!result.ok) return send({ type: 'chatError', code: result.error });
        return cluster.dispatch(id, [
          { to: 'all', message: { type: 'channelsChanged' } },
        ]);
      }

      case 'openDm': {
        const result = await chat.openDirect(claims.email, message.email);
        if (!result.ok) return send({ type: 'chatError', code: result.error });
        send({ type: 'channelOpened', channel: result.value });
        const emails = result.value.members.map((m) => m.email);
        return cluster.dispatch(id, [
          { to: 'others', message: { type: 'channelsChanged' }, emails },
        ]);
      }

      case 'deskAdopt': {
        const result = await this.deps.desks.adopt(
          { email: claims.email, name: player.name, role: claims.role },
          player,
          message.deskId,
        );
        return this.announceDesk(result);
      }

      case 'deskRelease': {
        const tiers = await this.effectiveTiers(claims);
        const result = await this.deps.desks.release(
          { email: claims.email, admin: claims.admin || canManageDesks(tiers) },
          player.map,
          message.deskId,
        );
        return this.announceDesk(result);
      }

      case 'deskConfig': {
        const result = await this.deps.desks.configure(
          claims.email,
          player.map,
          message.deskId,
          message.config,
        );
        return this.announceDesk(result);
      }

      case 'deskMove': {
        const occupied = office
          .playersIn(player.map)
          .map((p) => ({ x: p.x, y: p.y }));
        const result = await this.deps.desks.move(
          claims.email,
          player.map,
          message.deskId,
          message.col,
          message.row,
          occupied,
        );
        return this.announceDesk(result);
      }

      case 'people':
        return send({ type: 'people', people: await this.people() });

      case 'directory': {
        const people = (await chat.directory()).map(({ email, name }) => ({
          email,
          name,
        }));
        return send({ type: 'directory', people });
      }

      case 'media': {
        // Nos status indisponíveis (Ocupado, Tomando um café ou Almoçando) o usuário não entra em chamadas.
        if (isUnavailableStatus(player.status)) {
          return send({ type: 'mediaNone' });
        }
        // Cada zona (mesa ou sala de reunião) tem a sua chamada.
        // Na estrada, só conversa quem está perto; sozinho, nenhuma.
        const zone = callKey(
          office.mapOf(player.map),
          player,
          office.playersIn(player.map),
        );
        if (!zone) return send({ type: 'mediaNone' });
        const access = await media.accessFor(
          id,
          player.name,
          callRoomName(player.map, zone),
        );
        return send(
          access
            ? { type: 'media', zone, url: access.url, token: access.token }
            : { type: 'mediaUnavailable' },
        );
      }
    }
  }

  private async chatRecipients(
    senderEmail: string,
    emails?: string[],
    restrictedAccess?: Parameters<typeof canViewChannel>[0],
  ): Promise<string[] | undefined> {
    if (emails || !restrictedAccess) return emails;
    const onlineEmails = [
      ...new Set(
        this.deps.office
          .everyone()
          .map((p) => p.email)
          .filter((e): e is string => Boolean(e)),
      ),
    ];
    const allowed: string[] = [];
    await Promise.all(
      onlineEmails.map(async (email) => {
        const acc = await this.deps.accounts.byEmail(email);
        const accTiers = effectiveTiersOf(
          acc?.tier ?? 'tester',
          acc?.secondaryTiers,
        );
        if (canViewChannel(restrictedAccess, accTiers, email)) {
          allowed.push(email);
        }
      }),
    );
    if (!allowed.includes(senderEmail)) allowed.push(senderEmail);
    return allowed;
  }
}
