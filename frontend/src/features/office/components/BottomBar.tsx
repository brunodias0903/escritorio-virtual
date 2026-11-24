import { useEffect, useRef, useState } from 'react';

import { DevicePopover } from '@/features/media/components/DevicePopover';
import type {
  CallState,
  MediaDeviceKindOption,
} from '@/features/media/model/callTypes';
import {
  EMOTES,
  STATUSES,
  STATUS_LABELS,
  type Appearance,
  type Emote,
  type Status,
} from '@/shared/domain';
import { toHexColor } from '@/shared/lib/color';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { Tip } from '@/shared/ui/Tip';

import styles from './BottomBar.module.css';
import { FaceAvatar } from './FaceAvatar';

const STATUS_COLORS: Record<Status, string> = {
  available: 'var(--status-available)',
  busy: 'var(--status-busy)',
  away: 'var(--status-away)',
};

const HINTS: Record<CallState['status'], string> = {
  off: 'A chamada inicia automaticamente quando outra pessoa estiver com você na mesa, sala ou por perto.',
  unavailable: 'O servidor está sem LiveKit: não há voz nem vídeo.',
  connecting: 'Conectando à chamada…',
  on: '',
};

const BUSY_HINT =
  'Você está Ocupado. Clique em "Ficar online" para liberar áudio, microfone, câmera e tela.';

/** Tempo com o mouse sobre fone/mic/câmera para abrir as opções de dispositivo (2,2s). */
const DEVICE_HOVER_MS = 2200;
/** Tempo segurando no toque (mobile) para abrir as opções de dispositivo (0,52s). */
const DEVICE_TOUCH_HOLD_MS = 520;
/** Pequena folga ao mover o mouse do botão para o popover. */
const DEVICE_CLOSE_GRACE_MS = 220;

/** Anel verde que carrega em volta do botão circular durante o hover. */
function HoverRing() {
  return (
    <svg
      className={styles.hoverRing}
      width="42"
      height="42"
      viewBox="0 0 42 42"
      aria-hidden="true"
    >
      <circle
        cx="21"
        cy="21"
        r="19"
        fill="none"
        stroke="var(--presence-soft)"
        strokeWidth="2.4"
      />
      <circle
        cx="21"
        cy="21"
        r="19"
        fill="none"
        stroke="var(--status-available)"
        strokeWidth="2.4"
        strokeLinecap="round"
        className={styles.hoverRingProgress}
      />
    </svg>
  );
}

type Props = {
  me: { name: string; status: Status; appearance: Appearance } | undefined;
  call: CallState;
  /** Tela pequena: ajustes compactos. */
  compact: boolean;
  /** Mostra botão para abrir a sidebar em telas estreitas (tablet/mobile). */
  showMenuButton?: boolean;
  unread?: number;
  mentions?: number;
  onOpenSidebar?: () => void;
  onStatus: (status: Status) => void;
  onEmote: (emote: Emote) => void;
  onAvatar: () => void;
  onAccount: () => void;
  onThemes: () => void;
  /** A pessoa adotou uma mesa: habilita o atalho de ir até ela. */
  hasDesk: boolean;
  onGoToMyDesk: () => void;
  /** Está em uma zona de chamada (mesa, sala ou perto de alguém). */
  inCallZone?: boolean;
  /** Saiu manualmente da chamada atual (ainda na mesma zona). */
  optedOut?: boolean;
  onLeaveCall?: () => void;
  onJoinCall?: () => void;
  /** True quando a própria câmera está ampliada no destaque central inferior. */
  selfCamExpanded?: boolean;
  onToggleSelfCamExpand?: () => void;
};

/**
 * Cartão unificado no canto inferior esquerdo do mapa:
 * - Em chamada: expande para cima com a visualização acoplada da própria webcam e botão de sair/entrar;
 * - Abaixo: nome + status e os 6 botões circulares (fone, mic, câmera, tela, emotes e mesa).
 */
export function BottomBar({
  me,
  call,
  compact,
  showMenuButton = false,
  unread = 0,
  mentions = 0,
  onOpenSidebar,
  onStatus,
  onEmote,
  onAvatar,
  onAccount,
  onThemes,
  hasDesk,
  onGoToMyDesk,
  inCallZone = false,
  optedOut = false,
  onLeaveCall,
  onJoinCall,
  selfCamExpanded = false,
  onToggleSelfCamExpand,
}: Props) {
  const [menu, setMenu] = useState<'none' | 'status' | 'emotes'>('none');
  const [deviceMenu, setDeviceMenu] = useState<MediaDeviceKindOption | null>(
    null,
  );
  const [hoveringKind, setHoveringKind] =
    useState<MediaDeviceKindOption | null>(null);
  const [hint, setHint] = useState('');
  const [dismissedCallSession, setDismissedCallSession] = useState(0);

  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const longPressOpenedRef = useRef(false);
  const selfVideoRef = useRef<HTMLVideoElement | null>(null);

  const selfTile = call.tiles.find((t) => t.self && t.kind === 'camera');
  const selfTrack = selfTile?.track ?? null;
  const selfColor = toHexColor(
    selfTile?.color ?? me?.appearance.shirt ?? 0x5b6cff,
  );
  const isConnectingCall =
    inCallZone &&
    !optedOut &&
    (call.status === 'connecting' || call.status === 'off');

  useEffect(() => {
    const el = selfVideoRef.current;
    if (!el || !selfTrack || selfCamExpanded) return;
    selfTrack.attach(el);
    return () => {
      selfTrack.detach(el);
    };
  }, [selfTrack, selfCamExpanded]);

  const clearDeviceTimers = () => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  useEffect(() => () => clearDeviceTimers(), []);

  const beginDeviceHover = (kind: MediaDeviceKindOption) => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (deviceMenu === kind) return;
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
    }
    setHoveringKind(kind);
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null;
      setHoveringKind(null);
      setMenu('none');
      setDeviceMenu(kind);
    }, DEVICE_HOVER_MS);
  };

  const beginTouchHold = (kind: MediaDeviceKindOption) => {
    longPressOpenedRef.current = false;
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
    }
    setHoveringKind(kind);
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null;
      setHoveringKind(null);
      longPressOpenedRef.current = true;
      setMenu('none');
      setDeviceMenu(kind);
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(12);
      }
    }, DEVICE_TOUCH_HOLD_MS);
  };

  const endTouchHold = () => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    setHoveringKind(null);
  };

  const endDeviceHover = () => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    setHoveringKind(null);
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setDeviceMenu(null);
    }, DEVICE_CLOSE_GRACE_MS);
  };

  const keepDeviceOpen = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

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
    if (menu === 'none' && !deviceMenu) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenu('none');
        setDeviceMenu(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menu, deviceMenu]);

  const press = (action: () => void) => () => {
    if (longPressOpenedRef.current) {
      longPressOpenedRef.current = false;
      return;
    }
    if (busy) setHint(BUSY_HINT);
    else if (live) action();
    else setHint(HINTS[call.status]);
  };
  const pressAudio = () => {
    if (longPressOpenedRef.current) {
      longPressOpenedRef.current = false;
      return;
    }
    if (busy) setHint(BUSY_HINT);
    else call.toggleAudio();
  };

  const close = () => {
    setMenu('none');
    setDeviceMenu(null);
  };

  const circleCallButton = (
    on: boolean,
    iconOn: IconName,
    iconOff: IconName,
    label: string,
    action: () => void,
    deviceKind?: MediaDeviceKindOption,
    tipPlacement: 'top' | 'top-start' | 'top-end' = 'top',
  ) => {
    const blocked = busy || !live;
    const isLoading = deviceKind !== undefined && hoveringKind === deviceKind;
    return (
      <Tip
        label={busy ? 'Indisponível no modo Ocupado' : label}
        disabled={Boolean(deviceMenu)}
        placement={tipPlacement}
      >
        <div
          className={styles.circleWrap}
          onMouseEnter={
            deviceKind ? () => beginDeviceHover(deviceKind) : undefined
          }
          onMouseLeave={deviceKind ? endDeviceHover : undefined}
          onPointerDown={(event) => {
            if (deviceKind && event.pointerType === 'touch') {
              beginTouchHold(deviceKind);
            }
          }}
          onPointerUp={(event) => {
            if (event.pointerType === 'touch') endTouchHold();
          }}
          onPointerCancel={(event) => {
            if (event.pointerType === 'touch') endTouchHold();
          }}
        >
          {isLoading ? <HoverRing /> : null}
          <button
            type="button"
            aria-label={label}
            aria-pressed={on}
            aria-disabled={blocked}
            onClick={press(action)}
            className={`${styles.circle} ${blocked ? styles.circleIdle : on ? styles.circleOn : styles.circleOff} ${busy ? styles.circleBusy : ''}`}
          >
            <Icon
              name={on ? iconOn : iconOff}
              size={18}
              color={
                blocked
                  ? 'var(--text-icon-idle)'
                  : on
                    ? 'var(--call-on-icon)'
                    : 'var(--call-off-icon)'
              }
            />
          </button>
        </div>
      </Tip>
    );
  };

  return (
    <>
      {menu !== 'none' || deviceMenu !== null ? (
        <button
          type="button"
          aria-label="Fechar o menu"
          onClick={close}
          className={styles.backdrop}
        />
      ) : null}

      {/* Avisos flutuantes centralizados (Ficar online, mic mutado, som bloqueado, erros) */}
      <div className={styles.notices}>
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
      </div>

      {/* Cartão flutuante no canto inferior esquerdo */}
      <div
        className={styles.dock}
        onContextMenu={(event) => event.preventDefault()}
      >
        {menu === 'status' && me ? (
          <div
            className={styles.popup}
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
              <Icon name="pencil" size={16} color="var(--text-icon)" />
              <span className={styles.menuText}>Editar avatar e foto</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={() => {
                onThemes();
                setMenu('none');
              }}
            >
              <Icon name="palette" size={16} color="var(--text-icon)" />
              <span className={styles.menuText}>Aparência e temas</span>
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
              <Icon name="people" size={16} color="var(--text-icon)" />
              <span className={styles.menuText}>Minha conta</span>
            </button>
          </div>
        ) : null}

        {menu === 'emotes' ? (
          <div
            className={`${styles.popup} ${styles.emoteTray}`}
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

        {deviceMenu ? (
          <DevicePopover
            kind={deviceMenu}
            cameraActive={Boolean(selfTrack && inCallZone && !optedOut)}
            onSelect={(deviceId) => call.switchDevice(deviceMenu, deviceId)}
            onMouseEnter={keepDeviceOpen}
            onMouseLeave={endDeviceHover}
          />
        ) : null}

        <div className={styles.card}>
          {/* Bloco acoplado da própria webcam: expande quando em chamada ativa e não está em destaque central */}
          <div
            className={`${styles.camDock} ${inCallZone && !optedOut && !selfCamExpanded ? styles.camDockOpen : ''}`}
            aria-hidden={!inCallZone || optedOut || selfCamExpanded}
          >
            <div className={styles.camFrame}>
              {selfTrack && !selfCamExpanded ? (
                <video
                  ref={selfVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={styles.camVideo}
                />
              ) : (
                <div className={styles.camPlaceholder}>
                  <div
                    className={styles.camTint}
                    style={{ backgroundColor: selfColor }}
                  />
                  <div
                    className={styles.camDisc}
                    style={{ backgroundColor: selfColor }}
                  >
                    <span className={styles.camDiscText}>
                      {(me?.name.charAt(0) ?? 'V').toUpperCase()}
                    </span>
                  </div>
                </div>
              )}

              {isConnectingCall ? (
                <div
                  className={styles.camConnectingOverlay}
                  role="status"
                  aria-label="Entrando na chamada"
                >
                  <span className={styles.camSpinner} aria-hidden="true" />
                </div>
              ) : null}

              {onToggleSelfCamExpand && inCallZone && !optedOut ? (
                <div className={styles.camExpandAction}>
                  <Tip label="Ampliar câmera" placement="top-start">
                    <button
                      type="button"
                      aria-label="Ampliar câmera"
                      onClick={onToggleSelfCamExpand}
                      className={styles.camExpandBtn}
                    >
                      <Icon name="expand" size={14} color="#ffffff" />
                    </button>
                  </Tip>
                </div>
              ) : null}

              {inCallZone && !optedOut && call.status !== 'unavailable' ? (
                <div className={styles.camCallAction}>
                  <Tip label="Sair da chamada" placement="top-end">
                    <button
                      type="button"
                      aria-label="Sair da chamada"
                      onClick={onLeaveCall}
                      className={`${styles.callBtn} ${styles.callBtnLeave}`}
                    >
                      <Icon name="phoneOff" size={16} color="#ffffff" />
                    </button>
                  </Tip>
                </div>
              ) : null}
            </div>
          </div>

          {/* Linha compacta quando a própria câmera está ampliada no destaque central */}
          <div
            className={`${styles.rejoinDock} ${inCallZone && !optedOut && selfCamExpanded ? styles.rejoinDockOpen : ''}`}
            aria-hidden={!inCallZone || optedOut || !selfCamExpanded}
          >
            <div className={`${styles.rejoinRow} ${styles.expandedRow}`}>
              <div className={styles.expandedLeft}>
                {onToggleSelfCamExpand ? (
                  <Tip label="Reduzir câmera" placement="top-start">
                    <button
                      type="button"
                      aria-label="Reduzir câmera"
                      onClick={onToggleSelfCamExpand}
                      className={styles.camExpandBtn}
                    >
                      <Icon name="shrink" size={14} color="#ffffff" />
                    </button>
                  </Tip>
                ) : null}
                <span className={styles.expandedLabel}>Câmera ampliada</span>
              </div>
              {call.status !== 'unavailable' ? (
                <Tip label="Sair da chamada" placement="top-end">
                  <button
                    type="button"
                    aria-label="Sair da chamada"
                    onClick={onLeaveCall}
                    className={`${styles.callBtn} ${styles.callBtnLeave}`}
                  >
                    <Icon name="phoneOff" size={15} color="#ffffff" />
                  </button>
                </Tip>
              ) : null}
            </div>
          </div>

          {/* Linha compacta quando saiu da chamada mas segue na mesma mesa/sala */}
          <div
            className={`${styles.rejoinDock} ${inCallZone && optedOut ? styles.rejoinDockOpen : ''}`}
            aria-hidden={!inCallZone || !optedOut}
          >
            <div className={styles.rejoinRow}>
              <span className={styles.rejoinLabel}>Entrar na chamada</span>
              <Tip label="Entrar na chamada" placement="top-end">
                <button
                  type="button"
                  aria-label="Entrar na chamada"
                  onClick={onJoinCall}
                  className={`${styles.callBtn} ${styles.callBtnJoin}`}
                >
                  <Icon name="phone" size={15} color="#ffffff" />
                </button>
              </Tip>
            </div>
          </div>

          {/* Topo dos controles: avatar, nome e status */}
          <div className={styles.controlsBody}>
            <div className={styles.profileRow}>
              {me ? (
                <button
                  type="button"
                  aria-label="Perfil e status"
                  aria-expanded={menu === 'status'}
                  className={styles.profile}
                  onClick={() => setMenu(menu === 'status' ? 'none' : 'status')}
                >
                  <FaceAvatar appearance={me.appearance} size={32} />
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
                  <Icon name="chevronUp" size={14} color="#8f98cc" />
                </button>
              ) : null}

              {showMenuButton && onOpenSidebar ? (
                <Tip label="Abrir menu lateral">
                  <button
                    type="button"
                    aria-label="Abrir menu lateral"
                    onClick={onOpenSidebar}
                    className={styles.menuTrigger}
                  >
                    <Icon name="chevronRight" size={18} color="#c9cff5" />
                    {mentions > 0 || unread > 0 ? (
                      <span
                        className={`${styles.badge} ${mentions > 0 ? styles.badgeAlert : ''}`}
                      >
                        {mentions > 0 ? `@${mentions}` : unread}
                      </span>
                    ) : null}
                  </button>
                </Tip>
              ) : null}
            </div>

            {/* 6 botões circulares: Headphone primeiro, depois Mic, Câmera, Tela, Emotes e Mesa */}
            <div className={styles.controls}>
              <Tip
                label={
                  busy
                    ? 'Indisponível no modo Ocupado'
                    : call.audioOn
                      ? 'Mutar áudio (segure o mouse para escolher saída)'
                      : 'Ativar áudio (segure o mouse para escolher saída)'
                }
                disabled={Boolean(deviceMenu)}
                placement="top-start"
              >
                <div
                  className={styles.circleWrap}
                  onMouseEnter={() => beginDeviceHover('audiooutput')}
                  onMouseLeave={endDeviceHover}
                  onPointerDown={(event) => {
                    if (event.pointerType === 'touch') {
                      beginTouchHold('audiooutput');
                    }
                  }}
                  onPointerUp={(event) => {
                    if (event.pointerType === 'touch') endTouchHold();
                  }}
                  onPointerCancel={(event) => {
                    if (event.pointerType === 'touch') endTouchHold();
                  }}
                >
                  {hoveringKind === 'audiooutput' ? <HoverRing /> : null}
                  <button
                    type="button"
                    aria-label={call.audioOn ? 'Mutar áudio' : 'Ativar áudio'}
                    aria-pressed={!call.audioOn}
                    aria-disabled={busy}
                    onClick={pressAudio}
                    className={`${styles.circle} ${
                      busy
                        ? `${styles.circleIdle} ${styles.circleBusy}`
                        : !call.audioOn
                          ? styles.circleOff
                          : live
                            ? styles.circleOn
                            : styles.circleIdle
                    }`}
                  >
                    <Icon
                      name={
                        call.audioOn && !busy ? 'headphones' : 'headphonesOff'
                      }
                      size={18}
                      color={
                        busy
                          ? 'var(--text-icon-idle)'
                          : !call.audioOn
                            ? 'var(--call-off-icon)'
                            : live
                              ? 'var(--call-on-icon)'
                              : 'var(--text-icon)'
                      }
                    />
                  </button>
                </div>
              </Tip>

              {circleCallButton(
                call.mic,
                'mic',
                'micOff',
                call.mic
                  ? 'Desligar microfone (segure para trocar)'
                  : 'Ligar microfone (segure para trocar)',
                call.toggleMic,
                'audioinput',
                'top-start',
              )}

              {circleCallButton(
                call.cam,
                'video',
                'videoOff',
                call.cam
                  ? 'Desligar câmera (segure para preview)'
                  : 'Ligar câmera (segure para preview)',
                call.toggleCam,
                'videoinput',
                'top-start',
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
                  className={`${styles.circle} ${call.screen ? styles.circleOn : styles.circleIdle} ${busy ? styles.circleBusy : ''}`}
                >
                  <Icon
                    name="screen"
                    size={18}
                    color={
                      call.screen
                        ? '#9af5e6'
                        : !busy && live
                          ? '#c9cff5'
                          : '#7b83bd'
                    }
                  />
                </button>
              </Tip>

              <Tip label="Emotes">
                <button
                  type="button"
                  aria-label="Emotes"
                  aria-pressed={menu === 'emotes'}
                  onClick={() => setMenu(menu === 'emotes' ? 'none' : 'emotes')}
                  className={`${styles.circle} ${menu === 'emotes' ? styles.circleActive : styles.circleIdle}`}
                >
                  <Icon
                    name="smile"
                    size={18}
                    color={menu === 'emotes' ? '#ffffff' : '#c9cff5'}
                  />
                </button>
              </Tip>

              <Tip
                label={
                  hasDesk
                    ? 'Ir até a minha mesa'
                    : 'Adote uma mesa para usar este atalho'
                }
                placement="top-end"
              >
                <button
                  type="button"
                  aria-label="Ir até a minha mesa"
                  disabled={!hasDesk}
                  onClick={onGoToMyDesk}
                  className={`${styles.circle} ${styles.circleIdle} ${!hasDesk ? styles.circleDisabled : ''}`}
                >
                  <Icon
                    name="desk"
                    size={18}
                    color={hasDesk ? '#c9cff5' : '#5c6396'}
                  />
                </button>
              </Tip>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
