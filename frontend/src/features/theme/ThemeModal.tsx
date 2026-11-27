import { useEffect } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { ActionButton, ModalFrame, SurfaceCard } from '@/shared/ui/tamagui';

import { THEME_PRESETS, supportsLightMode, useThemeStore } from './themeStore';
import { ThemeSwitch } from './ThemeSwitch';

type Props = {
  onClose: () => void;
};

/**
 * Modal de tema e aparência com grade espaçada, sem textos longos e
 * seletor Claro/Escuro exibido apenas nos presets que suportam modo claro.
 */
export function ThemeModal({ onClose }: Props) {
  const presetId = useThemeStore((s) => s.presetId);
  const mode = useThemeStore((s) => s.mode);
  const selectPreset = useThemeStore((s) => s.selectPreset);
  const setMode = useThemeStore((s) => s.setMode);
  const canToggleLight = supportsLightMode(presetId);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <ModalFrame title="Tema e aparência" maxWidth={720} onClose={onClose}>
      <YStack gap="$4">
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
                minWidth={260}
                padding="$4"
                backgroundColor={active ? '$bgControlHover' : '$bgSurface'}
                borderWidth={active ? 2 : 1}
                borderColor={active ? '$accent' : '$borderSubtle'}
                cursor="pointer"
              >
                <XStack
                  alignItems="center"
                  justifyContent="space-between"
                  gap="$3"
                >
                  <Text
                    fontFamily="$heading"
                    fontSize="$4"
                    fontWeight="700"
                    color="$textPrimary"
                  >
                    {preset.name}
                  </Text>

                  <XStack gap="$1.5" aria-hidden={true}>
                    {[
                      preset.colors.rail,
                      preset.colors.surface,
                      preset.colors.accent,
                      preset.colors.presence,
                    ].map((hex, index) => (
                      <YStack
                        key={index}
                        width={12}
                        height={12}
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

        <XStack
          justifyContent={canToggleLight ? 'space-between' : 'flex-end'}
          alignItems="center"
          paddingTop="$3"
          borderTopWidth={1}
          borderTopColor="$borderSubtle"
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

          <ActionButton onPress={onClose}>Concluir</ActionButton>
        </XStack>
      </YStack>
    </ModalFrame>
  );
}
