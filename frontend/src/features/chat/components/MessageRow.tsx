import type { ChatMessage } from '@/shared/domain';
import { toHexColor } from '@/shared/lib/color';
import { formatTime } from '@/shared/lib/formatTime';

import { parseMessageParts } from '../model/richText';
import styles from './MessageRow.module.css';

type Props = {
  message: ChatMessage;
  showHeader: boolean;
  /** E-mail de quem está usando o app, para destacar quem foi citado. */
  me: string | null;
  /** Mostra o botão de respostas (fora da tela de conversa). */
  onOpenThread?: (rootId: string) => void;
};

export function MessageRow({ message, showHeader, me, onOpenThread }: Props) {
  const mentionsMe = me !== null && message.mentions.includes(me);

  return (
    <div
      className={`${styles.row} ${showHeader ? styles.rowWithHeader : ''} ${mentionsMe ? styles.rowMentioned : ''}`}
    >
      {showHeader ? (
        <div
          className={styles.avatar}
          style={{ backgroundColor: toHexColor(message.color) }}
          aria-hidden="true"
        >
          <span className={styles.avatarText}>
            {message.author.charAt(0).toUpperCase()}
          </span>
        </div>
      ) : (
        <div className={styles.avatarSpace} />
      )}
      <div className={styles.body}>
        {showHeader ? (
          <div className={styles.meta}>
            <span className={styles.author}>{message.author}</span>
            <span>{formatTime(message.at)}</span>
          </div>
        ) : null}
        <p className={styles.text}>
          {parseMessageParts(message.text).map((part, index) =>
            part.kind === 'link' ? (
              <a
                key={index}
                href={part.href}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                {part.text}
              </a>
            ) : (
              <span
                key={index}
                className={part.kind === 'mention' ? styles.mention : undefined}
              >
                {part.text}
              </span>
            ),
          )}
        </p>
        {onOpenThread ? (
          <button
            type="button"
            className={styles.replies}
            onClick={() => onOpenThread(message.id)}
          >
            {message.replyCount > 0
              ? `💬 ${message.replyCount} ${message.replyCount === 1 ? 'resposta' : 'respostas'}`
              : '↩ Responder'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
