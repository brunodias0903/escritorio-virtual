import { Armchair, Check, Dices, Save, X } from 'lucide-react';
import { useId, useState } from 'react';
import { Button, Text, XStack, YStack } from 'tamagui';

import {
  CHAIR_COLORS,
  DESK_COLORS,
  DESK_DECOR_TAG,
  DESK_HEIGHT,
  DESK_ITEMS,
  DESK_ITEM_LABELS,
  DESK_ITEM_LIMIT,
  DESK_ITEM_TAGS,
  DESK_LABEL_MAX_LENGTH,
  DESK_MACHINES,
  DESK_MACHINE_LABELS,
  DESK_MONITORS,
  DESK_MONITOR_LABELS,
  DESK_WIDTH,
  RUG_COLORS,
  RUG_PATTERNS,
  RUG_PATTERN_LABELS,
  resolveDeskSetup,
  type DeskComputer,
  type DeskConfig,
  type DeskDef,
  type DeskItem,
  type DeskMachine,
  type DeskMonitor,
} from '@/shared/domain';
import {
  ActionButton,
  ModalFrame,
  SurfaceCard,
  TextField,
} from '@/shared/ui/tamagui';

import { DeskArt } from './DeskArt';

const PREVIEW_SCALE = 2;
const PREVIEW_PADDING = 24;

type Props = {
  initial: DeskConfig;
  onSave: (config: DeskConfig) => void;
  onClose: () => void;
};

function Swatches({
  label,
  colors,
  selected,
  allowNone,
  onSelect,
}: {
  label: string;
  colors: readonly string[];
  selected: number | null;
  allowNone?: boolean;
  onSelect: (index: number | null) => void;
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
        {allowNone ? (
          <Button
            width={28}
            height={28}
            padding={0}
            circular
            aria-label={`${label}: nenhum`}
            aria-pressed={selected === null}
            backgroundColor="$bgControl"
            borderWidth={selected === null ? 2 : 1}
            borderColor={selected === null ? '$accent' : '$borderSubtle'}
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            onPress={() => onSelect(null)}
          >
            <X size={13} color="var(--text-secondary)" aria-hidden={true} />
          </Button>
        ) : null}
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

function OptionChip({
  label,
  active,
  disabled = false,
  dataTag,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  dataTag?: string;
  onPress: () => void;
}) {
  return (
    <Button
      disabled={disabled}
      aria-pressed={active}
      data-tag={dataTag}
      paddingHorizontal="$2.5"
      paddingVertical="$1.5"
      minHeight={30}
      borderRadius="$md"
      backgroundColor={active ? '$accentChip' : '$bgControl'}
      borderColor={active ? '$accentBorderSoft' : '$borderSubtle'}
      borderWidth={1}
      opacity={disabled ? 0.42 : 1}
      cursor={disabled ? 'not-allowed' : 'pointer'}
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

/** Mapeia máquina + monitor para o campo legado `computer` (mantém compatibilidade). */
const toLegacyComputer = (
  machine: DeskMachine,
  monitor: DeskMonitor,
): DeskComputer => {
  if (machine === 'laptop') {
    return monitor === 'none' ? 'laptop' : 'laptopMonitor';
  }
  if (monitor === 'dual') return 'dualMonitor';
  if (monitor === 'ultrawide') return 'ultrawide';
  if (monitor === 'triple') return 'tripleMonitor';
  return 'desktop';
};

/** Personalização da mesinha em Tamagui com prévia em pixel art ao vivo. */
export function DeskEditor({ initial, onSave, onClose }: Props) {
  const labelInputId = useId();
  const initialSetup = resolveDeskSetup(initial);
  const [draft, setDraft] = useState<DeskConfig>({
    ...initial,
    chair: initial.chair ?? 0,
    rugPattern: initial.rugPattern ?? 'bordered',
    machine: initialSetup.machine,
    monitor: initialSetup.monitor,
  });

  const [itemFilter, setItemFilter] = useState<string>(DESK_DECOR_TAG);
  const setup = resolveDeskSetup(draft);

  const ITEM_FILTER_TABS: Array<{ tag: string; label: string }> = [
    { tag: DESK_DECOR_TAG, label: 'Todos (24)' },
    { tag: 'core-14', label: 'Clássicos' },
    { tag: 'extra', label: 'Novos (+10)' },
    { tag: 'geek', label: 'Geek' },
    { tag: 'nature', label: 'Plantas' },
    { tag: 'food-drink', label: 'Café & Chá' },
  ];

  const visibleItems = DESK_ITEMS.filter((item) =>
    DESK_ITEM_TAGS[item]?.includes(itemFilter),
  );

  const selectMachine = (machine: DeskMachine) => {
    const nextMonitor: DeskMonitor =
      machine === 'desktop' && setup.monitor === 'none'
        ? 'single'
        : setup.monitor;
    setDraft((current) => ({
      ...current,
      machine,
      monitor: nextMonitor,
      computer: toLegacyComputer(machine, nextMonitor),
    }));
  };

  const selectMonitor = (monitor: DeskMonitor) => {
    setDraft((current) => ({
      ...current,
      machine: setup.machine,
      monitor,
      computer: toLegacyComputer(setup.machine, monitor),
    }));
  };

  const desk: DeskDef = {
    id: 'previa',
    name: 'Prévia',
    x: 0,
    y: 0,
    w: DESK_WIDTH,
    h: DESK_HEIGHT,
  };
  const viewW = DESK_WIDTH + PREVIEW_PADDING * 2;
  const viewH = DESK_HEIGHT + 70;

  const toggleItem = (item: DeskItem) =>
    setDraft((current) => {
      const has = current.items.includes(item);
      if (has)
        return { ...current, items: current.items.filter((i) => i !== item) };
      if (current.items.length >= DESK_ITEM_LIMIT) return current;
      return { ...current, items: [...current.items, item] };
    });

  const randomize = () => {
    const pick = <T,>(list: readonly T[]): T =>
      list[Math.floor(Math.random() * list.length)]!;
    const shuffled = [...DESK_ITEMS].sort(() => Math.random() - 0.5);
    const count = 2 + Math.floor(Math.random() * (DESK_ITEM_LIMIT - 1));
    const machine = pick(DESK_MACHINES);
    const monitorChoices =
      machine === 'desktop'
        ? DESK_MONITORS.filter((m) => m !== 'none')
        : DESK_MONITORS;
    const monitor = pick(monitorChoices);
    setDraft((current) => ({
      ...current,
      color: Math.floor(Math.random() * DESK_COLORS.length),
      chair: Math.floor(Math.random() * CHAIR_COLORS.length),
      rug:
        Math.random() < 0.15
          ? null
          : Math.floor(Math.random() * RUG_COLORS.length),
      rugPattern: pick(RUG_PATTERNS),
      machine,
      monitor,
      computer: toLegacyComputer(machine, monitor),
      items: shuffled.slice(0, count),
    }));
  };

  return (
    <ModalFrame
      title="Personalizar sua mesa"
      subtitle="Escolha cores, computador, tapete e enfeites da sua estação."
      icon={
        <Armchair size={18} color="var(--accent-link)" aria-hidden={true} />
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
        <YStack width={260} flexGrow={0} flexShrink={0} gap="$3.5">
          <SurfaceCard
            alignItems="center"
            justifyContent="center"
            padding="$4"
            style={{ backgroundColor: 'var(--bg-desk-preview)' }}
          >
            <svg
              width={viewW * PREVIEW_SCALE}
              height={viewH * PREVIEW_SCALE}
              viewBox={`${-PREVIEW_PADDING} -34 ${viewW} ${viewH}`}
              shapeRendering="crispEdges"
              aria-hidden="true"
              style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
            >
              <DeskArt desk={desk} config={draft} freeHint={false} />
            </svg>
          </SurfaceCard>

          <TextField
            id={labelInputId}
            compact
            label="Plaquinha (aparece no balão da mesa)"
            value={draft.label}
            onChangeText={(label) => setDraft({ ...draft, label })}
            maxLength={DESK_LABEL_MAX_LENGTH}
            placeholder="Ex.: Mesa do time de produto"
          />
        </YStack>

        <YStack flex={1} minWidth={280} gap="$3.5">
          <Swatches
            label="Cor da mesa"
            colors={DESK_COLORS}
            selected={draft.color}
            onSelect={(color) => setDraft({ ...draft, color: color ?? 0 })}
          />
          <Swatches
            label="Cor da cadeira"
            colors={CHAIR_COLORS}
            selected={draft.chair ?? 0}
            onSelect={(chair) => setDraft({ ...draft, chair: chair ?? 0 })}
          />
          <Swatches
            label="Tapete"
            colors={RUG_COLORS}
            selected={draft.rug}
            allowNone
            onSelect={(rug) => setDraft({ ...draft, rug })}
          />

          {draft.rug !== null ? (
            <YStack gap="$1.5">
              <Text
                fontFamily="$body"
                fontSize="$2"
                fontWeight="700"
                color="$textSecondary"
              >
                Estilo do tapete
              </Text>
              <XStack flexWrap="wrap" gap="$1.5">
                {RUG_PATTERNS.map((pattern) => (
                  <OptionChip
                    key={pattern}
                    label={RUG_PATTERN_LABELS[pattern]}
                    active={draft.rugPattern === pattern}
                    onPress={() => setDraft({ ...draft, rugPattern: pattern })}
                  />
                ))}
              </XStack>
            </YStack>
          ) : null}

          <YStack gap="$1.5">
            <Text
              fontFamily="$body"
              fontSize="$2"
              fontWeight="700"
              color="$textSecondary"
            >
              Computador
            </Text>
            <XStack flexWrap="wrap" gap="$1.5">
              {DESK_MACHINES.map((machine) => (
                <OptionChip
                  key={machine}
                  label={DESK_MACHINE_LABELS[machine]}
                  active={setup.machine === machine}
                  onPress={() => selectMachine(machine)}
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
              Monitor(es)
            </Text>
            <XStack flexWrap="wrap" gap="$1.5">
              {DESK_MONITORS.filter(
                (m) => setup.machine === 'laptop' || m !== 'none',
              ).map((monitor) => (
                <OptionChip
                  key={monitor}
                  label={DESK_MONITOR_LABELS[monitor]}
                  active={setup.monitor === monitor}
                  onPress={() => selectMonitor(monitor)}
                />
              ))}
            </XStack>
          </YStack>

          <YStack gap="$2">
            <Text
              fontFamily="$body"
              fontSize="$2"
              fontWeight="700"
              color="$textSecondary"
            >
              Enfeites ({draft.items.length} de {DESK_ITEM_LIMIT})
            </Text>
            <XStack flexWrap="wrap" gap="$1.5">
              {ITEM_FILTER_TABS.map((tab) => (
                <OptionChip
                  key={tab.tag}
                  label={tab.label}
                  active={itemFilter === tab.tag}
                  onPress={() => setItemFilter(tab.tag)}
                />
              ))}
            </XStack>
            <XStack flexWrap="wrap" gap="$1.5">
              {visibleItems.map((item) => {
                const on = draft.items.includes(item);
                const full = !on && draft.items.length >= DESK_ITEM_LIMIT;
                return (
                  <OptionChip
                    key={item}
                    label={DESK_ITEM_LABELS[item]}
                    active={on}
                    disabled={full}
                    dataTag={DESK_DECOR_TAG}
                    onPress={() => toggleItem(item)}
                  />
                );
              })}
            </XStack>
          </YStack>
        </YStack>
      </XStack>
    </ModalFrame>
  );
}
