import type { ReactNode } from 'react';
import { Text, YStack } from 'tamagui';

type Props = {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

/**
 * Estado vazio padronizado em Tamagui com ícone Lucide e hierarquia limpa.
 */
export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <YStack
      alignItems="center"
      justifyContent="center"
      paddingVertical="$8"
      paddingHorizontal="$4"
      gap="$2.5"
      borderRadius="$xl"
      borderWidth={1}
      borderColor="$borderSubtle"
      backgroundColor="$bgSurface"
    >
      <YStack
        width={44}
        height={44}
        borderRadius="$pill"
        backgroundColor="$bgControl"
        borderWidth={1}
        borderColor="$borderSubtle"
        alignItems="center"
        justifyContent="center"
      >
        {icon}
      </YStack>
      <Text
        fontFamily="$heading"
        fontSize="$4"
        fontWeight="700"
        color="$textPrimary"
        textAlign="center"
      >
        {title}
      </Text>
      {description ? (
        <Text
          fontFamily="$body"
          fontSize="$3"
          color="$textMuted"
          textAlign="center"
          maxWidth={340}
        >
          {description}
        </Text>
      ) : null}
      {action ? <YStack marginTop="$1">{action}</YStack> : null}
    </YStack>
  );
}
