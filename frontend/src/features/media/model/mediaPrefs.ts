import { create } from 'zustand';

type Prefs = {
  /** A pessoa ligou o microfone nesta sequência de chamadas. */
  mic: boolean;
  /** A pessoa ligou a câmera nesta sequência de chamadas. */
  cam: boolean;
  /** Áudio das chamadas mutado (não ouve os outros participantes). */
  deafened: boolean;
  /** Dispositivos escolhidos pela pessoa (string vazia = padrão do sistema). */
  audioInputId: string;
  audioOutputId: string;
  videoInputId: string;
  setMic: (on: boolean) => void;
  setCam: (on: boolean) => void;
  setDeafened: (on: boolean) => void;
  setAudioInputId: (id: string) => void;
  setAudioOutputId: (id: string) => void;
  setVideoInputId: (id: string) => void;
  /** Saiu de uma chamada: desliga câmera, mas mantém o microfone como estava. */
  resetVideo: () => void;
  /** Desliga microfone e câmera (ex.: status Ocupado ou Ausente). */
  reset: () => void;
};

/**
 * Microfone e câmera começam sempre desligados: quem liga é a pessoa. Ao sair
 * de uma chamada, câmera e tela desligam, mas o microfone só muta por
 * inatividade (~1 minuto parado) ou ação do usuário.
 */
export const useMediaPrefs = create<Prefs>((set) => ({
  mic: false,
  cam: false,
  deafened: false,
  audioInputId: '',
  audioOutputId: '',
  videoInputId: '',
  setMic: (mic) => set({ mic }),
  setCam: (cam) => set({ cam }),
  setDeafened: (deafened) => set({ deafened }),
  setAudioInputId: (audioInputId) => set({ audioInputId }),
  setAudioOutputId: (audioOutputId) => set({ audioOutputId }),
  setVideoInputId: (videoInputId) => set({ videoInputId }),
  resetVideo: () => set({ cam: false }),
  reset: () => set({ mic: false, cam: false }),
}));
