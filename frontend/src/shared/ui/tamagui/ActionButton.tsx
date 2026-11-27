import type { ReactNode } from 'react';
import { Button, Spinner, Text, XStack, type ButtonProps } from 'tamagui';

export type ActionButtonVariant =
  'primary' | 'secondary' | 'ghost' | 'danger' | 'warning' | 'oauth';

export type ActionButtonSize = 'sm' | 'md' | 'lg';

type Props = Omit<ButtonProps, 'variant' | 'size'> & {
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconAfter?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
};

const VARIANT_STYLES: Record<
  ActionButtonVariant,
  {
    bg: string;
    hoverBg: string;
    borderColor: string;
    hoverBorder: string;
    textColor: string;
  }
> = {
  primary: {
    bg: '$accent',
    hoverBg: '$accentHover',
    borderColor: '$accent',
    hoverBorder: '$accentHover',
    textColor: '#ffffff',
  },
  secondary: {
    bg: '$bgControl',
    hoverBg: '$bgControlHover',
    borderColor: '$borderSubtle',
    hoverBorder: '$borderAccent',
    textColor: '$textPrimary',
  },
  ghost: {
    bg: 'transparent',
    hoverBg: '$bgHoverOverlay',
    borderColor: 'transparent',
    hoverBorder: 'transparent',
    textColor: '$textSecondary',
  },
  danger: {
    bg: '$dangerBg',
    hoverBg: '$dangerBorder',
    borderColor: '$dangerBorder',
    hoverBorder: '$dangerBorder',
    textColor: '$dangerText',
  },
  warning: {
    bg: '$warningBg',
    hoverBg: '$warningBorder',
    borderColor: '$warningBorder',
    hoverBorder: '$warningBorder',
    textColor: '$warningText',
  },
  oauth: {
    bg: '$bgControl',
    hoverBg: '$bgControlHover',
    borderColor: '$borderSubtle',
    hoverBorder: '$borderAccent',
    textColor: '$textPrimary',
  },
};

const SIZE_STYLES: Record<
  ActionButtonSize,
  { minHeight: number; px: '$3' | '$4' | '$5'; fontSize: '$3' | '$4' }
> = {
  sm: { minHeight: 34, px: '$3', fontSize: '$3' },
  md: { minHeight: 40, px: '$4', fontSize: '$4' },
  lg: { minHeight: 46, px: '$5', fontSize: '$4' },
};

/**
 * Botão padronizado construído sobre `Button` e `Spinner` originais do Tamagui.
 */
export function ActionButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconAfter,
  fullWidth = false,
  children,
  ...rest
}: Props) {
  const palette = VARIANT_STYLES[variant];
  const dims = SIZE_STYLES[size];
  const isDisabled = disabled || loading;

  return (
    <Button
      disabled={isDisabled}
      backgroundColor={palette.bg}
      borderColor={palette.borderColor}
      borderWidth={1}
      borderRadius="$md"
      minHeight={dims.minHeight}
      paddingHorizontal={dims.px}
      paddingVertical={0}
      width={fullWidth ? '100%' : undefined}
      opacity={isDisabled ? 0.5 : 1}
      cursor={isDisabled ? 'not-allowed' : 'pointer'}
      style={{
        transition:
          'background-color 140ms ease, border-color 140ms ease, opacity 140ms ease',
      }}
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
          fontSize={dims.fontSize}
          fontWeight="600"
          color={palette.textColor}
          whiteSpace="nowrap"
        >
          {children}
        </Text>
        {!loading && iconAfter ? iconAfter : null}
      </XStack>
    </Button>
  );
}
