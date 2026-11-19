import { useState, type FormEvent } from 'react';

import { channelTitle, useChatStore, type Person } from '../model/chatStore';
import styles from './ChannelBar.module.css';

type Props = {
  onSelect: (channel: string) => void;
  onCreateChannel: (name: string) => void;
  onRequestPeople: () => void;
  onOpenDm: (email: string) => void;
};

/** Faixa de canais e conversas diretas, com contadores de não lidas. */
export function ChannelBar({
  onSelect,
  onCreateChannel,
  onRequestPeople,
  onOpenDm,
}: Props) {
  const channels = useChatStore((s) => s.channels);
  const active = useChatStore((s) => s.active);
  const me = useChatStore((s) => s.me);
  const people = useChatStore((s) => s.people);
  const [mode, setMode] = useState<'none' | 'channel' | 'person'>('none');
  const [name, setName] = useState('');

  const toggle = (next: 'channel' | 'person') => {
    const opening = mode !== next;
    setMode(opening ? next : 'none');
    if (opening && next === 'person') onRequestPeople();
  };

  const submitChannel = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onCreateChannel(name);
    setName('');
    setMode('none');
  };

  const others: Person[] = people.filter((p) => p.email !== me);

  return (
    <div className={styles.container}>
      <div className={styles.chips} role="tablist" aria-label="Canais">
        {channels.map((channel) => {
          const isActive = channel.id === active;
          const strong = isActive || channel.unread > 0;
          return (
            <button
              key={channel.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(channel.id)}
              className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
            >
              <span
                className={`${styles.chipText} ${strong ? styles.chipTextStrong : ''}`}
              >
                {channel.kind === 'dm' ? '@ ' : '# '}
                {channelTitle(channel, me)}
              </span>
              {channel.mentions > 0 ? (
                <span className={`${styles.badge} ${styles.badgeMention}`}>
                  @{channel.mentions}
                </span>
              ) : channel.unread > 0 ? (
                <span className={styles.badge}>{channel.unread}</span>
              ) : null}
            </button>
          );
        })}
        <button
          type="button"
          className={styles.add}
          onClick={() => toggle('channel')}
          aria-label="Novo canal"
        >
          + canal
        </button>
        <button
          type="button"
          className={styles.add}
          onClick={() => toggle('person')}
          aria-label="Nova conversa"
        >
          + conversa
        </button>
      </div>

      {mode === 'channel' ? (
        <form className={styles.form} onSubmit={submitChannel}>
          <input
            type="text"
            className={styles.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="nome-do-canal"
            autoCapitalize="none"
            maxLength={30}
            autoFocus
            aria-label="Nome do novo canal"
          />
          <span className={styles.hint}>
            Letras minúsculas, números e hífen. Enter cria.
          </span>
        </form>
      ) : null}

      {mode === 'person' ? (
        <div className={styles.people}>
          {others.length === 0 ? (
            <span className={styles.hint}>Ninguém mais entrou ainda.</span>
          ) : null}
          {others.map((person) => (
            <button
              key={person.email}
              type="button"
              className={styles.person}
              onClick={() => {
                onOpenDm(person.email);
                setMode('none');
              }}
            >
              <span className={styles.personName}>{person.name}</span>
              <span className={styles.hint}>{person.email}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
