import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from 'react';

import { workspaceApi } from '@/app/api';
import {
  ACCOUNT_TIERS,
  canManageServer,
  canWriteInChannel,
  errorMessage,
  type AccountTier,
  type ChannelInfo,
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
  /**
   * Define o escopo visível:
   * - `channels`: apenas canais do servidor (aba do ícone do servidor)
   * - `dms`: apenas mensagens diretas (aba do botão de mensagens)
   * - `all`: ambos (usado no shell mobile)
   */
  section?: 'channels' | 'dms' | 'all';
  /** Quando true, exibe em 2 colunas (lista de canais à esquerda + mensagens amplas à direita). */
  expanded?: boolean;
  userTier?: AccountTier;
  userTiers?: readonly AccountTier[];
  /** Token da sessão (usado por administradores para reordenar canais). */
  token?: string;
  onNotify?: (text: string) => void;
};

const isRestrictedChannel = (item: ChannelInfo): boolean =>
  (item.viewTiers !== undefined &&
    item.viewTiers.length > 0 &&
    !ACCOUNT_TIERS.every((tier) => item.viewTiers!.includes(tier))) ||
  (item.blockedEmails?.length ?? 0) > 0;

/**
 * Chat integrado na sidebar esquerda:
 * - modo compacto: lista colapsável acima + conversa ativa abaixo;
 * - modo expandido: 2 colunas lado a lado (lista à esquerda, conversa ampla à direita).
 */
export function SlackChatView({
  send,
  section = 'all',
  expanded = false,
  userTier = 'tester',
  userTiers,
  token,
  onNotify,
}: Props) {
  const { t } = useI18n();
  const channels = useChatStore((s) => s.channels);
  const active = useChatStore((s) => s.active);
  const me = useChatStore((s) => s.me);
  const people = useChatStore((s) => s.people);
  const allMessages = useChatStore((s) => s.messages);
  const typingByChannel = useChatStore((s) => s.typingByChannel);
  const thread = useChatStore((s) => s.thread);
  const error = useChatStore((s) => s.error);
  const setActive = useChatStore((s) => s.setActive);
  const reorderPublicChannels = useChatStore((s) => s.reorderPublicChannels);
  const openThread = useChatStore((s) => s.openThread);
  const closeThread = useChatStore((s) => s.closeThread);
  const setError = useChatStore((s) => s.setError);

  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [mode, setMode] = useState<'none' | 'channel' | 'person'>('none');
  const [newChannel, setNewChannel] = useState('');
  const [dragChannelId, setDragChannelId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    item: ChannelInfo;
    x: number;
    y: number;
  } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const effectiveTiers = userTiers ?? [userTier];
  const canReorder = Boolean(token) && canManageServer(effectiveTiers);

  const publicChannels = channels.filter((c) => c.kind === 'public');
  const lastDmAt = (channelId: string): number => {
    const list = allMessages[channelId];
    return list?.[list.length - 1]?.at ?? 0;
  };
  const dmChannels = [...channels.filter((c) => c.kind === 'dm')].sort(
    (a, b) => lastDmAt(b.id) - lastDmAt(a.id),
  );
  const showChannels = section === 'all' || section === 'channels';
  const showDms = section === 'all' || section === 'dms';

  const sectionChannels =
    section === 'channels'
      ? publicChannels
      : section === 'dms'
        ? dmChannels
        : channels;

  const channel = sectionChannels.find((c) => c.id === active) ?? null;
  const activeId = channel?.id ?? null;
  const messages = activeId ? allMessages[activeId] : undefined;
  const title = channel ? channelTitle(channel, me) : '';
  const prefix = channel?.kind === 'dm' ? '@' : '#';
  const rows = groupMessages(messages ?? []);
  const lastMessageId = messages?.[messages.length - 1]?.id;
  const others: Person[] = people.filter((p) => p.email !== me);

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [activeId, lastMessageId, thread?.messages.length]);

  useEffect(() => {
    if (mode === 'none') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMode('none');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [contextMenu]);

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

  const commitOrder = async (nextIds: string[]) => {
    if (!token || reordering) return;
    const prevIds = publicChannels.map((c) => c.id);
    if (prevIds.join('|') === nextIds.join('|')) return;
    reorderPublicChannels(nextIds);
    setReordering(true);
    const res = await workspaceApi.reorderChannels(token, {
      channelIds: nextIds,
    });
    setReordering(false);
    if (!res.ok) {
      reorderPublicChannels(prevIds);
      setError(res.error);
      return;
    }
    onNotify?.(t('server.channels.reordered'));
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, id: string) => {
    if (!canReorder) return;
    setDragChannelId(id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>, id: string) => {
    if (!canReorder || !dragChannelId || dragChannelId === id) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dropTargetId !== id) setDropTargetId(id);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault();
    const sourceId = dragChannelId || event.dataTransfer.getData('text/plain');
    setDragChannelId(null);
    setDropTargetId(null);
    if (!canReorder || !sourceId || sourceId === targetId) return;
    const ids = publicChannels.map((c) => c.id);
    const fromIdx = ids.indexOf(sourceId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = ids.splice(fromIdx, 1);
    if (!moved) return;
    ids.splice(toIdx, 0, moved);
    void commitOrder(ids);
  };

  const startThread = (rootId: string) => {
    if (activeId && activeId !== active) setActive(activeId);
    openThread(rootId);
    send({ type: 'thread', threadId: rootId });
  };

  const hasOuterToggle = !expanded && section === 'all';
  const showNav = !hasOuterToggle || drawerOpen;

  const canSendInActive =
    !channel ||
    channel.kind !== 'public' ||
    canWriteInChannel(
      channel.writeTiers,
      effectiveTiers,
      channel,
      me ?? undefined,
    );

  const typingUsers = activeId
    ? Object.entries(typingByChannel[activeId] ?? {})
        .filter(([email]) => email !== me)
        .map(([, info]) => info.name)
    : [];

  return (
    <div className={`${styles.root} ${expanded ? styles.rootExpanded : ''}`}>
      {/* Lista vertical de Canais ou DMs */}
      <div
        className={`${styles.navBlock} ${expanded ? styles.navBlockExpanded : ''}`}
      >
        {hasOuterToggle ? (
          <button
            type="button"
            className={styles.navToggle}
            onClick={() => setDrawerOpen((prev) => !prev)}
            aria-expanded={drawerOpen}
          >
            <span>{drawerOpen ? '▾' : '▸'} Canais e conversas</span>
            <span className={styles.navCount}>{sectionChannels.length}</span>
          </button>
        ) : null}

        {showNav ? (
          <div
            className={`${styles.navScroll} ${expanded ? styles.navScrollExpanded : ''}`}
          >
            {showChannels ? (
              <>
                <div className={styles.sectionHeader}>
                  <button
                    type="button"
                    className={styles.sectionToggle}
                    aria-expanded={channelsOpen}
                    onClick={() => setChannelsOpen((prev) => !prev)}
                  >
                    <span>{channelsOpen ? '▾' : '▸'}</span>
                    <span>Canais</span>
                    <span className={styles.navCount}>
                      {publicChannels.length}
                    </span>
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
                  <div
                    className={styles.list}
                    role="tablist"
                    aria-label="Canais do servidor"
                  >
                    {publicChannels.length === 0 ? (
                      <p className={styles.emptySmall}>
                        Nenhum canal disponível para o seu cargo.
                      </p>
                    ) : (
                      publicChannels.map((item) => {
                        const isActive = item.id === activeId;
                        const bold = isActive || item.unread > 0;
                        const restricted = isRestrictedChannel(item);
                        const isDragging = dragChannelId === item.id;
                        const isDropTarget = dropTargetId === item.id;
                        return (
                          <div
                            key={item.id}
                            draggable={canReorder}
                            onDragStart={(e) => handleDragStart(e, item.id)}
                            onDragOver={(e) => handleDragOver(e, item.id)}
                            onDragLeave={() => {
                              if (dropTargetId === item.id) {
                                setDropTargetId(null);
                              }
                            }}
                            onDrop={(e) => handleDrop(e, item.id)}
                            onDragEnd={() => {
                              setDragChannelId(null);
                              setDropTargetId(null);
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenu({
                                item,
                                x: e.clientX,
                                y: e.clientY,
                              });
                            }}
                            className={`${styles.channelRow} ${isDragging ? styles.channelRowDragging : ''} ${isDropTarget ? styles.channelRowDropTarget : ''}`}
                          >
                            <button
                              type="button"
                              role="tab"
                              aria-selected={isActive}
                              onClick={() => select(item.id)}
                              className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                            >
                              {canReorder ? (
                                <span
                                  className={styles.dragGrip}
                                  aria-hidden="true"
                                  title="Arraste para reordenar"
                                >
                                  ⋮⋮
                                </span>
                              ) : null}
                              <span className={styles.hash}>
                                {restricted ? '🔒' : '#'}
                              </span>
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
                                <span className={styles.badge}>
                                  {item.unread}
                                </span>
                              ) : null}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </>
            ) : null}

            {showChannels && showDms ? (
              <div className={styles.sectionDivider} role="separator" />
            ) : null}

            {showDms ? (
              <>
                <div className={styles.sectionHeader}>
                  <button
                    type="button"
                    className={styles.sectionToggle}
                    aria-expanded={dmsOpen}
                    onClick={() => setDmsOpen((prev) => !prev)}
                  >
                    <span>{dmsOpen ? '▾' : '▸'}</span>
                    <span>Conversas diretas</span>
                    <span className={styles.navCount}>{dmChannels.length}</span>
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
                          <span className={styles.pickerName}>
                            {person.name}
                          </span>
                          <span className={styles.inlineHint}>
                            {person.email}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}

                {dmsOpen ? (
                  <div
                    className={styles.list}
                    role="tablist"
                    aria-label="Conversas diretas"
                  >
                    {dmChannels.length === 0 ? (
                      <p className={styles.emptySmall}>
                        Nenhuma DM aberta. Clique em + para iniciar.
                      </p>
                    ) : (
                      dmChannels.map((item) => {
                        const isActive = item.id === activeId;
                        const bold = isActive || item.unread > 0;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => select(item.id)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenu({
                                item,
                                x: e.clientX,
                                y: e.clientY,
                              });
                            }}
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
                              <span className={styles.badge}>
                                {item.unread}
                              </span>
                            ) : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Conversa ativa */}
      <div className={styles.chatArea}>
        {channel ? (
          <>
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
                <div className={styles.chatHeaderMeta}>
                  <span className={styles.chatTitle}>
                    {channel.kind === 'public' && isRestrictedChannel(channel)
                      ? '🔒'
                      : prefix}{' '}
                    {title}
                  </span>
                  {channel.topic ? (
                    <span className={styles.chatTopic}>{channel.topic}</span>
                  ) : null}
                </div>
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
                    onEdit={(messageId, text) =>
                      activeId &&
                      send({
                        type: 'editChat',
                        channel: activeId,
                        messageId,
                        text,
                      })
                    }
                    onDelete={(messageId) =>
                      activeId &&
                      send({
                        type: 'deleteChat',
                        channel: activeId,
                        messageId,
                      })
                    }
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
                    onEdit={(messageId, text) =>
                      activeId &&
                      send({
                        type: 'editChat',
                        channel: activeId,
                        messageId,
                        text,
                      })
                    }
                    onDelete={(messageId) =>
                      activeId &&
                      send({
                        type: 'deleteChat',
                        channel: activeId,
                        messageId,
                      })
                    }
                  />
                ))
              )}
            </div>

            {typingUsers.length > 0 ? (
              <div
                className={styles.typingBar}
                role="status"
                aria-live="polite"
              >
                <span>
                  {typingUsers.length === 1
                    ? `${typingUsers[0]} está digitando`
                    : `${typingUsers.slice(0, 2).join(', ')} estão digitando`}
                </span>
                <span className={styles.typingDots} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            ) : null}

            {error ? (
              <p className={styles.error} role="alert">
                {errorMessage(error)}
              </p>
            ) : null}

            {!canSendInActive ? (
              <div className={styles.readOnlyNotice}>
                🔒 {t('chat.readOnlyChannel', { channel: title })}
              </div>
            ) : (
              <Composer
                placeholder={
                  thread
                    ? 'Responder na thread…'
                    : `Mensagem em ${prefix}${title} (@ para citar)`
                }
                onTyping={(typing) => {
                  if (!activeId) return;
                  send({ type: 'typing', channel: activeId, typing });
                }}
                onSend={(text) => {
                  if (!activeId) return;
                  setError(null);
                  send({
                    type: 'chat',
                    channel: activeId,
                    text,
                    ...(thread ? { threadId: thread.rootId } : {}),
                  });
                }}
              />
            )}
          </>
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.empty}>
              {section === 'dms'
                ? 'Selecione uma conversa direta para visualizar as mensagens.'
                : 'Selecione um canal ou conversa direta para visualizar as mensagens.'}
            </p>
            {section === 'dms' || dmChannels.length === 0 ? (
              <button
                type="button"
                className={styles.emptyActionBtn}
                onClick={() => {
                  setDrawerOpen(true);
                  setDmsOpen(true);
                  toggleCreate('person');
                }}
              >
                + Nova conversa direta
              </button>
            ) : null}
          </div>
        )}
      </div>
      {contextMenu ? (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
          aria-label="Opções da conversa"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            className={styles.contextMenuItem}
            onClick={() => {
              send({ type: 'markRead', channel: contextMenu.item.id });
              setContextMenu(null);
            }}
          >
            Marcar como lido
          </button>
          {contextMenu.item.kind === 'dm' ||
          (canReorder && contextMenu.item.id !== 'geral') ? (
            <button
              type="button"
              role="menuitem"
              className={`${styles.contextMenuItem} ${styles.contextMenuDanger}`}
              onClick={() => {
                send({ type: 'archiveChannel', id: contextMenu.item.id });
                if (active === contextMenu.item.id) setActive('');
                setContextMenu(null);
              }}
            >
              {contextMenu.item.kind === 'dm'
                ? 'Apagar conversa'
                : 'Apagar canal'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
