import { useEffect, useRef, useState, type FormEvent } from 'react';

import { FaceAvatar } from '@/features/office/components/FaceAvatar';
import { PERSON_STATUS_COLORS } from '@/features/office/model/people';
import { usePeopleStore } from '@/features/office/model/peopleStore';
import {
  CHAT_TEXT_MAX_LENGTH,
  defaultAppearance,
  emailHandle,
  matchesPerson,
} from '@/shared/domain';

import { applyMention, mentionQuery } from '../model/mentionDraft';
import styles from './Composer.module.css';

type Props = {
  placeholder: string;
  onSend: (text: string) => void;
  onTyping?: (typing: boolean) => void;
};

/** Até quantas pessoas a lista do @ mostra. */
const MENTION_LIMIT = 8;

export function Composer({ placeholder, onSend, onTyping }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const stopTypingRef = useRef<number | null>(null);
  const lastTypingAtRef = useRef(0);
  const people = usePeopleStore((s) => s.people);

  useEffect(() => {
    return () => {
      if (stopTypingRef.current !== null) {
        window.clearTimeout(stopTypingRef.current);
      }
      onTyping?.(false);
    };
  }, [onTyping]);

  const notifyTyping = (value: string) => {
    if (!onTyping) return;
    if (stopTypingRef.current !== null) {
      window.clearTimeout(stopTypingRef.current);
      stopTypingRef.current = null;
    }
    if (!value.trim()) {
      lastTypingAtRef.current = 0;
      onTyping(false);
      return;
    }
    const now = Date.now();
    if (now - lastTypingAtRef.current > 1600) {
      lastTypingAtRef.current = now;
      onTyping(true);
    }
    stopTypingRef.current = window.setTimeout(() => {
      stopTypingRef.current = null;
      lastTypingAtRef.current = 0;
      onTyping(false);
    }, 2400);
  };

  const query = mentionQuery(text);
  // A mesma ordem da aba Pessoas (online primeiro), filtrada pelo que vem depois do @.
  const options =
    query === null
      ? []
      : people.filter((p) => matchesPerson(p, query)).slice(0, MENTION_LIMIT);

  const send = () => {
    if (!text.trim()) return;
    if (stopTypingRef.current !== null) {
      window.clearTimeout(stopTypingRef.current);
      stopTypingRef.current = null;
    }
    lastTypingAtRef.current = 0;
    onTyping?.(false);
    onSend(text);
    setText('');
  };

  const pick = (email: string) => {
    setText(applyMention(text, email));
    inputRef.current?.focus();
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (options.length > 0) pick(options[0]!.email);
    else send();
  };

  return (
    <div className={styles.wrapper}>
      {options.length > 0 ? (
        <div className={styles.mentions} role="menu" aria-label="Citar alguém">
          <span className={styles.mentionsTitle}>Citar alguém</span>
          <div className={styles.mentionsList}>
            {options.map((person) => (
              <button
                key={person.email}
                type="button"
                role="menuitem"
                aria-label={`Citar ${person.name}`}
                onClick={() => pick(person.email)}
                className={styles.mention}
              >
                <div className={styles.avatarWrap}>
                  <FaceAvatar
                    appearance={
                      person.appearance ?? defaultAppearance(person.email)
                    }
                    size={28}
                  />
                  <span
                    className={styles.dot}
                    style={{
                      backgroundColor: PERSON_STATUS_COLORS[person.status],
                    }}
                  />
                </div>
                <div className={styles.mentionInfo}>
                  <span className={styles.mentionName}>{person.name}</span>
                  <span className={styles.mentionDetail}>
                    @{emailHandle(person.email)}
                    {person.role ? ` · ${person.role}` : ''}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <form className={styles.composer} onSubmit={onSubmit}>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            notifyTyping(event.target.value);
          }}
          placeholder={placeholder}
          maxLength={CHAT_TEXT_MAX_LENGTH}
          aria-label={placeholder}
        />
        <button type="submit" className={styles.send}>
          Enviar
        </button>
      </form>
    </div>
  );
}
