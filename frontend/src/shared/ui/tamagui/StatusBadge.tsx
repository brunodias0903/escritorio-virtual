import type { ReactNode } from 'react';
import { Text, XStack, YStack } from 'tamagui';

export type StatusBadgeTone =
  'neutral' | 'accent' | 'success' | 'warning' | 'danger';

type Props = {
  tone?: StatusBadgeTone;
  icon?: ReactNode;
  dotColor?: string;
  children: ReactNode;
};

const TONES: Record<
  StatusBadgeTone,
  { bg: string; border: string; text: string }
> = {
  neutral: {
    bg: '$bgControl',
    border: '$borderSubtle',
    text: '$textSecondary',
  },
  accent: {
    bg: '$accentChip',
    border: '$accentBorderSoft',
    text: '$accentLink',
  },
  success: {
    bg: '$presenceSoft',
    border: '$presenceBorder',
    text: '$presenceAvailable',
  },
  warning: {
    bg: '$warningBg',
    border: '$warningBorder',
    text: '$warningText',
  },
  danger: {
    bg: '$dangerBg',
    border: '$dangerBorder',
    text: '$dangerText',
  },
};

/**
 * Selo semântico compacto em Tamagui com suporte a ícone Lucide ou ponto colorido.
 */
export function StatusBadge({
  tone = 'neutral',
  icon,
  dotColor,
  children,
}: Props) {
  const palette = TONES[tone];

  return (
    <XStack
      alignItems="center"
      gap="$1.5"
      paddingHorizontal="$2.5"
      paddingVertical="$1"
      borderRadius="$pill"
      backgroundColor={palette.bg}
      borderColor={palette.border}
      borderWidth={1}
      alignSelf="flex-start"
    >
      {dotColor ? (
        <YStack
          width={7}
          height={7}
          borderRadius="$pill"
          backgroundColor={dotColor}
          flexShrink={0}
        />
      ) : null}
      {icon ? (
        <XStack alignItems="center" flexShrink={0}>
          {icon}
        </XStack>
      ) : null}
      <Text
        fontFamily="$body"
        fontSize="$2"
        fontWeight="600"
        color={palette.text}
        lineHeight={14}
      >
        {children}
      </Text>
    </XStack>
  );
}
