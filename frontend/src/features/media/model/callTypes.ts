import type { Track } from 'livekit-client';

import type { WorldSnapshot } from '@/features/office/model/officeWorld';

/** Acesso à chamada de uma zona, vindo do servidor. */
export type MediaAccess = {
  url: string;
  token: string;
  /** Zona de chamada (ex.: "mesa-1"). */
  zone: string;
  /** Sala do mapa em que o acesso foi pedido. */
  map: string;
};

export type SignalQuality = 'good' | 'ok' | 'poor' | 'unknown';

/** Um quadro de vídeo na tela de chamada: câmera ou tela de uma pessoa. */
export type CallTile = {
  key: string;
  label: string;
  /** Cor da pessoa (camisa), para o fundo quando não há imagem. */
  color: number;
  self: boolean;
  kind: 'camera' | 'screen';
  /** Faixa de vídeo do LiveKit. `null` quando a câmera está desligada. */
  track: Track | null;
  micOn: boolean;
  speaking: boolean;
  quality: SignalQuality;
};

export type CallStatus =
  /** Fora de qualquer zona (estrada): sem chamada. */
  | 'off'
  /** Numa zona, mas o servidor não tem LiveKit. */
  | 'unavailable'
  | 'connecting'
  | 'on';

export type MediaDeviceKindOption = 'audioinput' | 'audiooutput' | 'videoinput';

export type CallState = {
  status: CallStatus;
  zone: string | null;
  mic: boolean;
  /** Som dos outros participantes ligado (`false` = áudio mutado). */
  audioOn: boolean;
  cam: boolean;
  screen: boolean;
  /** O navegador bloqueou o som até o primeiro clique. */
  audioBlocked: boolean;
  error: string;
  tiles: CallTile[];
  /** Ids dos jogadores que estão falando neste momento na chamada. */
  speakingIds: string[];
  /** Identificador único da chamada atual (muda a cada nova entrada em call). */
  sessionId: number;
  toggleMic: () => void;
  muteMic: () => void;
  toggleAudio: () => void;
  toggleCam: () => void;
  toggleScreen: () => void;
  setAudioOn: (on: boolean) => void;
  /** Troca o dispositivo ativo de microfone, saída de áudio ou webcam. */
  switchDevice: (kind: MediaDeviceKindOption, deviceId: string) => void;
  /** Desliga microfone, câmera e compartilhamento de tela (usado ao mudar para Ocupado ou Ausente). */
  silenceLocal: () => void;
  startAudio: () => void;
};

export type UseCallOptions = {
  access: MediaAccess | null;
  /**
   * A pessoa deveria estar numa chamada (zona ou conversa por perto). Ao trocar
   * de uma chamada para outra, microfone e câmera ficam como estavam; ao sair
   * de todas, desligam.
   */
  inCall: boolean;
  unavailable: boolean;
  /** Status Ocupado: impede reativar microfone, áudio, câmera e tela até voltar online. */
  lockedByBusy?: boolean;
  /** Posições de hoje, lidas nos eventos para dar nome e cor a cada quadro. */
  snapshotRef: { current: WorldSnapshot };
};
