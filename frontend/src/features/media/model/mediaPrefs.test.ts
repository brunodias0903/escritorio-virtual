import { beforeEach, describe, expect, it } from 'vitest';
import { useMediaPrefs } from './mediaPrefs';

describe('useMediaPrefs', () => {
  beforeEach(() => {
    useMediaPrefs.getState().reset();
    useMediaPrefs.getState().setDeafened(false);
  });

  it('começa com microfone e câmera desligados e áudio ligado', () => {
    expect(useMediaPrefs.getState()).toMatchObject({
      mic: false,
      cam: false,
      deafened: false,
    });
  });

  it('lembra o que a pessoa ligou, até sair de todas as chamadas', () => {
    useMediaPrefs.getState().setMic(true);
    expect(useMediaPrefs.getState()).toMatchObject({ mic: true, cam: false });
    useMediaPrefs.getState().setCam(true);
    expect(useMediaPrefs.getState()).toMatchObject({ mic: true, cam: true });
    useMediaPrefs.getState().setDeafened(true);
    expect(useMediaPrefs.getState().deafened).toBe(true);
    useMediaPrefs.getState().resetVideo();
    expect(useMediaPrefs.getState()).toMatchObject({
      mic: true,
      cam: false,
      deafened: true,
    });
    useMediaPrefs.getState().reset();
    expect(useMediaPrefs.getState()).toMatchObject({
      mic: false,
      cam: false,
      deafened: true,
    });
  });
});
