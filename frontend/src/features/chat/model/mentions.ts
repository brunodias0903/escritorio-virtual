export type TextPart = { text: string; mention: boolean };

const MENTION = /(^|[\s(])(@[a-z0-9][a-z0-9._-]{1,40})/gi;

/** Separa o texto em pedaços comuns e menções (`@nome`), para destacar as menções. */
export const splitMentions = (text: string): TextPart[] => {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(MENTION)) {
    const start = match.index + match[1]!.length;
    if (start > last)
      parts.push({ text: text.slice(last, start), mention: false });
    parts.push({ text: match[2]!, mention: true });
    last = start + match[2]!.length;
  }
  if (last < text.length)
    parts.push({ text: text.slice(last), mention: false });
  return parts;
};
