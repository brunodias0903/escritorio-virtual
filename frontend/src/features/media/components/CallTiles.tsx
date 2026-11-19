import { useEffect, useRef, useState, type ReactNode } from 'react';

import { useWindowSize } from '@/shared/hooks/useWindowSize';
import { toHexColor } from '@/shared/lib/color';
import { Icon, type IconName } from '@/shared/ui/Icon';

import type { CallTile, SignalQuality } from '../model/callTypes';
import {
  FOCUS_SIDEBAR_WIDTH,
  SCREEN_RATIO,
  TILE_GAP,
  TILE_RATIO,
  focusLayout,
  rowLayout,
} from '../model/tileLayout';
import styles from './CallTiles.module.css';

export type CallTilesProps = {
  tiles: CallTile[];
  /** Largura da área do mapa, para repartir os quadros. */
  width: number;
  /** Tela pequena: quadros menores e o meu vai para o canto de cima. */
  compact: boolean;
};

const SIGNAL_COLORS: Record<SignalQuality, string> = {
  good: '#31e0c1',
  ok: '#f1c40f',
  poor: '#ff6b81',
  unknown: '#6b72a8',
};

/** Espaço livre em cima (etiquetas da sala) e embaixo (barra de botões). */
const FOCUS_TOP = 56;
const FOCUS_BOTTOM = 76;

/** Três barrinhas que mostram a qualidade da conexão. */
function SignalBars({ quality }: { quality: SignalQuality }) {
  const lit =
    quality === 'good' ? 3 : quality === 'ok' ? 2 : quality === 'poor' ? 1 : 0;
  return (
    <div className={styles.signal} aria-hidden="true">
      {[6, 10, 14].map((height, index) => (
        <span
          key={height}
          className={styles.signalBar}
          style={{
            height,
            backgroundColor:
              index < lit ? SIGNAL_COLORS[quality] : 'rgba(255,255,255,0.25)',
          }}
        />
      ))}
    </div>
  );
}

function Tile({
  tile,
  width,
  height,
  children,
}: {
  tile: CallTile;
  width: number;
  height: number;
  /** Botões por cima do quadro. */
  children?: ReactNode;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const { track } = tile;

  useEffect(() => {
    const element = video.current;
    if (!element || !track) return;
    track.attach(element);
    return () => {
      track.detach(element);
    };
  }, [track]);

  const initial = tile.label
    .replace(/^Você$/, 'V')
    .charAt(0)
    .toUpperCase();
  const color = toHexColor(tile.color);

  return (
    <div
      className={`${styles.tile} ${tile.speaking ? styles.speaking : ''}`}
      style={{ width, height }}
    >
      {track ? (
        <video
          ref={video}
          autoPlay
          playsInline
          muted
          className={styles.video}
          style={{
            objectFit: tile.kind === 'screen' ? 'contain' : 'cover',
            transform:
              tile.self && tile.kind === 'camera' ? 'scaleX(-1)' : undefined,
          }}
        />
      ) : (
        <div className={styles.placeholder}>
          <div className={styles.tint} style={{ backgroundColor: color }} />
          <div className={styles.disc} style={{ backgroundColor: color }}>
            <span className={styles.discText}>{initial}</span>
          </div>
        </div>
      )}

      <div className={styles.namePill}>
        <span className={styles.nameText}>{tile.label}</span>
      </div>

      {tile.self ? (
        <div className={styles.corner}>
          <SignalBars quality={tile.quality} />
        </div>
      ) : !tile.micOn ? (
        <div className={`${styles.corner} ${styles.mutedBadge}`}>
          <Icon name="micOff" size={14} color="#ffd1d8" />
        </div>
      ) : null}
      {children}
    </div>
  );
}

/** Botão redondo sobre um quadro (ampliar ou reduzir a tela). */
function TileButton({
  icon,
  label,
  onClick,
  big = false,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  big?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`${styles.tileButton} ${big ? styles.tileButtonBig : ''}`}
    >
      <Icon name={icon} size={big ? 18 : 16} color="#ffffff" />
      {big ? <span className={styles.tileButtonText}>{label}</span> : null}
    </button>
  );
}

/**
 * Quadros da chamada:
 * - os outros (câmeras e telas) em fileira no alto;
 * - a minha câmera no canto de baixo, e a minha tela pequena ao lado dela;
 * - uma tela de outra pessoa pode ser ampliada (como no Meet e no Teams):
 *   ela fica grande à esquerda e as pessoas numa coluna à direita.
 */
export function CallTiles({ tiles, width, compact }: CallTilesProps) {
  const { height: windowHeight } = useWindowSize();
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const mine = tiles.filter((t) => t.self && t.kind === 'camera');
  const myShare = tiles.filter((t) => t.self && t.kind === 'screen');
  const shares = tiles.filter((t) => !t.self && t.kind === 'screen');
  const others = tiles.filter((t) => !t.self && t.kind === 'camera');

  // Se a tela ampliada parar de ser compartilhada, volta ao normal sozinho.
  const focused = shares.find((t) => t.key === focusKey) ?? null;

  const selfWidth = compact ? 112 : 200;
  const selfHeight = selfWidth * TILE_RATIO;

  if (focused && !compact) {
    const big = focusLayout(width, windowHeight - FOCUS_TOP - FOCUS_BOTTOM);
    const people = [...mine, ...others, ...myShare, ...shares].filter(
      (t) => t.key !== focused.key,
    );
    const sideWidth = FOCUS_SIDEBAR_WIDTH - TILE_GAP;
    return (
      <div className={styles.focus}>
        <div className={styles.focusMain}>
          <Tile tile={focused} width={big.width} height={big.height}>
            <div className={styles.tileActions}>
              <TileButton
                big
                icon="shrink"
                label="Reduzir"
                onClick={() => setFocusKey(null)}
              />
            </div>
          </Tile>
        </div>
        <div
          className={styles.focusSide}
          style={{ width: FOCUS_SIDEBAR_WIDTH - TILE_GAP }}
        >
          {people.map((tile) => (
            <Tile
              key={tile.key}
              tile={tile}
              width={sideWidth}
              height={
                tile.kind === 'screen'
                  ? sideWidth * SCREEN_RATIO
                  : sideWidth * TILE_RATIO
              }
            >
              {tile.kind === 'screen' && !tile.self ? (
                <div className={styles.tileActions}>
                  <TileButton
                    icon="expand"
                    label="Ampliar esta tela"
                    onClick={() => setFocusKey(tile.key)}
                  />
                </div>
              ) : null}
            </Tile>
          ))}
        </div>
      </div>
    );
  }

  const row = rowLayout(width, others.length, shares.length);

  return (
    <div className={styles.layer}>
      {shares.length + others.length > 0 ? (
        <div className={`${styles.row} ${compact ? styles.rowCompact : ''}`}>
          {shares.map((tile) => (
            <Tile
              key={tile.key}
              tile={tile}
              width={row.screenWidth}
              height={row.height}
            >
              {!compact ? (
                <div className={styles.tileActions}>
                  <TileButton
                    icon="expand"
                    label="Ampliar a tela"
                    onClick={() => setFocusKey(tile.key)}
                  />
                </div>
              ) : null}
            </Tile>
          ))}
          {others.map((tile) => (
            <Tile
              key={tile.key}
              tile={tile}
              width={row.cameraWidth}
              height={row.height}
            />
          ))}
        </div>
      ) : null}

      {/* A minha câmera e, ao lado dela, a minha tela pequena. */}
      {mine.length + myShare.length > 0 ? (
        <div className={compact ? styles.selfCompact : styles.self}>
          {mine.map((tile) => (
            <Tile
              key={tile.key}
              tile={tile}
              width={selfWidth}
              height={selfHeight}
            />
          ))}
          {myShare.map((tile) => (
            <Tile
              key={tile.key}
              tile={tile}
              width={selfHeight / SCREEN_RATIO}
              height={selfHeight}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
