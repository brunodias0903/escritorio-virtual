import { useEffect, useRef, useState } from 'react';

import type { MediaDeviceKindOption } from '../model/callTypes';
import { useMediaPrefs } from '../model/mediaPrefs';
import styles from './DevicePopover.module.css';

const TITLES: Record<MediaDeviceKindOption, string> = {
  audiooutput: 'Dispositivo de saída',
  audioinput: 'Microfone',
  videoinput: 'Câmera',
};

const FALLBACK_LABELS: Record<MediaDeviceKindOption, string> = {
  audiooutput: 'Alto-falante',
  audioinput: 'Microfone',
  videoinput: 'Câmera',
};

type DeviceOption = {
  id: string;
  label: string;
};

type Props = {
  kind: MediaDeviceKindOption;
  /** Quando true, a própria câmera já está visível abaixo e não duplicamos o preview. */
  cameraActive?: boolean;
  onSelect: (deviceId: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

/**
 * Popover de seleção de dispositivos (saída de áudio, microfone ou webcam).
 * Para webcam, exibe um preview ao vivo espelhado quando a câmera ainda não está ligada.
 */
export function DevicePopover({
  kind,
  cameraActive = false,
  onSelect,
  onMouseEnter,
  onMouseLeave,
}: Props) {
  const selectedId = useMediaPrefs((s) =>
    kind === 'audiooutput'
      ? s.audioOutputId
      : kind === 'audioinput'
        ? s.audioInputId
        : s.videoInputId,
  );

  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewError, setPreviewError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!navigator.mediaDevices?.enumerateDevices) {
        if (alive) {
          setDevices([]);
          setLoading(false);
        }
        return;
      }
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        if (!alive) return;
        const filtered = all
          .filter((d) => d.kind === kind && d.deviceId)
          .map((d, index) => ({
            id: d.deviceId,
            label: d.label || `${FALLBACK_LABELS[kind]} ${index + 1}`,
          }));
        setDevices(filtered);
      } catch {
        if (alive) setDevices([]);
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [kind, reloadTick]);

  const showPreview = kind === 'videoinput' && !cameraActive;

  // Preview ao vivo da webcam somente quando a câmera está desligada (evita duplicar).
  useEffect(() => {
    if (!showPreview) return;
    if (!navigator.mediaDevices?.getUserMedia) return;

    let alive = true;
    let stream: MediaStream | null = null;
    const videoEl = videoRef.current;

    const startPreview = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          video: selectedId
            ? { deviceId: { exact: selectedId }, width: { ideal: 320 } }
            : { width: { ideal: 320 } },
          audio: false,
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!alive) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        setPreviewError('');
        if (videoEl) {
          videoEl.srcObject = stream;
        }
        // Após liberar permissão da câmera, recarrega os nomes reais das webcams.
        const refreshed = await navigator.mediaDevices.enumerateDevices();
        if (!alive) return;
        setDevices(
          refreshed
            .filter((d) => d.kind === 'videoinput' && d.deviceId)
            .map((d, index) => ({
              id: d.deviceId,
              label: d.label || `Câmera ${index + 1}`,
            })),
        );
      } catch {
        if (alive) {
          setPreviewError('Não foi possível abrir o preview da câmera.');
        }
      }
    };

    void startPreview();

    return () => {
      alive = false;
      if (stream) {
        for (const track of stream.getTracks()) track.stop();
      }
      if (videoEl) {
        videoEl.srcObject = null;
      }
    };
  }, [showPreview, selectedId]);

  const requestLabels = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === 'videoinput' ? { video: true } : { audio: true },
      );
      for (const track of stream.getTracks()) track.stop();
      setReloadTick((t) => t + 1);
    } catch {
      // usuário negou permissão
    }
  };

  const hasUnnamed = devices.some((d) =>
    d.label.startsWith(FALLBACK_LABELS[kind]),
  );

  return (
    <div
      className={styles.popover}
      role="dialog"
      aria-label={TITLES[kind]}
      data-scroll-lock="true"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={styles.header}>
        <span className={styles.title}>{TITLES[kind]}</span>
        {hasUnnamed ? (
          <button
            type="button"
            className={styles.permButton}
            onClick={() => void requestLabels()}
          >
            Ver nomes
          </button>
        ) : null}
      </div>

      {showPreview ? (
        <div className={styles.previewBox}>
          {previewError ? (
            <span className={styles.previewError}>{previewError}</span>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={styles.video}
            />
          )}
        </div>
      ) : null}

      <div className={styles.list}>
        {loading ? (
          <span className={styles.empty}>Carregando dispositivos…</span>
        ) : devices.length === 0 ? (
          <span className={styles.empty}>
            {kind === 'audiooutput'
              ? 'Usando a saída padrão do navegador.'
              : 'Nenhum dispositivo encontrado.'}
          </span>
        ) : (
          devices.map((device, index) => {
            const active = selectedId
              ? selectedId === device.id
              : index === 0 || device.id === 'default';
            return (
              <button
                key={device.id}
                type="button"
                className={`${styles.option} ${active ? styles.optionActive : ''}`}
                onClick={() => onSelect(device.id)}
              >
                <span
                  className={`${styles.dot} ${active ? styles.dotActive : ''}`}
                />
                <span className={styles.optionLabel}>{device.label}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
