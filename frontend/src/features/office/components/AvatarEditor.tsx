import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';

import {
  AVATAR_ACCESSORIES,
  AVATAR_ACCESSORY_LABELS,
  AVATAR_BEARDS,
  AVATAR_BEARD_LABELS,
  AVATAR_BODY_SHAPES,
  AVATAR_BODY_SHAPE_LABELS,
  AVATAR_BODY_STYLES,
  AVATAR_BODY_STYLE_LABELS,
  AVATAR_BOTTOMS,
  AVATAR_BOTTOM_LABELS,
  AVATAR_FACES,
  AVATAR_FACE_LABELS,
  AVATAR_HAIR_LENGTHS,
  AVATAR_HAIR_LENGTH_LABELS,
  AVATAR_HEIGHTS,
  AVATAR_HEIGHT_LABELS,
  AVATAR_SHOES,
  AVATAR_SHOE_LABELS,
  AVATAR_TOPS,
  AVATAR_TOP_LABELS,
  HAIR_COLORS,
  HAIR_STYLE_COUNT,
  HAIR_STYLE_LABELS,
  PANTS_COLORS,
  SHIRT_COLORS,
  SHOE_COLORS,
  SKIN_TONES,
  type Appearance,
} from '@/shared/domain';
import { compressProfilePhoto } from '@/shared/lib/photo';
import { Button } from '@/shared/ui/Button';

import type { Facing } from '../model/officeWorld';
import { buildSprite, SPRITE_H, SPRITE_W } from '../model/sprite';
import styles from './AvatarEditor.module.css';
import { FaceAvatar } from './FaceAvatar';

const PREVIEW_SCALE = 5;

const DIRECTIONS: Array<{ value: Facing; label: string }> = [
  { value: 'down', label: 'Frente' },
  { value: 'left', label: 'Lado' },
  { value: 'up', label: 'Costas' },
];

type Props = {
  initial: Appearance;
  onSave: (appearance: Appearance) => void;
  onClose: () => void;
};

function Swatches({
  label,
  colors,
  selected,
  onSelect,
}: {
  label: string;
  colors: readonly string[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className={styles.group}>
      <span className={styles.label}>{label}</span>
      <div className={styles.row}>
        {colors.map((color, index) => (
          <button
            key={color}
            type="button"
            aria-label={`${label} ${index + 1}`}
            aria-pressed={index === selected}
            onClick={() => onSelect(index)}
            className={`${styles.swatch} ${index === selected ? styles.active : ''}`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}

/** Escolha de aparência em pixel art + foto personalizada de perfil, em layout horizontal. */
export function AvatarEditor({ initial, onSave, onClose }: Props) {
  const titleId = useId();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<Appearance>({
    ...initial,
    pants: initial.pants ?? 0,
    shoes: initial.shoes ?? 0,
    accessory: initial.accessory ?? 'none',
    bodyStyle: initial.bodyStyle ?? 'masculine',
    bodyShape: initial.bodyShape ?? 'regular',
    height: initial.height ?? 'average',
    hairLength: initial.hairLength ?? (initial.style === 1 ? 'long' : 'short'),
    face: initial.face ?? 'happy',
    beard:
      initial.beard ?? (initial.accessory === 'beard' ? 'full_beard' : 'none'),
    topStyle: initial.topStyle ?? 'tshirt',
    bottomStyle: initial.bottomStyle ?? 'pants',
    shoeStyle: initial.shoeStyle ?? 'sneakers',
    photo: initial.photo ?? null,
  });
  const [facing, setFacing] = useState<Facing>('down');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const rects = buildSprite(draft, facing, 0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const randomize = () => {
    const pick = <T,>(list: readonly T[]): T =>
      list[Math.floor(Math.random() * list.length)]!;
    setDraft((current) => ({
      ...current,
      skin: Math.floor(Math.random() * SKIN_TONES.length),
      hair: Math.floor(Math.random() * HAIR_COLORS.length),
      style: Math.floor(Math.random() * HAIR_STYLE_COUNT),
      shirt: Math.floor(Math.random() * SHIRT_COLORS.length),
      pants: Math.floor(Math.random() * PANTS_COLORS.length),
      shoes: Math.floor(Math.random() * SHOE_COLORS.length),
      accessory: pick(AVATAR_ACCESSORIES),
      bodyShape: pick(AVATAR_BODY_SHAPES),
      height: pick(AVATAR_HEIGHTS),
      hairLength: pick(AVATAR_HAIR_LENGTHS),
      face: pick(AVATAR_FACES),
      beard: Math.random() < 0.55 ? 'none' : pick(AVATAR_BEARDS),
      topStyle: pick(AVATAR_TOPS),
      bottomStyle: pick(AVATAR_BOTTOMS),
      shoeStyle: pick(AVATAR_SHOES),
    }));
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPhotoError('');
    setPhotoBusy(true);
    try {
      const dataUrl = await compressProfilePhoto(file);
      setDraft((current) => ({ ...current, photo: dataUrl }));
    } catch (err) {
      setPhotoError(
        err instanceof Error ? err.message : 'Erro ao processar a imagem.',
      );
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-scroll-lock="true"
    >
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            Seu avatar e foto
          </h2>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.randomBtn}
              onClick={randomize}
            >
              🎲 Aleatório
            </button>
            <button
              type="button"
              aria-label="Fechar"
              className={styles.closeBtn}
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.previewCol}>
            {/* Prévia do personagem em pixel art */}
            <div className={styles.previewBox}>
              <svg
                width={SPRITE_W * PREVIEW_SCALE}
                height={(SPRITE_H + 1) * PREVIEW_SCALE}
                shapeRendering="crispEdges"
                aria-hidden="true"
                style={{ display: 'block' }}
              >
                {rects.map((r, index) => (
                  <rect
                    key={index}
                    x={r.x * PREVIEW_SCALE}
                    y={(r.y + 1) * PREVIEW_SCALE}
                    width={r.w * PREVIEW_SCALE}
                    height={r.h * PREVIEW_SCALE}
                    fill={r.fill}
                  />
                ))}
              </svg>
              <div className={styles.dirRow} role="group" aria-label="Ângulo">
                {DIRECTIONS.map((dir) => (
                  <button
                    key={dir.value}
                    type="button"
                    aria-pressed={facing === dir.value}
                    className={`${styles.dirBtn} ${facing === dir.value ? styles.dirBtnActive : ''}`}
                    onClick={() => setFacing(dir.value)}
                  >
                    {dir.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prévia da foto de perfil com giro 3D no hover */}
            <div className={styles.previewBox}>
              <FaceAvatar appearance={draft} size={68} />
              <span className={styles.photoHint}>
                {draft.photo
                  ? 'Passe o mouse na foto para girar e ver o pixel art'
                  : 'Adicione uma foto para usar no perfil'}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className={styles.fileInput}
                onChange={(e) => void handlePhotoChange(e)}
              />
              <div className={styles.photoActions}>
                <button
                  type="button"
                  className={styles.photoBtn}
                  disabled={photoBusy}
                  onClick={() => fileRef.current?.click()}
                >
                  {photoBusy
                    ? 'Processando…'
                    : draft.photo
                      ? 'Trocar foto'
                      : 'Escolher foto'}
                </button>
                {draft.photo ? (
                  <button
                    type="button"
                    className={`${styles.photoBtn} ${styles.photoBtnDanger}`}
                    onClick={() =>
                      setDraft((current) => ({ ...current, photo: null }))
                    }
                  >
                    Remover
                  </button>
                ) : null}
              </div>
              {photoError ? (
                <p className={styles.photoError} role="alert">
                  {photoError}
                </p>
              ) : null}
            </div>
          </div>

          <div className={styles.optionsCol}>
            <div className={styles.group}>
              <span className={styles.label}>Biotipo e altura</span>
              <div className={styles.row}>
                {AVATAR_BODY_SHAPES.map((shape) => (
                  <button
                    key={shape}
                    type="button"
                    aria-pressed={(draft.bodyShape ?? 'regular') === shape}
                    onClick={() => setDraft({ ...draft, bodyShape: shape })}
                    className={`${styles.styleButton} ${(draft.bodyShape ?? 'regular') === shape ? styles.active : ''}`}
                  >
                    {AVATAR_BODY_SHAPE_LABELS[shape]}
                  </button>
                ))}
                {AVATAR_HEIGHTS.map((height) => (
                  <button
                    key={height}
                    type="button"
                    aria-pressed={(draft.height ?? 'average') === height}
                    onClick={() => setDraft({ ...draft, height })}
                    className={`${styles.styleButton} ${(draft.height ?? 'average') === height ? styles.active : ''}`}
                  >
                    {AVATAR_HEIGHT_LABELS[height]}
                  </button>
                ))}
                {AVATAR_BODY_STYLES.map((bodyStyle) => (
                  <button
                    key={bodyStyle}
                    type="button"
                    aria-pressed={
                      (draft.bodyStyle ?? 'masculine') === bodyStyle
                    }
                    onClick={() => setDraft({ ...draft, bodyStyle })}
                    className={`${styles.styleButton} ${(draft.bodyStyle ?? 'masculine') === bodyStyle ? styles.active : ''}`}
                  >
                    {AVATAR_BODY_STYLE_LABELS[bodyStyle]}
                  </button>
                ))}
              </div>
            </div>

            <Swatches
              label="Pele"
              colors={SKIN_TONES}
              selected={draft.skin}
              onSelect={(skin) => setDraft({ ...draft, skin })}
            />

            <div className={styles.group}>
              <span className={styles.label}>Expressão do rosto</span>
              <div className={styles.row}>
                {AVATAR_FACES.map((face) => (
                  <button
                    key={face}
                    type="button"
                    aria-pressed={(draft.face ?? 'happy') === face}
                    onClick={() => setDraft({ ...draft, face })}
                    className={`${styles.styleButton} ${(draft.face ?? 'happy') === face ? styles.active : ''}`}
                  >
                    {AVATAR_FACE_LABELS[face]}
                  </button>
                ))}
              </div>
            </div>

            <Swatches
              label="Cor do cabelo e barba"
              colors={HAIR_COLORS}
              selected={draft.hair}
              onSelect={(hair) => setDraft({ ...draft, hair })}
            />

            <div className={styles.group}>
              <span className={styles.label}>Estilo e tamanho do cabelo</span>
              <div className={styles.row}>
                {Array.from({ length: HAIR_STYLE_COUNT }, (_, style) => (
                  <button
                    key={style}
                    type="button"
                    aria-pressed={style === draft.style}
                    onClick={() => setDraft({ ...draft, style })}
                    className={`${styles.styleButton} ${style === draft.style ? styles.active : ''}`}
                  >
                    {HAIR_STYLE_LABELS[style]}
                  </button>
                ))}
                {AVATAR_HAIR_LENGTHS.map((hairLength) => (
                  <button
                    key={hairLength}
                    type="button"
                    aria-pressed={(draft.hairLength ?? 'short') === hairLength}
                    onClick={() => setDraft({ ...draft, hairLength })}
                    className={`${styles.styleButton} ${(draft.hairLength ?? 'short') === hairLength ? styles.active : ''}`}
                  >
                    {AVATAR_HAIR_LENGTH_LABELS[hairLength]}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.group}>
              <span className={styles.label}>Barba e bigode</span>
              <div className={styles.row}>
                {AVATAR_BEARDS.map((beard) => (
                  <button
                    key={beard}
                    type="button"
                    aria-pressed={(draft.beard ?? 'none') === beard}
                    onClick={() => setDraft({ ...draft, beard })}
                    className={`${styles.styleButton} ${(draft.beard ?? 'none') === beard ? styles.active : ''}`}
                  >
                    {AVATAR_BEARD_LABELS[beard]}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.group}>
              <span className={styles.label}>Acessório</span>
              <div className={styles.row}>
                {AVATAR_ACCESSORIES.map((accessory) => (
                  <button
                    key={accessory}
                    type="button"
                    aria-pressed={(draft.accessory ?? 'none') === accessory}
                    onClick={() => setDraft({ ...draft, accessory })}
                    className={`${styles.styleButton} ${(draft.accessory ?? 'none') === accessory ? styles.active : ''}`}
                  >
                    {AVATAR_ACCESSORY_LABELS[accessory]}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.group}>
              <span className={styles.label}>Roupa superior</span>
              <div className={styles.row}>
                {AVATAR_TOPS.map((topStyle) => (
                  <button
                    key={topStyle}
                    type="button"
                    aria-pressed={(draft.topStyle ?? 'tshirt') === topStyle}
                    onClick={() => setDraft({ ...draft, topStyle })}
                    className={`${styles.styleButton} ${(draft.topStyle ?? 'tshirt') === topStyle ? styles.active : ''}`}
                  >
                    {AVATAR_TOP_LABELS[topStyle]}
                  </button>
                ))}
              </div>
            </div>

            <Swatches
              label="Cor da roupa superior"
              colors={SHIRT_COLORS}
              selected={draft.shirt}
              onSelect={(shirt) => setDraft({ ...draft, shirt })}
            />

            <div className={styles.group}>
              <span className={styles.label}>Calça, bermuda ou saia</span>
              <div className={styles.row}>
                {AVATAR_BOTTOMS.map((bottomStyle) => (
                  <button
                    key={bottomStyle}
                    type="button"
                    aria-pressed={
                      (draft.bottomStyle ?? 'pants') === bottomStyle
                    }
                    onClick={() => setDraft({ ...draft, bottomStyle })}
                    className={`${styles.styleButton} ${(draft.bottomStyle ?? 'pants') === bottomStyle ? styles.active : ''}`}
                  >
                    {AVATAR_BOTTOM_LABELS[bottomStyle]}
                  </button>
                ))}
              </div>
            </div>

            <Swatches
              label="Cor da calça / bermuda"
              colors={PANTS_COLORS}
              selected={draft.pants ?? 0}
              onSelect={(pants) => setDraft({ ...draft, pants })}
            />

            <div className={styles.group}>
              <span className={styles.label}>Tênis e calçado</span>
              <div className={styles.row}>
                {AVATAR_SHOES.map((shoeStyle) => (
                  <button
                    key={shoeStyle}
                    type="button"
                    aria-pressed={(draft.shoeStyle ?? 'sneakers') === shoeStyle}
                    onClick={() => setDraft({ ...draft, shoeStyle })}
                    className={`${styles.styleButton} ${(draft.shoeStyle ?? 'sneakers') === shoeStyle ? styles.active : ''}`}
                  >
                    {AVATAR_SHOE_LABELS[shoeStyle]}
                  </button>
                ))}
              </div>
            </div>

            <Swatches
              label="Cor do tênis"
              colors={SHOE_COLORS}
              selected={draft.shoes ?? 0}
              onSelect={(shoes) => setDraft({ ...draft, shoes })}
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancelar
          </button>
          <Button title="Salvar" onClick={() => onSave(draft)} />
        </div>
      </div>
    </div>
  );
}
