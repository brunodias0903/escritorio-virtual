import { useAccessibilityStore } from '@/features/accessibility/accessibilityStore';
import { useChatStore } from '@/features/chat/model/chatStore';
import { useDeskStore } from '@/features/desks/model/deskStore';
import type { MediaAccess } from '@/features/media/model/callTypes';
import type { OfficeWorld } from '@/features/office/model/officeWorld';
import { usePeopleStore } from '@/features/office/model/peopleStore';
import {
  errorMessage,
  type AccountTier,
  type ClientMessage,
  type ServerMessage,
} from '@/shared/domain';

export type OfficeSend = (
  message: Exclude<ClientMessage, { type: 'join' }>,
) => void;

type MediaHandlers = {
  set: (access: MediaAccess | null) => void;
  setUnavailable: (unavailable: boolean) => void;
};

/** Roteia o que o servidor mandou para o mundo, o chat, as mesas, pessoas e chamada. */
export function routeServerMessage(
  message: ServerMessage,
  world: OfficeWorld,
  send: OfficeSend,
  media: MediaHandlers,
  notify: (text: string) => void,
  onDisplaced?: (displaced: boolean) => void,
  onModerated?: (
    action: 'banned' | 'kicked' | 'restricted' | 'removed',
    reason?: string,
  ) => void,
  onAccountUpdated?: (update: {
    tier: AccountTier;
    secondaryTiers: AccountTier[];
    admin: boolean;
    role: string;
  }) => void,
): void {
  const chat = useChatStore.getState();
  switch (message.type) {
    case 'desks':
      useDeskStore.getState().setAll(message.desks);
      world.setDesks(message.desks);
      break;
    case 'desk':
      useDeskStore.getState().upsert(message.desk);
      world.upsertDesk(message.desk);
      break;
    case 'deskError':
      notify(errorMessage(message.code));
      break;
    case 'chat':
      if (chat.receive(message.message) === 'unknown-channel') {
        send({ type: 'channels' });
      }
      if (
        useAccessibilityStore.getState().prefs.visualAlerts &&
        message.message.authorId !== chat.me
      ) {
        notify(`Nova mensagem de ${message.message.author} no chat.`);
      }
      break;
    case 'chatUpdated':
      chat.updateMessage(message.message);
      break;
    case 'typing':
      chat.setTyping(
        message.channel,
        message.userId,
        message.name,
        message.typing,
      );
      break;
    case 'history':
      chat.setHistory(message.messages);
      break;
    case 'channels':
      chat.setChannels(message.channels);
      break;
    case 'channelsChanged':
      send({ type: 'channels' });
      break;
    case 'channelOpened':
      chat.addChannel(message.channel);
      chat.setActive(message.channel.id);
      send({ type: 'markRead', channel: message.channel.id });
      break;
    case 'thread':
      chat.setThread(message.threadId, message.messages);
      break;
    case 'directory':
      chat.setPeople(message.people);
      break;
    case 'chatError':
      chat.setError(message.code);
      break;
    case 'media':
      media.setUnavailable(false);
      media.set({
        url: message.url,
        token: message.token,
        zone: message.zone,
        map: world.map,
      });
      break;
    case 'mediaNone':
      media.set(null);
      break;
    case 'mediaUnavailable':
      media.setUnavailable(true);
      break;
    case 'people':
      usePeopleStore.getState().setPeople(message.people);
      break;
    case 'sessionDisplaced':
      media.set(null);
      onDisplaced?.(true);
      break;
    case 'multiDeviceNotice':
      if (message.activeElsewhere) {
        notify(
          'Sua conta está logada em mais de 1 dispositivo. O acesso pode ser movido a qualquer momento.',
        );
      }
      break;
    case 'accountModerated':
      media.set(null);
      onModerated?.(message.action, message.reason);
      break;
    case 'accountUpdated':
      onAccountUpdated?.({
        tier: message.tier,
        secondaryTiers: message.secondaryTiers,
        admin: message.admin,
        role: message.role,
      });
      send({ type: 'channels' });
      send({ type: 'people' });
      notify('Seus cargos e acessos neste servidor foram atualizados.');
      break;
    default:
      world.apply(message);
  }
}
