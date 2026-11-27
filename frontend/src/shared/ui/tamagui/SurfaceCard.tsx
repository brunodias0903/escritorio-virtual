import type { ReactNode } from 'react';
import { Card, type CardProps } from 'tamagui';

export type SurfaceCardVariant =
  | 'default'
  | 'elevated'
  | 'glass'
  | 'subtle'
  | 'danger'
  | 'warning'
  | 'success';

type Props = CardProps & {
  children: ReactNode;
  variant?: SurfaceCardVariant;
};

const CARD_TONES: Record<SurfaceCardVariant, { bg: string; border: string }> = {
  default: { bg: '$bgSurface', border: '$borderSubtle' },
  elevated: { bg: '$bgSurfaceElevated', border: '$borderBar' },
  glass: { bg: '$bgSurfaceGlass', border: '$borderGlass' },
  subtle: { bg: '$bgBar', border: '$borderSubtle' },
  danger: { bg: '$dangerBg', border: '$dangerBorder' },
  warning: { bg: '$warningBg', border: '$warningBorder' },
  success: { bg: '$presenceSoft', border: '$presenceBorder' },
};

/**
 * Cartão semântico baseado no componente `Card` do Tamagui.
 */
export function SurfaceCard({ children, variant = 'default', ...rest }: Props) {
  const tone = CARD_TONES[variant];

  return (
    <Card
      borderWidth={1}
      backgroundColor={tone.bg}
      borderColor={tone.border}
      borderRadius="$xl"
      padding="$4"
      gap="$3"
      {...rest}
    >
      {children}
    </Card>
  );
}
