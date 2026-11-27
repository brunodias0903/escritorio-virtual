const SOUND_KEY = 'voffice:notify-sound:v1';

let sharedCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new AudioCtx();
  }
  return sharedCtx;
};

/** Desbloqueia o AudioContext no primeiro toque/clique (essencial em PWA mobile). */
export const unlockNotifyAudio = (): void => {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
};

export const isNotifySoundEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
};

export const setNotifySoundEnabled = (enabled: boolean): void => {
  try {
    window.localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off');
  } catch {
    // storage indisponível
  }
};

/**
 * Toca um aviso sonoro suave via Web Audio API (100% gratuito, sem arquivos externos).
 * - `mention`: acorde ascendente de 3 notas para menções (@) e alertas prioritários.
 * - `message`: 2 notas suaves para mensagens comuns.
 * - `join`: 2 notas graves suaves para entrada na chamada.
 */
export const playNotifyChime = (
  kind: 'message' | 'mention' | 'join' = 'message',
): void => {
  if (typeof window === 'undefined' || !isNotifySoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const notes =
      kind === 'mention'
        ? [659.25, 880, 1046.5]
        : kind === 'join'
          ? [523.25, 659.25]
          : [587.33, 880];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === 'mention' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.0001, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(
        kind === 'mention' ? 0.08 : 0.06,
        now + i * 0.08 + 0.02,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.26);
    });
  } catch {
    // áudio bloqueado pelo navegador
  }
};
