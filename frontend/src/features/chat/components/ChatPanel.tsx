import { useEffect, useRef } from 'react';

import { errorMessage, type ClientMessage } from '@/shared/domain';

import { channelTitle, useChatStore } from '../model/chatStore';
import { groupMessages } from '../model/groupMessages';
import { ChannelBar } from './ChannelBar';
import styles from './ChatPanel.module.css';
import { Composer } from './Composer';
import { MessageRow } from './MessageRow';

type Send = (message: Exclude<ClientMessage, { type: 'join' }>) => void;

type Props = {
  send: Send;
  /** Mostra o botão de fechar (layout estreito). */
  onClose?: () => void;
};

export function ChatPanel({ send, onClose }: Props) {
  const channels = useChatStore((s) => s.channels);
  const active = useChatStore((s) => s.active);
  const me = useChatStore((s) => s.me);
  const messages = useChatStore((s) => s.messages[s.active]);
  const thread = useChatStore((s) => s.thread);
  const error = useChatStore((s) => s.error);
  const setActive = useChatStore((s) => s.setActive);
  const openThread = useChatStore((s) => s.openThread);
  const closeThread = useChatStore((s) => s.closeThread);
  const setError = useChatStore((s) => s.setError);
  const listRef = useRef<HTMLDivElement>(null);

  const channel = channels.find((c) => c.id === active);
  const title = channel ? channelTitle(channel, me) : active;
  const prefix = channel?.kind === 'dm' ? '@' : '#';
  const rows = groupMessages(messages ?? []);
  const lastMessageId = messages?.[messages.length - 1]?.id;

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [active, lastMessageId, thread?.messages.length]);

  const select = (id: string) => {
    setError(null);
    setActive(id);
    send({ type: 'markRead', channel: id });
  };

  const startThread = (rootId: string) => {
    openThread(rootId);
    send({ type: 'thread', threadId: rootId });
  };

  return (
    <aside className={styles.panel} aria-label="Chat">
      <div className={styles.header}>
        <h2 className={styles.title}>
          {prefix} {title}
        </h2>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar chat"
            className={styles.close}
          >
            ✕
          </button>
        ) : null}
      </div>

      <ChannelBar
        onSelect={select}
        onCreateChannel={(name) => send({ type: 'createChannel', name })}
        onRequestPeople={() => send({ type: 'directory' })}
        onOpenDm={(email) => send({ type: 'openDm', email })}
      />

      {thread ? (
        <>
          <div className={styles.threadHeader}>
            <button type="button" onClick={closeThread} className={styles.back}>
              ← Voltar
            </button>
            <span className={styles.threadTitle}>Conversa</span>
          </div>
          <div ref={listRef} className={styles.messages}>
            {groupMessages(thread.messages).map((row) => (
              <MessageRow
                key={row.message.id}
                message={row.message}
                showHeader={row.showHeader}
                me={me}
              />
            ))}
          </div>
          <Composer
            placeholder="Responder…"
            onSend={(text) => {
              setError(null);
              send({
                type: 'chat',
                channel: active,
                text,
                threadId: thread.rootId,
              });
            }}
          />
        </>
      ) : (
        <>
          <div ref={listRef} className={styles.messages}>
            {rows.length === 0 ? (
              <p className={styles.empty}>
                Nenhuma mensagem em {title}. Comece a conversa.
              </p>
            ) : (
              rows.map((row) => (
                <MessageRow
                  key={row.message.id}
                  message={row.message}
                  showHeader={row.showHeader}
                  me={me}
                  onOpenThread={startThread}
                />
              ))
            )}
          </div>
          {error ? (
            <p className={styles.error} role="alert">
              {errorMessage(error)}
            </p>
          ) : null}
          <Composer
            placeholder={`Mensagem ${prefix}${title} (use @nome para citar)`}
            onSend={(text) => {
              setError(null);
              send({ type: 'chat', channel: active, text });
            }}
          />
        </>
      )}
    </aside>
  );
}
