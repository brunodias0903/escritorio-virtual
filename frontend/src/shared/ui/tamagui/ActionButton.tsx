import type { ReactNode } from 'react';
import { Button, Spinner, Text, XStack, type ButtonProps } from 'tamagui';

export type ActionButtonVariant =
  'primary' | 'secondary' | 'ghost' | 'danger' | 'oauth';

type Props = Omit<ButtonProps, 'variant'> & {
  variant?: ActionButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
};

const VARIANT_STYLES: Record<
  ActionButtonVariant,
  {
    bg: string;
    borderColor: string;
    textColor: string;
  }
> = {
  primary: {
    bg: '$accent',
    borderColor: '$accent',
    textColor: '#ffffff',
  },
  secondary: {
    bg: '$bgControl',
    borderColor: '$borderSubtle',
    textColor: '$textPrimary',
  },
  ghost: {
    bg: 'transparent',
    borderColor: 'transparent',
    textColor: '$textSecondary',
  },
  danger: {
    bg: '$dangerBg',
    borderColor: '$dangerBorder',
    textColor: '$dangerText',
  },
  oauth: {
    bg: '$bgControl',
    borderColor: '$borderSubtle',
    textColor: '$textPrimary',
  },
};

/**
 * Botão usando o `Button` original do Tamagui e os tokens do tema ativo.
 */
export function ActionButton({
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  children,
  ...rest
}: Props) {
  const palette = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;

  return (
    <Button
      disabled={isDisabled}
      backgroundColor={palette.bg}
      borderColor={palette.borderColor}
      borderWidth={1}
      borderRadius="$md"
      minHeight={40}
      paddingHorizontal="$4"
      opacity={isDisabled ? 0.55 : 1}
      cursor={isDisabled ? 'not-allowed' : 'pointer'}
      {...rest}
    >
      <XStack alignItems="center" justifyContent="center" gap="$2">
        {loading ? (
          <Spinner size="small" color={palette.textColor} />
        ) : (
          (icon ?? null)
        )}
        <Text
          fontFamily="$body"
          fontSize="$4"
          fontWeight="600"
          color={palette.textColor}
        >
          {children}
        </Text>
      </XStack>
    </Button>
  );
}
