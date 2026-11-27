import type { ReactNode } from 'react';
import { Switch, Text, XStack, YStack } from 'tamagui';

type ToggleSwitchProps = {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
};

/**
 * Interruptor estilizado sobre o `Switch` nativo do Tamagui.
 */
export function ToggleSwitch({
  checked,
  onCheckedChange,
  disabled = false,
  ariaLabel,
}: ToggleSwitchProps) {
  return (
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={ariaLabel}
      backgroundColor={checked ? '$accent' : '$bgControl'}
      borderColor={checked ? '$accent' : '$borderSubtle'}
      borderWidth={1}
      width={44}
      height={24}
      padding={2}
      borderRadius="$pill"
      opacity={disabled ? 0.5 : 1}
      cursor={disabled ? 'not-allowed' : 'pointer'}
      flexShrink={0}
    >
      <Switch.Thumb
        backgroundColor="#ffffff"
        width={18}
        height={18}
        borderRadius="$pill"
      />
    </Switch>
  );
}

type SettingSwitchRowProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
};

/**
 * Linha de configuração completa com ícone, título, descrição e `Switch` do Tamagui.
 */
export function SettingSwitchRow({
  title,
  description,
  icon,
  checked,
  onCheckedChange,
  disabled = false,
}: SettingSwitchRowProps) {
  return (
    <XStack
      alignItems="center"
      justifyContent="space-between"
      gap="$3"
      padding="$3.5"
      borderRadius="$lg"
      backgroundColor="$bgSurface"
      borderColor="$borderSubtle"
      borderWidth={1}
    >
      <XStack alignItems="center" gap="$3" flex={1} minWidth={0}>
        {icon ? (
          <YStack
            width={34}
            height={34}
            borderRadius="$md"
            backgroundColor="$bgControl"
            borderWidth={1}
            borderColor="$borderSubtle"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            {icon}
          </YStack>
        ) : null}
        <YStack flex={1} gap="$0.5" minWidth={0}>
          <Text
            fontFamily="$body"
            fontSize="$4"
            fontWeight="600"
            color="$textPrimary"
          >
            {title}
          </Text>
          {description ? (
            <Text
              fontFamily="$body"
              fontSize="$2"
              color="$textMuted"
              lineHeight={16}
            >
              {description}
            </Text>
          ) : null}
        </YStack>
      </XStack>
      <ToggleSwitch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        ariaLabel={title}
      />
    </XStack>
  );
}
