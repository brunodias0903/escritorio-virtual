import { Check, Palette } from 'lucide-react';
import { Text, XStack, YStack } from 'tamagui';

import { ActionButton, ModalFrame, SurfaceCard } from '@/shared/ui/tamagui';

import { THEME_PRESETS, supportsLightMode, useThemeStore } from './themeStore';
import { ThemeSwitch } from './ThemeSwitch';

type Props = {
  onClose: () => void;
};

/**
 * Modal de tema e aparência em Tamagui com grade de presets e alternância Claro/Escuro.
 */
export function ThemeModal({ onClose }: Props) {
  const presetId = useThemeStore((s) => s.presetId);
  const mode = useThemeStore((s) => s.mode);
  const selectPreset = useThemeStore((s) => s.selectPreset);
  const setMode = useThemeStore((s) => s.setMode);
  const canToggleLight = supportsLightMode(presetId);

  return (
    <ModalFrame
      title="Tema e aparência"
      subtitle="Personalize a paleta de cores da interface."
      icon={<Palette size={18} color="var(--accent-link)" aria-hidden={true} />}
      maxWidth={720}
      onClose={onClose}
      footer={
        <XStack
          justifyContent={canToggleLight ? 'space-between' : 'flex-end'}
          alignItems="center"
          width="100%"
          gap="$3"
        >
          {canToggleLight ? (
            <XStack alignItems="center" gap="$2.5">
              <ThemeSwitch
                mode={mode}
                label={
                  mode === 'dark'
                    ? 'Alternar para modo claro'
                    : 'Alternar para modo escuro'
                }
                onToggle={setMode}
              />
              <Text
                fontFamily="$body"
                fontSize="$3"
                fontWeight="600"
                color="$textSecondary"
              >
                {mode === 'dark' ? 'Modo escuro' : 'Modo claro'}
              </Text>
            </XStack>
          ) : null}

          <ActionButton size="sm" onPress={onClose}>
            Concluir
          </ActionButton>
        </XStack>
      }
    >
      <XStack flexWrap="wrap" gap="$3">
        {THEME_PRESETS.map((preset) => {
          const active = preset.id === presetId;
          return (
            <SurfaceCard
              key={preset.id}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              onPress={() => selectPreset(preset.id)}
              flexBasis="47%"
              flexGrow={1}
              minWidth={250}
              padding="$3.5"
              backgroundColor={active ? '$bgControlHover' : '$bgSurface'}
              borderWidth={active ? 2 : 1}
              borderColor={active ? '$accent' : '$borderSubtle'}
              cursor="pointer"
              gap="$2"
            >
              <XStack
                alignItems="center"
                justifyContent="space-between"
                gap="$2.5"
              >
                <XStack alignItems="center" gap="$2" flex={1} minWidth={0}>
                  {active ? (
                    <YStack
                      width={18}
                      height={18}
                      borderRadius="$pill"
                      backgroundColor="$accent"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Check size={11} color="#ffffff" aria-hidden={true} />
                    </YStack>
                  ) : null}
                  <Text
                    fontFamily="$heading"
                    fontSize="$4"
                    fontWeight="700"
                    color="$textPrimary"
                    numberOfLines={1}
                  >
                    {preset.name}
                  </Text>
                </XStack>

                <XStack gap="$1.5" aria-hidden={true}>
                  {[
                    preset.colors.rail,
                    preset.colors.surface,
                    preset.colors.accent,
                    preset.colors.presence,
                  ].map((hex, index) => (
                    <YStack
                      key={index}
                      width={13}
                      height={13}
                      borderRadius="$pill"
                      backgroundColor={hex}
                      borderWidth={1}
                      borderColor="$borderSubtle"
                    />
                  ))}
                </XStack>
              </XStack>
            </SurfaceCard>
          );
        })}
      </XStack>
    </ModalFrame>
  );
}
