import { Check, Dices, Save, Trash2, Upload, UserRound } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { Button, Text, XStack, YStack } from 'tamagui';

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
import { ActionButton, ModalFrame, SurfaceCard } from '@/shared/ui/tamagui';

import type { Facing } from '../model/officeWorld';
import { buildSprite, SPRITE_H, SPRITE_W } from '../model/sprite';
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
    <YStack gap="$1.5">
      <Text
        fontFamily="$body"
        fontSize="$2"
        fontWeight="700"
        color="$textSecondary"
      >
        {label}
      </Text>
      <XStack flexWrap="wrap" gap="$1.5">
        {colors.map((color, index) => {
          const isSelected = index === selected;
          return (
            <Button
              key={color}
              width={28}
              height={28}
              padding={0}
              circular
              aria-label={`${label} ${index + 1}`}
              aria-pressed={isSelected}
              backgroundColor={color}
              borderWidth={isSelected ? 2 : 1}
              borderColor={isSelected ? '#ffffff' : 'rgba(255,255,255,0.22)'}
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              onPress={() => onSelect(index)}
            >
              {isSelected ? (
                <Check size={13} color="#ffffff" aria-hidden={true} />
              ) : null}
            </Button>
          );
        })}
      </XStack>
    </YStack>
  );
}

function StyleChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      aria-pressed={active}
      paddingHorizontal="$2.5"
      paddingVertical="$1.5"
      minHeight={30}
      borderRadius="$md"
      backgroundColor={active ? '$accentChip' : '$bgControl'}
      borderColor={active ? '$accentBorderSoft' : '$borderSubtle'}
      borderWidth={1}
      cursor="pointer"
      onPress={onPress}
    >
      <Text
        fontFamily="$body"
        fontSize="$2"
        fontWeight={active ? '700' : '500'}
        color={active ? '$textPrimary' : '$textSecondary'}
      >
        {label}
      </Text>
    </Button>
  );
}

/** Escolha de aparência em pixel art + foto personalizada de perfil em Tamagui. */
export function AvatarEditor({ initial, onSave, onClose }: Props) {
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
    <ModalFrame
      title="Seu avatar e foto"
      subtitle="Personalize seu personagem no mapa e a foto exibida no chat."
      icon={
        <UserRound size={18} color="var(--accent-link)" aria-hidden={true} />
      }
      maxWidth={880}
      onClose={onClose}
      headerActions={
        <ActionButton
          variant="secondary"
          size="sm"
          icon={<Dices size={14} aria-hidden={true} />}
          onPress={randomize}
        >
          Aleatório
        </ActionButton>
      }
      footer={
        <>
          <ActionButton variant="secondary" size="sm" onPress={onClose}>
            Cancelar
          </ActionButton>
          <ActionButton
            size="sm"
            icon={<Save size={14} aria-hidden={true} />}
            onPress={() => onSave(draft)}
          >
            Salvar
          </ActionButton>
        </>
      }
    >
      <XStack gap="$5" flexWrap="wrap" alignItems="flex-start">
        <YStack width={220} flexShrink={0} gap="$3">
          <SurfaceCard alignItems="center" padding="$4" gap="$3">
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
            <XStack gap="$1" role="group" aria-label="Ângulo">
              {DIRECTIONS.map((dir) => (
                <StyleChip
                  key={dir.value}
                  label={dir.label}
                  active={facing === dir.value}
                  onPress={() => setFacing(dir.value)}
                />
              ))}
            </XStack>
          </SurfaceCard>

          <SurfaceCard alignItems="center" padding="$4" gap="$2.5">
            <FaceAvatar appearance={draft} size={68} />
            <Text
              fontFamily="$body"
              fontSize="$2"
              color="$textMuted"
              textAlign="center"
            >
              {draft.photo
                ? 'Passe o mouse na foto para girar e ver o pixel art'
                : 'Adicione uma foto para usar no perfil'}
            </Text>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(e) => void handlePhotoChange(e)}
            />
            <XStack gap="$1.5" flexWrap="wrap" justifyContent="center">
              <ActionButton
                variant="secondary"
                size="sm"
                loading={photoBusy}
                icon={<Upload size={13} aria-hidden={true} />}
                onPress={() => fileRef.current?.click()}
              >
                {photoBusy
                  ? 'Processando…'
                  : draft.photo
                    ? 'Trocar foto'
                    : 'Escolher foto'}
              </ActionButton>
              {draft.photo ? (
                <ActionButton
                  variant="danger"
                  size="sm"
                  icon={<Trash2 size={13} aria-hidden={true} />}
                  onPress={() =>
                    setDraft((current) => ({ ...current, photo: null }))
                  }
                >
                  Remover
                </ActionButton>
              ) : null}
            </XStack>
            {photoError ? (
              <Text
                fontFamily="$body"
                fontSize="$2"
                color="$dangerText"
                role="alert"
              >
                {photoError}
              </Text>
            ) : null}
          </SurfaceCard>
        </YStack>

        <YStack flex={1} minWidth={280} gap="$3.5">
          <YStack gap="$1.5">
            <Text
              fontFamily="$body"
              fontSize="$2"
              fontWeight="700"
              color="$textSecondary"
            >
              Biotipo e altura
            </Text>
            <XStack flexWrap="wrap" gap="$1.5">
              {AVATAR_BODY_SHAPES.map((shape) => (
                <StyleChip
                  key={shape}
                  label={AVATAR_BODY_SHAPE_LABELS[shape]}
                  active={(draft.bodyShape ?? 'regular') === shape}
                  onPress={() => setDraft({ ...draft, bodyShape: shape })}
                />
              ))}
              {AVATAR_HEIGHTS.map((height) => (
                <StyleChip
                  key={height}
                  label={AVATAR_HEIGHT_LABELS[height]}
                  active={(draft.height ?? 'average') === height}
                  onPress={() => setDraft({ ...draft, height })}
                />
              ))}
              {AVATAR_BODY_STYLES.map((bodyStyle) => (
                <StyleChip
                  key={bodyStyle}
                  label={AVATAR_BODY_STYLE_LABELS[bodyStyle]}
                  active={(draft.bodyStyle ?? 'masculine') === bodyStyle}
                  onPress={() => setDraft({ ...draft, bodyStyle })}
                />
              ))}
            </XStack>
          </YStack>

          <Swatches
            label="Pele"
            colors={SKIN_TONES}
            selected={draft.skin}
            onSelect={(skin) => setDraft({ ...draft, skin })}
          />

          <YStack gap="$1.5">
            <Text
              fontFamily="$body"
              fontSize="$2"
              fontWeight="700"
              color="$textSecondary"
            >
              Expressão do rosto
            </Text>
            <XStack flexWrap="wrap" gap="$1.5">
              {AVATAR_FACES.map((face) => (
                <StyleChip
                  key={face}
                  label={AVATAR_FACE_LABELS[face]}
                  active={(draft.face ?? 'happy') === face}
                  onPress={() => setDraft({ ...draft, face })}
                />
              ))}
            </XStack>
          </YStack>

          <Swatches
            label="Cor do cabelo e barba"
            colors={HAIR_COLORS}
            selected={draft.hair}
            onSelect={(hair) => setDraft({ ...draft, hair })}
          />

          <YStack gap="$1.5">
            <Text
              fontFamily="$body"
              fontSize="$2"
              fontWeight="700"
              color="$textSecondary"
            >
              Estilo e tamanho do cabelo
            </Text>
            <XStack flexWrap="wrap" gap="$1.5">
              {Array.from({ length: HAIR_STYLE_COUNT }, (_, style) => (
                <StyleChip
                  key={style}
                  label={HAIR_STYLE_LABELS[style]!}
                  active={style === draft.style}
                  onPress={() => setDraft({ ...draft, style })}
                />
              ))}
              {AVATAR_HAIR_LENGTHS.map((hairLength) => (
                <StyleChip
                  key={hairLength}
                  label={AVATAR_HAIR_LENGTH_LABELS[hairLength]}
                  active={(draft.hairLength ?? 'short') === hairLength}
                  onPress={() => setDraft({ ...draft, hairLength })}
                />
              ))}
            </XStack>
          </YStack>

          <YStack gap="$1.5">
            <Text
              fontFamily="$body"
              fontSize="$2"
              fontWeight="700"
              color="$textSecondary"
            >
              Barba e bigode
            </Text>
            <XStack flexWrap="wrap" gap="$1.5">
              {AVATAR_BEARDS.map((beard) => (
                <StyleChip
                  key={beard}
                  label={AVATAR_BEARD_LABELS[beard]}
                  active={(draft.beard ?? 'none') === beard}
                  onPress={() => setDraft({ ...draft, beard })}
                />
              ))}
            </XStack>
          </YStack>

          <YStack gap="$1.5">
            <Text
              fontFamily="$body"
              fontSize="$2"
              fontWeight="700"
              color="$textSecondary"
            >
              Acessório
            </Text>
            <XStack flexWrap="wrap" gap="$1.5">
              {AVATAR_ACCESSORIES.map((accessory) => (
                <StyleChip
                  key={accessory}
                  label={AVATAR_ACCESSORY_LABELS[accessory]}
                  active={(draft.accessory ?? 'none') === accessory}
                  onPress={() => setDraft({ ...draft, accessory })}
                />
              ))}
            </XStack>
          </YStack>

          <YStack gap="$1.5">
            <Text
              fontFamily="$body"
              fontSize="$2"
              fontWeight="700"
              color="$textSecondary"
            >
              Roupa superior
            </Text>
            <XStack flexWrap="wrap" gap="$1.5">
              {AVATAR_TOPS.map((topStyle) => (
                <StyleChip
                  key={topStyle}
                  label={AVATAR_TOP_LABELS[topStyle]}
                  active={(draft.topStyle ?? 'tshirt') === topStyle}
                  onPress={() => setDraft({ ...draft, topStyle })}
                />
              ))}
            </XStack>
          </YStack>

          <Swatches
            label="Cor da roupa superior"
            colors={SHIRT_COLORS}
            selected={draft.shirt}
            onSelect={(shirt) => setDraft({ ...draft, shirt })}
          />

          <YStack gap="$1.5">
            <Text
              fontFamily="$body"
              fontSize="$2"
              fontWeight="700"
              color="$textSecondary"
            >
              Calça, bermuda ou saia
            </Text>
            <XStack flexWrap="wrap" gap="$1.5">
              {AVATAR_BOTTOMS.map((bottomStyle) => (
                <StyleChip
                  key={bottomStyle}
                  label={AVATAR_BOTTOM_LABELS[bottomStyle]}
                  active={(draft.bottomStyle ?? 'pants') === bottomStyle}
                  onPress={() => setDraft({ ...draft, bottomStyle })}
                />
              ))}
            </XStack>
          </YStack>

          <Swatches
            label="Cor da calça / bermuda"
            colors={PANTS_COLORS}
            selected={draft.pants ?? 0}
            onSelect={(pants) => setDraft({ ...draft, pants })}
          />

          <YStack gap="$1.5">
            <Text
              fontFamily="$body"
              fontSize="$2"
              fontWeight="700"
              color="$textSecondary"
            >
              Tênis e calçado
            </Text>
            <XStack flexWrap="wrap" gap="$1.5">
              {AVATAR_SHOES.map((shoeStyle) => (
                <StyleChip
                  key={shoeStyle}
                  label={AVATAR_SHOE_LABELS[shoeStyle]}
                  active={(draft.shoeStyle ?? 'sneakers') === shoeStyle}
                  onPress={() => setDraft({ ...draft, shoeStyle })}
                />
              ))}
            </XStack>
          </YStack>

          <Swatches
            label="Cor do tênis"
            colors={SHOE_COLORS}
            selected={draft.shoes ?? 0}
            onSelect={(shoes) => setDraft({ ...draft, shoes })}
          />
        </YStack>
      </XStack>
    </ModalFrame>
  );
}
