import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';

import {
  AVATAR_ACCESSORIES,
  AVATAR_ACCESSORY_LABELS,
  AVATAR_BODY_STYLES,
  AVATAR_BODY_STYLE_LABELS,
  HAIR_COLORS,
  HAIR_STYLE_COUNT,
  HAIR_STYLE_LABELS,
  PANTS_COLORS,
  SHIRT_COLORS,
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
    accessory: initial.accessory ?? 'none',
    bodyStyle: initial.bodyStyle ?? 'masculine',
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
      accessory: pick(AVATAR_ACCESSORIES),
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
              <span className={styles.label}>Estilo do personagem</span>
              <div className={styles.row}>
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
            <Swatches
              label="Cor do cabelo"
              colors={HAIR_COLORS}
              selected={draft.hair}
              onSelect={(hair) => setDraft({ ...draft, hair })}
            />

            <div className={styles.group}>
              <span className={styles.label}>Estilo do cabelo</span>
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

            <Swatches
              label="Camisa"
              colors={SHIRT_COLORS}
              selected={draft.shirt}
              onSelect={(shirt) => setDraft({ ...draft, shirt })}
            />
            <Swatches
              label="Calça"
              colors={PANTS_COLORS}
              selected={draft.pants ?? 0}
              onSelect={(pants) => setDraft({ ...draft, pants })}
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
