const SOUND_KEY = 'voffice:notify-sound:v1';

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
 * Falha silenciosamente caso o navegador ainda não tenha liberado áudio.
 */
export const playNotifyChime = (kind: 'message' | 'join' = 'message'): void => {
  if (typeof window === 'undefined' || !isNotifySoundEnabled()) return;
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = kind === 'join' ? [523.25, 659.25] : [587.33, 880];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.0001, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.06, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.24);
    });

    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 500);
  } catch {
    // áudio bloqueado pelo navegador
  }
};
