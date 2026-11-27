import type { ReactNode } from 'react';
import { Card, type CardProps } from 'tamagui';

type Props = CardProps & {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'glass';
};

/**
 * Cartão base usando o componente `Card` original do Tamagui com os tokens do tema ativo.
 */
export function SurfaceCard({ children, variant = 'default', ...rest }: Props) {
  const bg =
    variant === 'elevated'
      ? '$bgSurfaceElevated'
      : variant === 'glass'
        ? '$bgSurfaceGlass'
        : '$bgSurface';

  const borderColor = variant === 'glass' ? '$borderGlass' : '$borderSubtle';

  return (
    <Card
      borderWidth={1}
      backgroundColor={bg}
      borderColor={borderColor}
      borderRadius="$lg"
      padding="$4"
      gap="$3"
      {...rest}
    >
      {children}
    </Card>
  );
}
