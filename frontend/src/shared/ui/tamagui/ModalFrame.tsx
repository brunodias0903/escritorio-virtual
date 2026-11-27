import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button, Card, Text, XStack, YStack, useMedia } from 'tamagui';

type Props = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
  closeDisabled?: boolean;
};

/**
 * Moldura de modal responsiva usando `Card` e `Button` originais do Tamagui.
 */
export function ModalFrame({
  title,
  subtitle,
  onClose,
  children,
  maxWidth = 480,
  closeDisabled = false,
}: Props) {
  const media = useMedia();
  const isMobile = Boolean((media as Record<string, boolean>).mobile);

  const content = (
    <YStack
      position="fixed"
      top={0}
      right={0}
      bottom={0}
      left={0}
      zIndex={1200}
      backgroundColor="rgba(4, 6, 18, 0.72)"
      alignItems="center"
      justifyContent={isMobile ? 'flex-end' : 'center'}
      padding={isMobile ? '$2' : '$4'}
      role="dialog"
      aria-modal={true}
      aria-label={title}
      data-scroll-lock="true"
      onPress={(e: { target: unknown; currentTarget: unknown }) => {
        if (!closeDisabled && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <Card
        borderWidth={1}
        width="100%"
        maxWidth={maxWidth}
        maxHeight="90vh"
        backgroundColor="$bgSurfaceElevated"
        borderColor="$borderSubtle"
        borderRadius="$xl"
        overflow="hidden"
        padding={0}
      >
        <XStack
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="$5"
          paddingVertical="$4"
          borderBottomWidth={1}
          borderBottomColor="$borderSubtle"
          gap="$3"
        >
          <YStack flex={1} gap="$0.5">
            <Text
              fontFamily="$heading"
              fontSize="$6"
              fontWeight="700"
              color="$textPrimary"
            >
              {title}
            </Text>
            {subtitle ? (
              <Text fontFamily="$body" fontSize="$3" color="$textMuted">
                {subtitle}
              </Text>
            ) : null}
          </YStack>
          <Button
            width={32}
            height={32}
            circular
            disabled={closeDisabled}
            backgroundColor="$bgControl"
            borderColor="$borderSubtle"
            borderWidth={1}
            color="$textSecondary"
            aria-label="Fechar"
            onPress={onClose}
          >
            ✕
          </Button>
        </XStack>

        <YStack padding="$5" gap="$4" overflow="scroll">
          {children}
        </YStack>
      </Card>
    </YStack>
  );

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
}
