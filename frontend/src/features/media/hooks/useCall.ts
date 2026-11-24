import {
  ConnectionQuality,
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type Participant,
  type RemoteTrack,
} from 'livekit-client';
import { useEffect, useRef, useState } from 'react';

import { resolveMediaUrl } from '@/shared/lib/mediaUrl';

import type {
  CallState,
  CallTile,
  MediaDeviceKindOption,
  SignalQuality,
  UseCallOptions,
} from '../model/callTypes';
import { describeMediaError } from '../model/mediaErrors';
import { useMediaPrefs } from '../model/mediaPrefs';

type Snap = Pick<
  CallState,
  'mic' | 'cam' | 'screen' | 'audioBlocked' | 'tiles' | 'speakingIds'
> & { connected: boolean };

const EMPTY: Snap = {
  connected: false,
  mic: false,
  cam: false,
  screen: false,
  audioBlocked: false,
  tiles: [],
  speakingIds: [],
};

const QUALITY: Record<string, SignalQuality> = {
  [ConnectionQuality.Excellent]: 'good',
  [ConnectionQuality.Good]: 'ok',
  [ConnectionQuality.Poor]: 'poor',
};

/** A faixa de vídeo ou tela, só se estiver ligada. Câmera desligada = sem imagem (vira a inicial). */
const trackOf = (participant: Participant, source: Track.Source) => {
  const publication = participant.getTrackPublication(source);
  return publication && !publication.isMuted
    ? (publication.track ?? null)
    : null;
};

/** Quadros da chamada: o meu, o de cada pessoa da zona e as telas compartilhadas. */
const buildSnap = (
  room: Room,
  names: Map<string, { name: string; color: number }>,
): Snap => {
  const local = room.localParticipant;

  const tilesOf = (participant: Participant, self: boolean): CallTile[] => {
    const who = names.get(participant.identity);
    const label = self ? 'Você' : (who?.name ?? participant.name ?? 'Alguém');
    const base = {
      color: who?.color ?? 0x5b6cff,
      self,
      micOn: participant.isMicrophoneEnabled,
      speaking: participant.isSpeaking,
      quality: QUALITY[participant.connectionQuality] ?? 'unknown',
    };
    const screen = trackOf(participant, Track.Source.ScreenShare);
    return [
      {
        ...base,
        key: `${participant.identity}-camera`,
        label,
        kind: 'camera',
        track: trackOf(participant, Track.Source.Camera),
      },
      ...(screen
        ? [
            {
              ...base,
              key: `${participant.identity}-screen`,
              label: `${label} (tela)`,
              kind: 'screen' as const,
              track: screen,
            },
          ]
        : []),
    ];
  };

  const speakingIds = [
    ...(local.isSpeaking ? [local.identity] : []),
    ...[...room.remoteParticipants.values()]
      .filter((p) => p.isSpeaking)
      .map((p) => p.identity),
  ];

  return {
    connected: room.state === ConnectionState.Connected,
    mic: local.isMicrophoneEnabled,
    cam: local.isCameraEnabled,
    screen: local.isScreenShareEnabled,
    audioBlocked: !room.canPlaybackAudio,
    speakingIds,
    tiles: [
      ...tilesOf(local, true),
      ...[...room.remoteParticipants.values()].flatMap((p) =>
        tilesOf(p, false),
      ),
    ],
  };
};

/**
 * Chamada de voz e vídeo (LiveKit) da zona ou da conversa por perto. Entra
 * sozinho na chamada, mas com microfone e câmera desligados: quem liga é a
 * pessoa. Ao passar direto para outra chamada, mantém o que estava ligado.
 */
export function useCall({
  access,
  inCall,
  unavailable,
  lockedByBusy = false,
  snapshotRef,
}: UseCallOptions): CallState {
  const room = useRef<Room | null>(null);
  const publish = useRef<() => void>(() => {});
  const audioElementsRef = useRef<Map<string, HTMLMediaElement>>(new Map());
  const lockedByBusyRef = useRef(lockedByBusy);
  const deafened = useMediaPrefs((state) => state.deafened);
  const [snap, setSnap] = useState<Snap>(EMPTY);
  const [sessionId, setSessionId] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    lockedByBusyRef.current = lockedByBusy;
  }, [lockedByBusy]);

  // Mantém todos os elementos de áudio remotos sincronizados com o botão de mutar áudio.
  useEffect(() => {
    for (const element of audioElementsRef.current.values()) {
      element.muted = deafened;
    }
  }, [deafened]);

  // Saiu de uma chamada: desliga câmera (e tela desconecta), mas não muta o microfone.
  useEffect(() => {
    if (!inCall) useMediaPrefs.getState().resetVideo();
  }, [inCall]);

  useEffect(() => {
    if (!access) return;
    const next = new Room({ adaptiveStream: true, dynacast: true });
    room.current = next;
    let alive = true;
    const audioElements = new Map<string, HTMLMediaElement>();
    audioElementsRef.current = audioElements;

    const update = () => {
      if (!alive) return;
      const names = new Map(
        snapshotRef.current.players.map((p) => [
          p.id,
          { name: p.name, color: p.color },
        ]),
      );
      setSnap(buildSnap(next, names));
    };
    publish.current = update;

    for (const event of [
      RoomEvent.TrackPublished,
      RoomEvent.TrackMuted,
      RoomEvent.TrackUnmuted,
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.LocalTrackPublished,
      RoomEvent.LocalTrackUnpublished,
      RoomEvent.ActiveSpeakersChanged,
      RoomEvent.ConnectionQualityChanged,
      RoomEvent.AudioPlaybackStatusChanged,
      RoomEvent.Disconnected,
    ] as const) {
      next.on(event, update);
    }

    next
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication) => {
        if (track.kind === Track.Kind.Audio) {
          const element = track.attach();
          const prefs = useMediaPrefs.getState();
          element.muted = prefs.deafened;
          const sink = element as HTMLMediaElement & {
            setSinkId?: (id: string) => Promise<void>;
          };
          if (prefs.audioOutputId && typeof sink.setSinkId === 'function') {
            void sink.setSinkId(prefs.audioOutputId).catch(() => {});
          }
          document.body.appendChild(element);
          audioElements.set(publication.trackSid, element);
        }
        update();
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication) => {
        audioElements.get(publication.trackSid)?.remove();
        audioElements.delete(publication.trackSid);
        track.detach();
        update();
      });

    const url = resolveMediaUrl(access.url, window.location.hostname);
    next
      .connect(url, access.token)
      .then(async () => {
        if (!alive) return;
        setError('');
        setSessionId((id) => id + 1);
        update();
        // Trocou direto de chamada: religa só o que a pessoa já tinha ligado (exceto se Ocupado).
        // Cada um por conta própria, para uma câmera negada não derrubar o microfone.
        if (!lockedByBusyRef.current) {
          const prefs = useMediaPrefs.getState();
          for (const [wanted, kind, enable] of [
            [
              prefs.mic,
              'mic' as const,
              () =>
                next.localParticipant.setMicrophoneEnabled(
                  true,
                  prefs.audioInputId
                    ? { deviceId: prefs.audioInputId }
                    : undefined,
                ),
            ],
            [
              prefs.cam,
              'cam' as const,
              () =>
                next.localParticipant.setCameraEnabled(
                  true,
                  prefs.videoInputId
                    ? { deviceId: prefs.videoInputId }
                    : undefined,
                ),
            ],
          ] as const) {
            if (!wanted || !alive) continue;
            try {
              await enable();
            } catch (reason) {
              if (alive) {
                setError(
                  describeMediaError(reason, window.isSecureContext, kind),
                );
              }
            }
          }
        }
        update();
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        const detail =
          reason instanceof Error ? reason.message : String(reason);
        setError(`Não foi possível entrar na chamada (${detail}).`);
      });

    return () => {
      alive = false;
      // Ao encerrar/trocar de sala de chamada, garante que câmera e captura de tela desliguem.
      useMediaPrefs.getState().resetVideo();
      for (const element of audioElements.values()) element.remove();
      if (audioElementsRef.current === audioElements) {
        audioElementsRef.current = new Map();
      }
      void next.disconnect();
      if (room.current === next) room.current = null;
      publish.current = () => {};
      setSnap(EMPTY);
      setError('');
    };
  }, [access, snapshotRef]);

  const muteMic = () => {
    useMediaPrefs.getState().setMic(false);
    const local = room.current?.localParticipant;
    if (!local) return;
    void (async () => {
      try {
        if (local.isMicrophoneEnabled) await local.setMicrophoneEnabled(false);
      } catch {
        // ignora erro ao mutar microfone
      } finally {
        publish.current();
      }
    })();
  };

  const setAudioOn = (on: boolean) => {
    useMediaPrefs.getState().setDeafened(!on);
    for (const element of audioElementsRef.current.values()) {
      element.muted = !on;
    }
    if (on) void room.current?.startAudio();
  };

  const silenceLocal = () => {
    useMediaPrefs.getState().reset();
    const local = room.current?.localParticipant;
    if (!local) return;
    void (async () => {
      try {
        if (local.isMicrophoneEnabled) await local.setMicrophoneEnabled(false);
        if (local.isCameraEnabled) await local.setCameraEnabled(false);
        if (local.isScreenShareEnabled) {
          await local.setScreenShareEnabled(false);
        }
      } catch {
        // ignora erro ao desligar faixas locais
      } finally {
        publish.current();
      }
    })();
  };

  const toggleAudio = () => {
    if (lockedByBusyRef.current) return;
    setAudioOn(useMediaPrefs.getState().deafened);
  };

  const switchDevice = (kind: MediaDeviceKindOption, deviceId: string) => {
    const prefs = useMediaPrefs.getState();
    if (kind === 'audioinput') prefs.setAudioInputId(deviceId);
    if (kind === 'audiooutput') prefs.setAudioOutputId(deviceId);
    if (kind === 'videoinput') prefs.setVideoInputId(deviceId);

    if (kind === 'audiooutput') {
      for (const element of audioElementsRef.current.values()) {
        const sink = element as HTMLMediaElement & {
          setSinkId?: (id: string) => Promise<void>;
        };
        if (typeof sink.setSinkId === 'function') {
          void sink.setSinkId(deviceId).catch(() => {});
        }
      }
    }

    const activeRoom = room.current;
    if (activeRoom && deviceId) {
      void activeRoom.switchActiveDevice(kind, deviceId).catch(() => {});
    }
  };

  const toggle = (what: 'mic' | 'cam' | 'screen') => {
    if (lockedByBusyRef.current) return;
    const local = room.current?.localParticipant;
    if (!local) return;
    void (async () => {
      try {
        setError('');
        // O navegador só toca o som depois de um clique: este clique libera.
        await room.current?.startAudio();
        const prefs = useMediaPrefs.getState();
        if (what === 'mic') {
          const on = !local.isMicrophoneEnabled;
          prefs.setMic(on);
          await local.setMicrophoneEnabled(
            on,
            on && prefs.audioInputId
              ? { deviceId: prefs.audioInputId }
              : undefined,
          );
        }
        if (what === 'cam') {
          const on = !local.isCameraEnabled;
          prefs.setCam(on);
          await local.setCameraEnabled(
            on,
            on && prefs.videoInputId
              ? { deviceId: prefs.videoInputId }
              : undefined,
          );
        }
        if (what === 'screen') {
          const wantOn = !local.isScreenShareEnabled;
          if (
            wantOn &&
            typeof navigator.mediaDevices?.getDisplayMedia !== 'function'
          ) {
            setError(
              describeMediaError(
                { name: 'UnsupportedScreenShare' },
                window.isSecureContext,
                'screen',
              ),
            );
            return;
          }
          await local.setScreenShareEnabled(wantOn);
        }
        publish.current();
      } catch (reason) {
        if (what === 'mic') useMediaPrefs.getState().setMic(false);
        if (what === 'cam') useMediaPrefs.getState().setCam(false);
        setError(describeMediaError(reason, window.isSecureContext, what));
      }
    })();
  };

  const status = access
    ? snap.connected
      ? 'on'
      : 'connecting'
    : unavailable
      ? 'unavailable'
      : 'off';

  return {
    status,
    zone: access?.zone ?? null,
    mic: snap.mic,
    audioOn: !deafened,
    cam: snap.cam,
    screen: snap.screen,
    audioBlocked: snap.audioBlocked,
    error,
    tiles: snap.tiles,
    speakingIds: snap.speakingIds,
    sessionId,
    toggleMic: () => toggle('mic'),
    muteMic,
    toggleAudio,
    toggleCam: () => toggle('cam'),
    toggleScreen: () => toggle('screen'),
    setAudioOn,
    switchDevice,
    silenceLocal,
    startAudio: () => void room.current?.startAudio(),
  };
}
