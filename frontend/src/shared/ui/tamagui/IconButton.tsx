import type { ReactNode } from 'react';
import { Button, type ButtonProps } from 'tamagui';

export type IconButtonVariant = 'default' | 'ghost' | 'danger' | 'accent';
export type IconButtonSize = 'xs' | 'sm' | 'md';

type Props = Omit<ButtonProps, 'variant' | 'size'> & {
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  circular?: boolean;
  title?: string;
};

const DIMS: Record<IconButtonSize, number> = {
  xs: 26,
  sm: 32,
  md: 38,
};

const STYLES: Record<
  IconButtonVariant,
  { bg: string; hoverBg: string; border: string; color: string }
> = {
  default: {
    bg: '$bgControl',
    hoverBg: '$bgControlHover',
    border: '$borderSubtle',
    color: '$textSecondary',
  },
  ghost: {
    bg: 'transparent',
    hoverBg: '$bgHoverOverlay',
    border: 'transparent',
    color: '$textSecondary',
  },
  danger: {
    bg: '$dangerBg',
    hoverBg: '$dangerBorder',
    border: '$dangerBorder',
    color: '$dangerText',
  },
  accent: {
    bg: '$accentChip',
    hoverBg: '$accent',
    border: '$accentBorderSoft',
    color: '$textPrimary',
  },
};

/**
 * Botão compacto apenas com ícone Lucide, usando `Button` do Tamagui.
 */
export function IconButton({
  icon,
  variant = 'default',
  size = 'sm',
  circular = false,
  disabled = false,
  title,
  ...rest
}: Props) {
  const dim = DIMS[size];
  const palette = STYLES[variant];

  const button = (
    <Button
      width={dim}
      height={dim}
      minWidth={dim}
      minHeight={dim}
      padding={0}
      circular={circular}
      borderRadius={circular ? '$pill' : '$md'}
      backgroundColor={palette.bg}
      borderColor={palette.border}
      borderWidth={1}
      color={palette.color}
      disabled={disabled}
      opacity={disabled ? 0.42 : 1}
      cursor={disabled ? 'not-allowed' : 'pointer'}
      alignItems="center"
      justifyContent="center"
      style={{
        transition:
          'background-color 140ms ease, border-color 140ms ease, color 140ms ease',
      }}
      {...rest}
    >
      {icon}
    </Button>
  );

  if (!title) return button;
  return (
    <span title={title} style={{ display: 'inline-flex' }}>
      {button}
    </span>
  );
}
