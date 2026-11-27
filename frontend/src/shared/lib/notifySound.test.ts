import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  isNotifySoundEnabled,
  playNotifyChime,
  setNotifySoundEnabled,
  unlockNotifyAudio,
} from './notifySound';

describe('notifySound', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('persiste preferência de som e toca chimes para message, mention e join', () => {
    const storage = new Map<string, string>();
    const localStorageMock = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
    };
    vi.stubGlobal('localStorage', localStorageMock);

    const start = vi.fn();
    const stop = vi.fn();
    const connect = vi.fn();
    const resume = vi.fn().mockResolvedValue(undefined);
    class FakeAudioContext {
      state = 'suspended';
      currentTime = 0;
      destination = {};
      resume = resume;
      createOscillator() {
        return {
          type: 'sine',
          frequency: { setValueAtTime: vi.fn() },
          connect,
          start,
          stop,
        };
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect,
        };
      }
    }
    vi.stubGlobal('AudioContext', FakeAudioContext);
    vi.stubGlobal('window', {
      localStorage: localStorageMock,
      AudioContext: FakeAudioContext,
    });

    expect(isNotifySoundEnabled()).toBe(true);
    unlockNotifyAudio();
    expect(resume).toHaveBeenCalled();

    playNotifyChime('message');
    expect(start).toHaveBeenCalledTimes(2);

    playNotifyChime('mention');
    expect(start).toHaveBeenCalledTimes(5);

    playNotifyChime('join');
    expect(start).toHaveBeenCalledTimes(7);

    setNotifySoundEnabled(false);
    expect(isNotifySoundEnabled()).toBe(false);
    playNotifyChime('mention');
    expect(start).toHaveBeenCalledTimes(7);

    setNotifySoundEnabled(true);
    expect(isNotifySoundEnabled()).toBe(true);
  });
});
