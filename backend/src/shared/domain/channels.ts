import { normalizeEmail } from './auth.js';

const DM_PREFIX = 'dm:';

/** Id da conversa direta entre duas pessoas: igual não importa quem abre. */
export const dmChannelId = (emailA: string, emailB: string): string =>
  DM_PREFIX + [normalizeEmail(emailA), normalizeEmail(emailB)].sort().join('|');

export const isDmChannel = (channel: string): boolean =>
  channel.startsWith(DM_PREFIX);

/** As duas pessoas de uma conversa direta, ou null se o id não for de uma. */
export const dmMembers = (channel: string): [string, string] | null => {
  if (!isDmChannel(channel)) return null;
  const parts = channel.slice(DM_PREFIX.length).split('|');
  return parts.length === 2 && parts[0] && parts[1]
    ? [parts[0], parts[1]]
    : null;
};

/** Parte do e-mail antes do @, usada em menções: `@bruno.dias`. */
export const emailHandle = (email: string): string =>
  normalizeEmail(email).split('@')[0] ?? '';

const MENTION = /(^|[\s(])@([a-z0-9][a-z0-9._-]{1,40})/gi;

/** Nomes citados com @ no texto, em minúsculas e sem repetir. */
export const extractMentionHandles = (text: string): string[] => {
  const handles = new Set<string>();
  for (const match of text.matchAll(MENTION)) {
    handles.add(match[2]!.toLowerCase().replace(/[._-]+$/, ''));
  }
  return [...handles];
};
