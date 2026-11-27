import { Volume2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { DevicePopover } from '@/features/media/components/DevicePopover';
import type {
  CallState,
  MediaDeviceKindOption,
} from '@/features/media/model/callTypes';
import {
  EMOTES,
  isUnavailableStatus,
  type Appearance,
  type Emote,
  type Status,
} from '@/shared/domain';
import { Icon, type IconName } from '@/shared/ui/Icon';

import styles from './MobileCallBar.module.css';

const HINTS: Record<CallState['status'], string> = {
  off: 'A chamada inicia ao entrar numa mesa, sala ou perto de alguém.',
  unavailable: 'Servidor sem LiveKit: voz e vídeo indisponíveis.',
  connecting: 'Conectando à chamada…',
  on: '',
};

const BUSY_HINT =
  'Você está indisponível. Toque em "Ficar online" para liberar áudio e câmera.';

const TOUCH_HOLD_MS = 500;

type Props = {
  me: { name: string; status: Status; appearance: Appearance } | undefined;
  call: CallState;
  hasDesk: boolean;
  onGoToMyDesk: () => void;
  inCallZone: boolean;
  optedOut: boolean;
  onLeaveCall: () => void;
  onJoinCall: () => void;
  selfCamExpanded: boolean;
  onToggleSelfCamExpand: () => void;
  onStatus: (status: Status) => void;
  onEmote: (emote: Emote) => void;
};

/**
 * Controles compactos de chamada e ações do mapa para Mobile:
 * - Pílula flutuante discreta acima da Bottom Navigation (retrato) ou canto inferior esquerdo (paisagem);
 * - Prévia da própria câmera em formato PiP flutuante no canto superior esquerdo (toque para ampliar);
 * - Segurar (0,5s) fone, mic ou câmera abre o menu de dispositivos.
 */
export function MobileCallBar({
  me,
  call,
  hasDesk,
  onGoToMyDesk,
  inCallZone,
  optedOut,
  onLeaveCall,
  onJoinCall,
  selfCamExpanded,
  onToggleSelfCamExpand,
  onStatus,
  onEmote,
}: Props) {
  const [emotesOpen, setEmotesOpen] = useState(false);
  const [deviceMenu, setDeviceMenu] = useState<MediaDeviceKindOption | null>(
    null,
  );
  const [holdingKind, setHoldingKind] = useState<MediaDeviceKindOption | null>(
    null,
  );
  const [hint, setHint] = useState('');
  const [dismissedSession, setDismissedSession] = useState(0);

  const holdTimerRef = useRef<number | null>(null);
  const holdOpenedRef = useRef(false);

  const live = call.status === 'on';
  const busy = isUnavailableStatus(me?.status);

  const showMutedBanner =
    live &&
    !busy &&
    !call.mic &&
    call.sessionId > 0 &&
    dismissedSession !== call.sessionId;

  useEffect(() => {
    if (!hint) return;
    const timer = window.setTimeout(() => setHint(''), 3500);
    return () => window.clearTimeout(timer);
  }, [hint]);

  useEffect(() => {
    if (!showMutedBanner) return;
    const current = call.sessionId;
    const timer = window.setTimeout(() => setDismissedSession(current), 5000);
    return () => window.clearTimeout(timer);
  }, [showMutedBanner, call.sessionId]);

  useEffect(
    () => () => {
      if (holdTimerRef.current !== null) {
        window.clearTimeout(holdTimerRef.current);
      }
    },
    [],
  );

  const startHold = (kind: MediaDeviceKindOption) => {
    holdOpenedRef.current = false;
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
    }
    setHoldingKind(kind);
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null;
      setHoldingKind(null);
      holdOpenedRef.current = true;
      setEmotesOpen(false);
      setDeviceMenu(kind);
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(12);
      }
    }, TOUCH_HOLD_MS);
  };

  const cancelHold = () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldingKind(null);
  };

  const runAction =
    (action: () => void, needsLive = true) =>
    () => {
      if (holdOpenedRef.current) {
        holdOpenedRef.current = false;
        return;
      }
      if (busy) {
        setHint(BUSY_HINT);
        return;
      }
      if (needsLive && !live) {
        setHint(HINTS[call.status]);
        return;
      }
      action();
    };

  const closePopups = () => {
    setEmotesOpen(false);
    setDeviceMenu(null);
  };

  const mediaButton = (
    on: boolean,
    iconOn: IconName,
    iconOff: IconName,
    label: string,
    action: () => void,
    kind: MediaDeviceKindOption,
    needsLive = true,
  ) => {
    const blocked = busy || (needsLive && !live);
    return (
      <div
        className={styles.btnWrap}
        onPointerDown={() => startHold(kind)}
        onPointerUp={cancelHold}
        onPointerCancel={cancelHold}
        onPointerLeave={cancelHold}
      >
        {holdingKind === kind ? (
          <span className={styles.holdRing} aria-hidden="true" />
        ) : null}
        <button
          type="button"
          aria-label={label}
          aria-pressed={on}
          aria-disabled={blocked}
          onClick={runAction(action, needsLive)}
          className={`${styles.circle} ${
            blocked
              ? styles.circleIdle
              : on
                ? styles.circleOn
                : styles.circleOff
          } ${busy ? styles.circleBusy : ''}`}
        >
          <Icon
            name={on ? iconOn : iconOff}
            size={17}
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
    );
  };

  return (
    <>
      {emotesOpen || deviceMenu !== null ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Fechar menu"
          onClick={closePopups}
        />
      ) : null}

      {/* Avisos compactos abaixo do topo */}
      <div className={styles.notices}>
        {hint ? (
          <div className={styles.toast} role="status">
            {hint}
          </div>
        ) : null}
        {call.error ? (
          <div className={`${styles.toast} ${styles.toastError}`} role="alert">
            {call.error}
          </div>
        ) : null}
        {call.audioBlocked && live && !busy && call.audioOn ? (
          <button
            type="button"
            className={styles.toastAction}
            onClick={call.startAudio}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Volume2 size={14} aria-hidden={true} />
            <span>Toque para liberar o som da chamada</span>
          </button>
        ) : null}
        {showMutedBanner ? (
          <div className={styles.mutedPill} role="status">
            <span>Microfone mutado</span>
            <button
              type="button"
              className={styles.unmuteBtn}
              onClick={() => {
                setDismissedSession(call.sessionId);
                call.toggleMic();
              }}
            >
              Ativar
            </button>
            <button
              type="button"
              className={styles.closeTiny}
              aria-label="Fechar aviso"
              onClick={() => setDismissedSession(call.sessionId)}
            >
              <X size={12} aria-hidden={true} />
            </button>
          </div>
        ) : null}
      </div>

      {/* Pílula flutuante de controles */}
      <div
        className={styles.dock}
        onContextMenu={(event) => event.preventDefault()}
      >
        {emotesOpen ? (
          <div className={styles.emoteTray} role="menu" aria-label="Emotes">
            {EMOTES.map((emote) => (
              <button
                key={emote}
                type="button"
                role="menuitem"
                className={styles.emoteBtn}
                onClick={() => {
                  onEmote(emote);
                  setEmotesOpen(false);
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
            cameraActive={call.cam}
            onSelect={(id) => {
              call.switchDevice(deviceMenu, id);
              setDeviceMenu(null);
            }}
            onMouseEnter={() => {}}
            onMouseLeave={() => {}}
          />
        ) : null}

        <div className={styles.pill}>
          {mediaButton(
            call.audioOn,
            'headphones',
            'headphonesOff',
            call.audioOn ? 'Mutar áudio' : 'Ativar áudio',
            call.toggleAudio,
            'audiooutput',
            false,
          )}
          {mediaButton(
            call.mic,
            'mic',
            'micOff',
            call.mic ? 'Desligar microfone' : 'Ligar microfone',
            call.toggleMic,
            'audioinput',
          )}
          {mediaButton(
            call.cam,
            'video',
            'videoOff',
            call.cam ? 'Desligar câmera' : 'Ligar câmera',
            call.toggleCam,
            'videoinput',
          )}

          <button
            type="button"
            aria-label={call.screen ? 'Parar tela' : 'Compartilhar tela'}
            aria-pressed={call.screen}
            aria-disabled={busy || !live}
            onClick={runAction(call.toggleScreen)}
            className={`${styles.circle} ${call.screen ? styles.circleOn : styles.circleIdle} ${busy ? styles.circleBusy : ''}`}
          >
            <Icon
              name="screen"
              size={17}
              color={
                call.screen
                  ? 'var(--call-on-icon)'
                  : !busy && live
                    ? 'var(--text-icon)'
                    : 'var(--text-icon-idle)'
              }
            />
          </button>

          <button
            type="button"
            aria-label="Emotes"
            aria-pressed={emotesOpen}
            onClick={() => {
              setDeviceMenu(null);
              setEmotesOpen((prev) => !prev);
            }}
            className={`${styles.circle} ${emotesOpen ? styles.circleActive : styles.circleIdle}`}
          >
            <Icon
              name="smile"
              size={17}
              color={emotesOpen ? '#ffffff' : 'var(--text-icon)'}
            />
          </button>

          <button
            type="button"
            aria-label="Ir até minha mesa"
            disabled={!hasDesk}
            onClick={onGoToMyDesk}
            className={`${styles.circle} ${styles.circleIdle} ${!hasDesk ? styles.circleDisabled : ''}`}
          >
            <Icon
              name="desk"
              size={17}
              color={hasDesk ? 'var(--text-icon)' : 'var(--text-disabled)'}
            />
          </button>

          {busy ? (
            <button
              type="button"
              className={styles.goOnlinePillBtn}
              onClick={() => onStatus('available')}
            >
              <span className={styles.onlineDot} />
              <span>Ficar online</span>
            </button>
          ) : (
            <>
              {inCallZone && selfCamExpanded ? (
                <button
                  type="button"
                  aria-label="Reduzir câmera"
                  onClick={onToggleSelfCamExpand}
                  className={`${styles.circle} ${styles.circleActive}`}
                >
                  <Icon name="shrink" size={16} color="#ffffff" />
                </button>
              ) : null}

              {inCallZone && call.status !== 'unavailable' ? (
                optedOut ? (
                  <button
                    type="button"
                    aria-label="Voltar para a chamada"
                    onClick={onJoinCall}
                    className={`${styles.circle} ${styles.circleJoin}`}
                  >
                    <Icon name="phone" size={16} color="#ffffff" />
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label="Sair da chamada"
                    onClick={onLeaveCall}
                    className={`${styles.circle} ${styles.circleLeave}`}
                  >
                    <Icon name="phoneOff" size={16} color="#ffffff" />
                  </button>
                )
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
}
