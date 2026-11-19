import type { ChatMessage } from '@/shared/domain';

/** Mensagens seguidas do mesmo autor, em até 5 minutos, ficam agrupadas. */
export const GROUP_WINDOW_MS = 5 * 60 * 1000;

export type MessageRow = { message: ChatMessage; showHeader: boolean };

export const groupMessages = (messages: ChatMessage[]): MessageRow[] =>
  messages.map((message, index) => {
    const previous = messages[index - 1];
    const showHeader =
      !previous ||
      previous.authorId !== message.authorId ||
      message.at - previous.at > GROUP_WINDOW_MS;
    return { message, showHeader };
  });
