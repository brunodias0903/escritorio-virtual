import { useEffect, useRef, useState, type FormEvent } from 'react';

import {
  canWriteInChannel,
  errorMessage,
  type AccountTier,
  type ClientMessage,
} from '@/shared/domain';
import { useI18n } from '@/shared/i18n';

import { channelTitle, useChatStore, type Person } from '../model/chatStore';
import { groupMessages } from '../model/groupMessages';
import { Composer } from './Composer';
import { MessageRow } from './MessageRow';
import styles from './SlackChatView.module.css';

type Send = (message: Exclude<ClientMessage, { type: 'join' }>) => void;

type Props = {
  send: Send;
  /** Quando true, exibe em 2 colunas (lista de canais à esquerda + mensagens amplas à direita). */
  expanded?: boolean;
  userTier?: AccountTier;
};

/**
 * Chat integrado na sidebar esquerda:
 * - modo compacto: lista colapsável de canais/DMs acima + conversa ativa abaixo;
 * - modo expandido: 2 colunas lado a lado (canais à esquerda, conversa ampla à direita).
 */
export function SlackChatView({
  send,
  expanded = false,
  userTier = 'tester',
}: Props) {
  const { t } = useI18n();
  const channels = useChatStore((s) => s.channels);
  const active = useChatStore((s) => s.active);
  const me = useChatStore((s) => s.me);
  const people = useChatStore((s) => s.people);
  const messages = useChatStore((s) => s.messages[s.active]);
  const thread = useChatStore((s) => s.thread);
  const error = useChatStore((s) => s.error);
  const setActive = useChatStore((s) => s.setActive);
  const openThread = useChatStore((s) => s.openThread);
  const closeThread = useChatStore((s) => s.closeThread);
  const setError = useChatStore((s) => s.setError);

  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [mode, setMode] = useState<'none' | 'channel' | 'person'>('none');
  const [newChannel, setNewChannel] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const publicChannels = channels.filter((c) => c.kind === 'public');
  const dmChannels = channels.filter((c) => c.kind === 'dm');
  const channel = channels.find((c) => c.id === active);
  const title = channel ? channelTitle(channel, me) : active;
  const prefix = channel?.kind === 'dm' ? '@' : '#';
  const rows = groupMessages(messages ?? []);
  const lastMessageId = messages?.[messages.length - 1]?.id;
  const others: Person[] = people.filter((p) => p.email !== me);

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [active, lastMessageId, thread?.messages.length]);

  const select = (id: string) => {
    setError(null);
    setActive(id);
    send({ type: 'markRead', channel: id });
  };

  const toggleCreate = (next: 'channel' | 'person') => {
    const opening = mode !== next;
    setMode(opening ? next : 'none');
    if (opening && next === 'person') send({ type: 'directory' });
  };

  const submitChannel = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newChannel.trim()) return;
    send({ type: 'createChannel', name: newChannel.trim() });
    setNewChannel('');
    setMode('none');
  };

  const startThread = (rootId: string) => {
    openThread(rootId);
    send({ type: 'thread', threadId: rootId });
  };

  const showNav = expanded || drawerOpen;

  return (
    <div className={`${styles.root} ${expanded ? styles.rootExpanded : ''}`}>
      {/* Lista vertical de Canais e DMs estilo Slack */}
      <div
        className={`${styles.navBlock} ${expanded ? styles.navBlockExpanded : ''}`}
      >
        {!expanded ? (
          <button
            type="button"
            className={styles.navToggle}
            onClick={() => setDrawerOpen((prev) => !prev)}
            aria-expanded={drawerOpen}
          >
            <span>{drawerOpen ? '▾' : '▸'} Canais e conversas</span>
            <span className={styles.navCount}>{channels.length}</span>
          </button>
        ) : null}

        {showNav ? (
          <div
            className={`${styles.navScroll} ${expanded ? styles.navScrollExpanded : ''}`}
          >
            <div className={styles.sectionHeader}>
              <button
                type="button"
                className={styles.sectionToggle}
                onClick={() => setChannelsOpen((prev) => !prev)}
              >
                <span>{channelsOpen ? '▾' : '▸'}</span>
                <span>Canais</span>
              </button>
              <button
                type="button"
                className={styles.iconAdd}
                aria-label="Criar novo canal"
                title="Criar novo canal"
                onClick={() => toggleCreate('channel')}
              >
                +
              </button>
            </div>

            {mode === 'channel' ? (
              <form className={styles.inlineForm} onSubmit={submitChannel}>
                <input
                  type="text"
                  className={styles.inlineInput}
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                  placeholder="nome-do-canal"
                  autoCapitalize="none"
                  maxLength={30}
                  autoFocus
                  aria-label="Nome do novo canal"
                />
                <span className={styles.inlineHint}>
                  Minúsculas, números e hífen. Enter cria.
                </span>
              </form>
            ) : null}

            {channelsOpen ? (
              <div className={styles.list} role="tablist" aria-label="Canais">
                {publicChannels.map((item) => {
                  const isActive = item.id === active;
                  const bold = isActive || item.unread > 0;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => select(item.id)}
                      className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                    >
                      <span className={styles.hash}>#</span>
                      <span
                        className={`${styles.itemLabel} ${bold ? styles.itemBold : ''}`}
                      >
                        {channelTitle(item, me)}
                      </span>
                      {item.mentions > 0 ? (
                        <span
                          className={`${styles.badge} ${styles.badgeMention}`}
                        >
                          @{item.mentions}
                        </span>
                      ) : item.unread > 0 ? (
                        <span className={styles.badge}>{item.unread}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className={styles.sectionHeader}>
              <button
                type="button"
                className={styles.sectionToggle}
                onClick={() => setDmsOpen((prev) => !prev)}
              >
                <span>{dmsOpen ? '▾' : '▸'}</span>
                <span>Mensagens diretas</span>
              </button>
              <button
                type="button"
                className={styles.iconAdd}
                aria-label="Nova conversa direta"
                title="Nova conversa direta"
                onClick={() => toggleCreate('person')}
              >
                +
              </button>
            </div>

            {mode === 'person' ? (
              <div className={styles.picker}>
                {others.length === 0 ? (
                  <span className={styles.inlineHint}>
                    Ninguém mais entrou ainda.
                  </span>
                ) : (
                  others.map((person) => (
                    <button
                      key={person.email}
                      type="button"
                      className={styles.pickerRow}
                      onClick={() => {
                        send({ type: 'openDm', email: person.email });
                        setMode('none');
                      }}
                    >
                      <span className={styles.pickerName}>{person.name}</span>
                      <span className={styles.inlineHint}>{person.email}</span>
                    </button>
                  ))
                )}
              </div>
            ) : null}

            {dmsOpen ? (
              <div className={styles.list} aria-label="Mensagens diretas">
                {dmChannels.length === 0 ? (
                  <p className={styles.emptySmall}>
                    Nenhuma DM aberta. Clique em + para iniciar.
                  </p>
                ) : (
                  dmChannels.map((item) => {
                    const isActive = item.id === active;
                    const bold = isActive || item.unread > 0;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => select(item.id)}
                        className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                      >
                        <span className={styles.at}>@</span>
                        <span
                          className={`${styles.itemLabel} ${bold ? styles.itemBold : ''}`}
                        >
                          {channelTitle(item, me)}
                        </span>
                        {item.mentions > 0 ? (
                          <span
                            className={`${styles.badge} ${styles.badgeMention}`}
                          >
                            @{item.mentions}
                          </span>
                        ) : item.unread > 0 ? (
                          <span className={styles.badge}>{item.unread}</span>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Conversa ativa */}
      <div className={styles.chatArea}>
        <div className={styles.chatHeader}>
          {thread ? (
            <>
              <button
                type="button"
                onClick={closeThread}
                className={styles.back}
              >
                ← Voltar
              </button>
              <span className={styles.chatTitle}>
                Thread em {prefix}
                {title}
              </span>
            </>
          ) : (
            <span className={styles.chatTitle}>
              {prefix} {title}
            </span>
          )}
        </div>

        <div ref={listRef} className={styles.messages}>
          {thread ? (
            groupMessages(thread.messages).map((row) => (
              <MessageRow
                key={row.message.id}
                message={row.message}
                showHeader={row.showHeader}
                me={me}
              />
            ))
          ) : rows.length === 0 ? (
            <p className={styles.empty}>
              Nenhuma mensagem em {prefix}
              {title}. Comece a conversa!
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

        {channel?.kind === 'public' &&
        !canWriteInChannel(channel.writeTiers, userTier) ? (
          <div
            style={{
              padding: '10px 14px',
              fontSize: 12,
              color: 'var(--text-secondary)',
              background: 'var(--bg-surface)',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            🔒 {t('chat.readOnlyChannel', { channel: title })}
          </div>
        ) : (
          <Composer
            placeholder={
              thread
                ? 'Responder na thread…'
                : `Mensagem em ${prefix}${title} (@ para citar)`
            }
            onSend={(text) => {
              setError(null);
              send({
                type: 'chat',
                channel: active,
                text,
                ...(thread ? { threadId: thread.rootId } : {}),
              });
            }}
          />
        )}
      </div>
    </div>
  );
}
