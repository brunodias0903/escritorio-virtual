import { useEffect, useState } from 'react';

import type { CallState } from '@/features/media/model/callTypes';
import {
  EMOTES,
  STATUSES,
  STATUS_LABELS,
  type Appearance,
  type Emote,
  type Status,
} from '@/shared/domain';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { Tip } from '@/shared/ui/Tip';

import styles from './BottomBar.module.css';
import { FaceAvatar } from './FaceAvatar';

const STATUS_COLORS: Record<Status, string> = {
  available: '#31e0c1',
  busy: '#ff6b81',
  away: '#f1c40f',
};

const HINTS: Record<CallState['status'], string> = {
  off: 'Chegue a uma mesa ou à sala de reunião para falar e ligar a câmera.',
  unavailable: 'O servidor está sem LiveKit: não há voz nem vídeo.',
  connecting: 'Conectando à chamada…',
  on: '',
};

const BUSY_HINT =
  'Você está Ocupado. Clique em "Ficar online" para liberar áudio, microfone, câmera e tela.';

type Props = {
  me: { name: string; status: Status; appearance: Appearance } | undefined;
  call: CallState;
  playerCount: number;
  chatOpen: boolean;
  unread: number;
  mentions: number;
  /** Tela pequena: sem textos, só ícones. */
  compact: boolean;
  onStatus: (status: Status) => void;
  onEmote: (emote: Emote) => void;
  onAvatar: () => void;
  onAccount: () => void;
  onToggleChat: () => void;
  onExit: () => void;
  /** Lista de quem está online aberta. */
  peopleOpen: boolean;
  onTogglePeople: () => void;
  /** A pessoa adotou uma mesa: mostra o botão de ir até ela. */
  hasDesk: boolean;
  onGoToMyDesk: () => void;
};

function RoundButton({
  icon,
  label,
  onClick,
  active = false,
  badge,
  tone = 'plain',
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  active?: boolean;
  badge?: string;
  tone?: 'plain' | 'alert';
}) {
  return (
    <Tip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={`${styles.round} ${active ? styles.roundActive : ''}`}
      >
        <Icon name={icon} size={21} color={active ? '#ffffff' : '#c9cff5'} />
        {badge ? (
          <span
            className={`${styles.badge} ${tone === 'alert' ? styles.badgeAlert : ''}`}
          >
            {badge}
          </span>
        ) : null}
      </button>
    </Tip>
  );
}

/** Barra de baixo: perfil, microfone, câmera, tela e emotes à esquerda; chat, pessoas e sair à direita. */
export function BottomBar({
  me,
  call,
  playerCount,
  chatOpen,
  unread,
  mentions,
  compact,
  onStatus,
  onEmote,
  onAvatar,
  onAccount,
  onToggleChat,
  onExit,
  peopleOpen,
  onTogglePeople,
  hasDesk,
  onGoToMyDesk,
}: Props) {
  const [menu, setMenu] = useState<'none' | 'status' | 'emotes'>('none');
  const [hint, setHint] = useState('');
  const [dismissedCallSession, setDismissedCallSession] = useState(0);

  const live = call.status === 'on';
  const busy = me?.status === 'busy';
  const showMutedPopup =
    live &&
    !busy &&
    !call.mic &&
    call.sessionId > 0 &&
    dismissedCallSession !== call.sessionId;

  useEffect(() => {
    if (!showMutedPopup) return;
    const current = call.sessionId;
    const timer = window.setTimeout(
      () => setDismissedCallSession(current),
      6000,
    );
    return () => window.clearTimeout(timer);
  }, [showMutedPopup, call.sessionId]);

  useEffect(() => {
    if (!hint) return;
    const timer = window.setTimeout(() => setHint(''), 3500);
    return () => window.clearTimeout(timer);
  }, [hint]);

  useEffect(() => {
    if (menu === 'none') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu('none');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menu]);

  const press = (action: () => void) => () => {
    if (busy) setHint(BUSY_HINT);
    else if (live) action();
    else setHint(HINTS[call.status]);
  };
  const pressAudio = () => {
    if (busy) setHint(BUSY_HINT);
    else call.toggleAudio();
  };

  const callButton = (
    on: boolean,
    iconOn: IconName,
    iconOff: IconName,
    label: string,
    action: () => void,
  ) => {
    const blocked = busy || !live;
    return (
      <Tip label={busy ? 'Indisponível no modo Ocupado' : label}>
        <button
          type="button"
          aria-label={label}
          aria-pressed={on}
          aria-disabled={blocked}
          onClick={press(action)}
          className={`${styles.pill} ${blocked ? styles.pillIdle : on ? styles.pillOn : styles.pillOff} ${busy ? styles.pillBusy : ''}`}
        >
          <Icon
            name={on ? iconOn : iconOff}
            size={22}
            color={blocked ? '#7b83bd' : on ? '#9af5e6' : '#ffb3bf'}
          />
        </button>
      </Tip>
    );
  };

  const close = () => setMenu('none');

  return (
    <div className={styles.wrapper}>
      {/* Menu aberto: clicar em qualquer lugar fora dele fecha. */}
      {menu !== 'none' ? (
        <button
          type="button"
          aria-label="Fechar o menu"
          onClick={close}
          className={styles.backdrop}
        />
      ) : null}
      {hint ? (
        <div className={styles.hint} role="status">
          <span className={styles.hintText}>{hint}</span>
        </div>
      ) : null}
      {call.error ? (
        <div className={`${styles.hint} ${styles.hintError}`} role="alert">
          <span className={styles.hintText}>{call.error}</span>
        </div>
      ) : null}
      {call.audioBlocked && live && !busy && call.audioOn ? (
        <button
          type="button"
          className={styles.hintButton}
          onClick={call.startAudio}
        >
          <span className={styles.hintText}>
            🔊 O navegador bloqueou o som. Clique aqui para ativar.
          </span>
        </button>
      ) : null}
      {showMutedPopup ? (
        <div className={styles.mutedPopup} role="status" aria-live="polite">
          <Icon name="micOff" size={16} color="#ff8a9b" />
          <span className={styles.mutedText}>
            Você entrou na chamada com o microfone mutado
          </span>
          <button
            type="button"
            className={styles.unmuteButton}
            onClick={() => {
              setDismissedCallSession(call.sessionId);
              call.toggleMic();
            }}
          >
            Ativar microfone
          </button>
          <button
            type="button"
            aria-label="Fechar aviso"
            className={styles.dismissButton}
            onClick={() => setDismissedCallSession(call.sessionId)}
          >
            ✕
          </button>
        </div>
      ) : null}
      {busy ? (
        <div className={styles.busyBar} role="status">
          {!compact ? (
            <span className={styles.busyText}>
              Modo Ocupado · som, microfone, câmera e tela pausados
            </span>
          ) : null}
          <button
            type="button"
            className={styles.goOnlineButton}
            onClick={() => onStatus('available')}
          >
            <span className={styles.goOnlineDot} />
            <span>Ficar online</span>
          </button>
        </div>
      ) : null}

      {menu === 'status' && me ? (
        <div
          className={`${styles.popup} ${styles.popupLeft}`}
          role="menu"
          aria-label="Status e perfil"
        >
          {STATUSES.map((value) => (
            <button
              key={value}
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={() => {
                onStatus(value);
                setMenu('none');
              }}
            >
              <span
                className={styles.dot}
                style={{ backgroundColor: STATUS_COLORS[value] }}
              />
              <span
                className={`${styles.menuText} ${value === me.status ? styles.menuTextActive : ''}`}
              >
                {STATUS_LABELS[value]}
              </span>
            </button>
          ))}
          <div className={styles.menuDivider} />
          <button
            type="button"
            role="menuitem"
            className={styles.menuItem}
            onClick={() => {
              onAvatar();
              setMenu('none');
            }}
          >
            <Icon name="pencil" size={16} color="#c9cff5" />
            <span className={styles.menuText}>Editar avatar</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.menuItem}
            onClick={() => {
              onAccount();
              setMenu('none');
            }}
          >
            <Icon name="people" size={16} color="#c9cff5" />
            <span className={styles.menuText}>Minha conta</span>
          </button>
        </div>
      ) : null}

      {menu === 'emotes' ? (
        <div
          className={`${styles.popup} ${styles.emoteTray} ${compact ? styles.popupLeft : styles.popupEmote}`}
          role="menu"
          aria-label="Emotes"
        >
          {EMOTES.map((emote) => (
            <button
              key={emote}
              type="button"
              role="menuitem"
              aria-label={`Emote ${emote}`}
              className={styles.emoteButton}
              onClick={() => {
                onEmote(emote);
                setMenu('none');
              }}
            >
              {emote}
            </button>
          ))}
        </div>
      ) : null}

      <footer className={styles.bar}>
        <div className={styles.cluster}>
          {me ? (
            <Tip label="Perfil, status e avatar" disabled={menu === 'status'}>
              <button
                type="button"
                aria-label="Perfil e status"
                aria-expanded={menu === 'status'}
                className={`${styles.profile} ${compact ? styles.profileCompact : ''}`}
                onClick={() => setMenu(menu === 'status' ? 'none' : 'status')}
              >
                <FaceAvatar appearance={me.appearance} size={34} />
                {!compact ? (
                  <div className={styles.profileText}>
                    <span className={styles.profileName}>{me.name}</span>
                    <span className={styles.statusLine}>
                      <span
                        className={styles.dot}
                        style={{ backgroundColor: STATUS_COLORS[me.status] }}
                      />
                      <span className={styles.statusText}>
                        {STATUS_LABELS[me.status]}
                      </span>
                    </span>
                  </div>
                ) : (
                  <span
                    className={styles.dotCorner}
                    style={{ backgroundColor: STATUS_COLORS[me.status] }}
                  />
                )}
              </button>
            </Tip>
          ) : null}

          {callButton(
            call.mic,
            'mic',
            'micOff',
            call.mic ? 'Desligar microfone' : 'Ligar microfone',
            call.toggleMic,
          )}
          <Tip
            label={
              busy
                ? 'Indisponível no modo Ocupado'
                : call.audioOn
                  ? 'Mutar áudio'
                  : 'Ativar áudio'
            }
          >
            <button
              type="button"
              aria-label={call.audioOn ? 'Mutar áudio' : 'Ativar áudio'}
              aria-pressed={!call.audioOn}
              aria-disabled={busy}
              onClick={pressAudio}
              className={`${styles.pill} ${
                busy
                  ? `${styles.pillIdle} ${styles.pillBusy}`
                  : !call.audioOn
                    ? styles.pillOff
                    : live
                      ? styles.pillOn
                      : styles.pillIdle
              }`}
            >
              <Icon
                name={call.audioOn && !busy ? 'volume' : 'volumeOff'}
                size={22}
                color={
                  busy
                    ? '#7b83bd'
                    : !call.audioOn
                      ? '#ffb3bf'
                      : live
                        ? '#9af5e6'
                        : '#c9cff5'
                }
              />
            </button>
          </Tip>
          {callButton(
            call.cam,
            'video',
            'videoOff',
            call.cam ? 'Desligar câmera' : 'Ligar câmera',
            call.toggleCam,
          )}
          <Tip
            label={
              busy
                ? 'Indisponível no modo Ocupado'
                : call.screen
                  ? 'Parar de compartilhar a tela'
                  : 'Compartilhar a tela'
            }
          >
            <button
              type="button"
              aria-label={
                call.screen
                  ? 'Parar de compartilhar a tela'
                  : 'Compartilhar a tela'
              }
              aria-pressed={call.screen}
              aria-disabled={busy || !live}
              onClick={press(call.toggleScreen)}
              className={`${styles.round} ${call.screen ? styles.roundShare : ''} ${busy || !live ? styles.roundIdle : ''}`}
            >
              <Icon
                name="screen"
                size={21}
                color={
                  call.screen
                    ? '#ffffff'
                    : !busy && live
                      ? '#c9cff5'
                      : '#7b83bd'
                }
              />
            </button>
          </Tip>
          <RoundButton
            icon="smile"
            label="Emotes"
            active={menu === 'emotes'}
            onClick={() => setMenu(menu === 'emotes' ? 'none' : 'emotes')}
          />
          {hasDesk ? (
            <RoundButton
              icon="desk"
              label="Ir até a minha mesa"
              onClick={onGoToMyDesk}
            />
          ) : null}
        </div>

        <div className={styles.cluster}>
          <RoundButton
            icon="chat"
            label={chatOpen ? 'Fechar o chat' : 'Abrir o chat'}
            active={chatOpen}
            badge={
              mentions > 0
                ? `@${mentions}`
                : unread > 0
                  ? String(unread)
                  : undefined
            }
            tone={mentions > 0 ? 'alert' : 'plain'}
            onClick={onToggleChat}
          />
          <Tip label={peopleOpen ? 'Fechar a lista de pessoas' : 'Pessoas'}>
            <button
              type="button"
              aria-label={
                peopleOpen
                  ? 'Fechar a lista de pessoas'
                  : `Pessoas (${playerCount} online)`
              }
              aria-pressed={peopleOpen}
              onClick={onTogglePeople}
              className={`${styles.people} ${peopleOpen ? styles.roundActive : ''}`}
            >
              <Icon
                name="people"
                size={19}
                color={peopleOpen ? '#ffffff' : '#c9cff5'}
              />
              <span
                className={styles.dot}
                style={{ backgroundColor: '#31e0c1' }}
              />
              <span className={styles.peopleText}>{playerCount}</span>
            </button>
          </Tip>
          <div className={styles.separator} />
          <RoundButton icon="exit" label="Sair" onClick={onExit} />
        </div>
      </footer>
    </div>
  );
}
