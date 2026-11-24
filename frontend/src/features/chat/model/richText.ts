import { splitMentions } from './mentions';

export type MessagePart =
  | { kind: 'text'; text: string }
  | { kind: 'mention'; text: string }
  | { kind: 'link'; text: string; href: string };

const URL_RE = /(https?:\/\/[^\s<>"']+)/gi;
const TRAILING_PUNCT_RE = /[.,;:!?)]+$/;

/** Divide um texto de chat em trechos simples, `@menções` e links clicáveis (`http`/`https`). */
export const parseMessageParts = (text: string): MessagePart[] => {
  const parts: MessagePart[] = [];
  for (const seg of splitMentions(text)) {
    if (seg.mention) {
      parts.push({ kind: 'mention', text: seg.text });
      continue;
    }
    let last = 0;
    for (const match of seg.text.matchAll(URL_RE)) {
      const raw = match[0];
      const start = match.index ?? 0;
      if (start > last) {
        parts.push({ kind: 'text', text: seg.text.slice(last, start) });
      }
      const punct = TRAILING_PUNCT_RE.exec(raw)?.[0] ?? '';
      const cleanUrl = punct ? raw.slice(0, -punct.length) : raw;
      parts.push({ kind: 'link', text: cleanUrl, href: cleanUrl });
      if (punct) {
        parts.push({ kind: 'text', text: punct });
      }
      last = start + raw.length;
    }
    if (last < seg.text.length) {
      parts.push({ kind: 'text', text: seg.text.slice(last) });
    }
  }
  return parts;
};
