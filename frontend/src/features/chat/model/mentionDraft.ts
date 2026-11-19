import { emailHandle } from '@/shared/domain';

/**
 * A palavra com @ que a pessoa está digitando no fim do texto, ou null.
 * Ex.: "oi @bru" → "bru". "oi @" → "". "e-mail a@b" → null (não é menção).
 */
export const mentionQuery = (text: string): string | null => {
  const match = /(^|[\s(])@([^\s@]*)$/.exec(text);
  return match ? match[2]! : null;
};

/** Troca o "@parte" do fim do texto pela menção completa, com espaço depois. */
export const applyMention = (text: string, email: string): string =>
  text.replace(/@[^\s@]*$/, `@${emailHandle(email)} `);
