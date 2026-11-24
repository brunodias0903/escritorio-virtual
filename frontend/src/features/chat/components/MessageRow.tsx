import { useState, type FormEvent } from 'react';

import { FaceAvatar } from '@/features/office/components/FaceAvatar';
import { usePeopleStore } from '@/features/office/model/peopleStore';
import { defaultAppearance, type ChatMessage } from '@/shared/domain';
import { formatTime } from '@/shared/lib/formatTime';

import { parseMessageParts } from '../model/richText';
import styles from './MessageRow.module.css';

type Props = {
  message: ChatMessage;
  showHeader: boolean;
  /** E-mail de quem está usando o app, para alinhar à direita e destacar menções. */
  me: string | null;
  /** Mostra o botão de respostas (fora da tela de conversa). */
  onOpenThread?: (rootId: string) => void;
  onEdit?: (messageId: string, text: string) => void;
  onDelete?: (messageId: string) => void;
};

export function MessageRow({
  message,
  showHeader,
  me,
  onOpenThread,
  onEdit,
  onDelete,
}: Props) {
  const isMine = me !== null && message.authorId === me;
  const mentionsMe = me !== null && message.mentions.includes(me);
  const isDeleted = Boolean(message.deletedAt);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text);
  const senderAppearance = usePeopleStore(
    (s) => s.people.find((p) => p.email === message.authorId)?.appearance,
  );
  const avatarAppearance =
    senderAppearance ?? defaultAppearance(message.authorId);

  const submitEdit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || !onEdit) return;
    if (trimmed !== message.text) {
      onEdit(message.id, trimmed);
    }
    setEditing(false);
  };

  const avatarNode = showHeader ? (
    <div className={styles.avatar} aria-hidden="true">
      <FaceAvatar appearance={avatarAppearance} size={30} />
    </div>
  ) : (
    <div className={styles.avatarSpace} />
  );

  return (
    <div
      className={`${styles.row} ${isMine ? styles.rowMine : styles.rowOther} ${showHeader ? styles.rowWithHeader : ''} ${mentionsMe ? styles.rowMentioned : ''}`}
    >
      {!isMine ? avatarNode : null}

      <div className={`${styles.bubble} ${isMine ? styles.bubbleMine : ''}`}>
        {showHeader ? (
          <div className={`${styles.meta} ${isMine ? styles.metaMine : ''}`}>
            <span className={styles.author}>
              {isMine ? 'Você' : message.author}
            </span>
            <span>{formatTime(message.at)}</span>
            {message.editedAt && !isDeleted ? (
              <span className={styles.editedTag}>(editada)</span>
            ) : null}
          </div>
        ) : message.editedAt && !isDeleted ? (
          <div className={styles.meta}>
            <span className={styles.editedTag}>(editada)</span>
          </div>
        ) : null}

        {isDeleted ? (
          <p className={styles.deletedText}>🚫 Mensagem apagada</p>
        ) : editing ? (
          <form className={styles.editForm} onSubmit={submitEdit}>
            <input
              type="text"
              className={styles.editInput}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setDraft(message.text);
                  setEditing(false);
                }
              }}
              autoFocus
              aria-label="Editar mensagem"
            />
            <div className={styles.editActions}>
              <button type="submit" className={styles.editSaveBtn}>
                Salvar
              </button>
              <button
                type="button"
                className={styles.editCancelBtn}
                onClick={() => {
                  setDraft(message.text);
                  setEditing(false);
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
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
                  className={
                    part.kind === 'mention' ? styles.mention : undefined
                  }
                >
                  {part.text}
                </span>
              ),
            )}
          </p>
        )}

        <div className={styles.footerRow}>
          {onOpenThread && !isDeleted ? (
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

          {isMine && !isDeleted && !editing && (onEdit || onDelete) ? (
            <div className={styles.msgActions}>
              {onEdit ? (
                <button
                  type="button"
                  className={styles.msgActionBtn}
                  onClick={() => {
                    setDraft(message.text);
                    setEditing(true);
                  }}
                >
                  Editar
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  className={`${styles.msgActionBtn} ${styles.msgActionDanger}`}
                  onClick={() => onDelete(message.id)}
                >
                  Apagar para todos
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {isMine ? avatarNode : null}
    </div>
  );
}
