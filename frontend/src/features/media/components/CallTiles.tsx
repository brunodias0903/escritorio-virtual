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
  /** Chave do quadro de câmera ampliado em destaque centralizado na parte inferior (ex.: 'self' ou tile.key). */
  spotlightKey?: string | null;
  onSpotlightChange?: (key: string | null) => void;
};

const SIGNAL_COLORS: Record<SignalQuality, string> = {
  good: '#31e0c1',
  ok: '#f1c40f',
  poor: '#ff6b81',
  unknown: '#6b72a8',
};

/** Ordena participantes priorizando tela compartilhada, câmera ligada e quem está falando. */
function tilePriority(tile: CallTile): number {
  let score = 0;
  if (tile.kind === 'screen') score += 100;
  if (tile.track !== null) score += 40;
  if (tile.speaking) score += 20;
  if (!tile.self) score += 10;
  return score;
}

function sortTilesForMobile(tiles: CallTile[]): CallTile[] {
  return [...tiles].sort((a, b) => tilePriority(b) - tilePriority(a));
}

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
export function CallTiles({
  tiles,
  width,
  compact,
  spotlightKey = null,
  onSpotlightChange,
}: CallTilesProps) {
  const { height: windowHeight } = useWindowSize();
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [mobileGridOpen, setMobileGridOpen] = useState(false);

  const mine = tiles.filter((t) => t.self && t.kind === 'camera');
  const myShare = tiles.filter((t) => t.self && t.kind === 'screen');
  const shares = tiles.filter((t) => !t.self && t.kind === 'screen');
  const others = tiles.filter((t) => !t.self && t.kind === 'camera');

  // Se a tela ampliada parar de ser compartilhada, volta ao normal sozinho.
  const focused = shares.find((t) => t.key === focusKey) ?? null;

  // Câmera ampliada em destaque (própria ou de outra pessoa).
  const spotlightTile =
    spotlightKey === 'self'
      ? (mine[0] ?? null)
      : spotlightKey
        ? (tiles.find((t) => t.key === spotlightKey) ?? null)
        : null;

  const rowOthers =
    spotlightTile && !spotlightTile.self
      ? others.filter((t) => t.key !== spotlightTile.key)
      : others;

  useEffect(() => {
    if (!spotlightTile || !onSpotlightChange) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onSpotlightChange(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [spotlightTile, onSpotlightChange]);

  // --- Experiência dedicada para Mobile (strip compacto + grid expansível estilo Discord) ---
  if (compact) {
    if (tiles.length === 0) return null;
    const sorted = sortTilesForMobile(tiles);
    const activeSpot = spotlightTile;

    if (activeSpot) {
      const spotW = Math.min(480, Math.max(240, width - 24));
      const spotH = Math.min(
        Math.round(
          spotW * (activeSpot.kind === 'screen' ? SCREEN_RATIO : TILE_RATIO),
        ),
        Math.max(180, windowHeight - 280),
      );
      return (
        <div className={styles.layer}>
          <div className={styles.mobileSpotWrap}>
            <Tile tile={activeSpot} width={spotW} height={spotH}>
              <div className={styles.tileActions}>
                <TileButton
                  big
                  icon="shrink"
                  label="Reduzir"
                  onClick={() => onSpotlightChange?.(null)}
                />
              </div>
            </Tile>
          </div>
        </div>
      );
    }

    if (mobileGridOpen) {
      const cols = sorted.length === 1 ? 1 : 2;
      const cellW = Math.floor(
        (Math.min(width, 520) - 36 - (cols - 1) * 8) / cols,
      );
      const cellH = Math.round(cellW * TILE_RATIO);
      return (
        <div className={styles.mobileGridSheet}>
          <div className={styles.mobileGridHeader}>
            <span className={styles.mobileGridTitle}>
              Na chamada ({sorted.length})
            </span>
            <button
              type="button"
              className={styles.mobileGridClose}
              onClick={() => setMobileGridOpen(false)}
            >
              <Icon name="shrink" size={14} color="#ffffff" />
              <span>Ver mapa</span>
            </button>
          </div>
          <div className={styles.mobileGrid}>
            {sorted.map((tile) => {
              const isScreen = tile.kind === 'screen';
              const w = isScreen ? Math.min(width - 36, 480) : cellW;
              const h = isScreen ? Math.round(w * SCREEN_RATIO) : cellH;
              return (
                <div
                  key={tile.key}
                  className={isScreen ? styles.mobileGridFull : undefined}
                >
                  <Tile tile={tile} width={w} height={h}>
                    {onSpotlightChange ? (
                      <div className={styles.tileActions}>
                        <TileButton
                          icon="expand"
                          label={`Ampliar ${tile.label}`}
                          onClick={() => {
                            setMobileGridOpen(false);
                            onSpotlightChange(tile.self ? 'self' : tile.key);
                          }}
                        />
                      </div>
                    ) : null}
                  </Tile>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className={styles.layer}>
        <div className={styles.mobileStrip}>
          {sorted.map((tile) => {
            const hasVideo = tile.track !== null;
            const w = hasVideo ? 94 : 58;
            const h = hasVideo ? 68 : 58;
            return (
              <button
                key={tile.key}
                type="button"
                className={styles.mobileChipBtn}
                aria-label={`Ampliar ${tile.label}`}
                onClick={() =>
                  onSpotlightChange
                    ? onSpotlightChange(tile.self ? 'self' : tile.key)
                    : setMobileGridOpen(true)
                }
              >
                <Tile tile={tile} width={w} height={h} />
              </button>
            );
          })}
          <button
            type="button"
            className={styles.mobileExpandBtn}
            aria-label={`Ver todos na chamada (${sorted.length})`}
            onClick={() => setMobileGridOpen(true)}
          >
            <Icon name="expand" size={14} color="#ffffff" />
            <span>{sorted.length}</span>
          </button>
        </div>
      </div>
    );
  }

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

  const row = rowLayout(width, rowOthers.length, shares.length);

  // Tamanho do quadro em destaque centralizado (acima da barra inferior no mobile).
  const isLandscapeMobile = compact && windowHeight < 540;
  const maxSpotW = isLandscapeMobile
    ? Math.max(200, Math.min(360, width - 456))
    : Math.min(540, Math.max(260, width - (compact ? 24 : 336)));
  const maxSpotH = isLandscapeMobile
    ? Math.max(150, windowHeight - 108)
    : Math.max(
        180,
        windowHeight -
          (compact
            ? rowOthers.length + shares.length > 0
              ? 360
              : 270
            : rowOthers.length + shares.length > 0
              ? 300
              : 180),
      );
  const spotWidth = Math.round(Math.min(maxSpotW, maxSpotH / TILE_RATIO));
  const spotHeight = Math.round(spotWidth * TILE_RATIO);
  const canTrueCenter = compact || width >= spotWidth + 620;

  return (
    <div className={styles.layer}>
      {shares.length + rowOthers.length > 0 ? (
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
          {rowOthers.map((tile) => (
            <Tile
              key={tile.key}
              tile={tile}
              width={row.cameraWidth}
              height={row.height}
            >
              {onSpotlightChange ? (
                <div className={styles.tileActions}>
                  <TileButton
                    icon="expand"
                    label={`Ampliar câmera de ${tile.label}`}
                    onClick={() => onSpotlightChange(tile.key)}
                  />
                </div>
              ) : null}
            </Tile>
          ))}
        </div>
      ) : null}

      {spotlightTile ? (
        <div
          className={`${styles.spotlight} ${!canTrueCenter ? styles.spotlightOffset : ''}`}
        >
          <Tile tile={spotlightTile} width={spotWidth} height={spotHeight}>
            {onSpotlightChange ? (
              <div className={styles.tileActions}>
                <TileButton
                  big
                  icon="shrink"
                  label="Reduzir"
                  onClick={() => onSpotlightChange(null)}
                />
              </div>
            ) : null}
          </Tile>
        </div>
      ) : null}

      {/* Minha tela compartilhada (a própria câmera agora fica acoplada no cartão inferior esquerdo). */}
      {myShare.length > 0 ? (
        <div className={compact ? styles.selfCompact : styles.self}>
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
