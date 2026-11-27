import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Button,
  Dialog,
  Separator,
  Text,
  XStack,
  YStack,
  useMedia,
} from 'tamagui';

type Props = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  headerActions?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
  maxHeight?: string;
  closeDisabled?: boolean;
  /** Remove o padding padrão do corpo (útil para layouts com barra lateral interna). */
  noPadding?: boolean;
  /** Altura fixa/controlada para layouts com rolagem interna própria. */
  bodyScroll?: boolean;
  zIndex?: number;
};

/**
 * Moldura de modal responsiva construída com `Dialog` nativo do Tamagui
 * (foco acessível, fechamento por Esc/backdrop, portal temático e ícone Lucide).
 */
export function ModalFrame({
  title,
  subtitle,
  icon,
  headerActions,
  footer,
  onClose,
  children,
  maxWidth = 520,
  maxHeight = '88dvh',
  closeDisabled = false,
  noPadding = false,
  bodyScroll = true,
  zIndex = 1200,
}: Props) {
  const media = useMedia();
  const isMobile = Boolean((media as Record<string, boolean>).mobile);

  return (
    <Dialog
      modal
      open
      onOpenChange={(open) => {
        if (!open && !closeDisabled) onClose();
      }}
    >
      <Dialog.Portal zIndex={zIndex}>
        <Dialog.Overlay
          key="overlay"
          position="fixed"
          top={0}
          right={0}
          bottom={0}
          left={0}
          zIndex={zIndex}
          backgroundColor="rgba(4, 6, 18, 0.72)"
          style={{
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            animation: 'dsBackdropIn 150ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
          onPress={() => {
            if (!closeDisabled) onClose();
          }}
        />

        <YStack
          position="fixed"
          top={0}
          right={0}
          bottom={0}
          left={0}
          zIndex={zIndex + 1}
          alignItems="center"
          justifyContent={isMobile ? 'flex-end' : 'center'}
          padding={isMobile ? '$2' : '$4'}
          pointerEvents="box-none"
        >
          <Dialog.Content
            key="content"
            elevate
            bordered
            width="100%"
            maxWidth={maxWidth}
            maxHeight={maxHeight}
            backgroundColor="$bgSurfaceElevated"
            borderColor="$borderBar"
            borderWidth={1}
            borderRadius={isMobile ? '$2xl' : '$3xl'}
            padding={0}
            overflow="hidden"
            display="flex"
            flexDirection="column"
            data-scroll-lock="true"
            style={{
              boxShadow:
                '0 24px 64px rgba(2, 4, 16, 0.68), inset 0 1px 0 rgba(255, 255, 255, 0.07)',
              animation: 'dsDialogIn 220ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onEscapeKeyDown={(event) => {
              if (closeDisabled) event.cancel();
            }}
            onPointerDownOutside={(event) => {
              if (closeDisabled) event.cancel();
            }}
          >
            <XStack
              alignItems="center"
              justifyContent="space-between"
              paddingHorizontal={isMobile ? '$4' : '$5'}
              paddingVertical="$4"
              gap="$3"
              flexShrink={0}
            >
              <XStack alignItems="center" gap="$3" flex={1} minWidth={0}>
                {icon ? (
                  <YStack
                    width={38}
                    height={38}
                    borderRadius="$lg"
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
                  <Dialog.Title asChild>
                    <Text
                      fontFamily="$heading"
                      fontSize="$6"
                      fontWeight="700"
                      color="$textPrimary"
                      numberOfLines={1}
                    >
                      {title}
                    </Text>
                  </Dialog.Title>
                  {subtitle ? (
                    <Dialog.Description asChild>
                      <Text
                        fontFamily="$body"
                        fontSize="$3"
                        color="$textMuted"
                        lineHeight={18}
                      >
                        {subtitle}
                      </Text>
                    </Dialog.Description>
                  ) : null}
                </YStack>
              </XStack>

              <XStack alignItems="center" gap="$2" flexShrink={0}>
                {headerActions ?? null}
                <Dialog.Close asChild>
                  <Button
                    width={34}
                    height={34}
                    padding={0}
                    borderRadius="$md"
                    disabled={closeDisabled}
                    backgroundColor="$bgControl"
                    borderColor="$borderSubtle"
                    borderWidth={1}
                    color="$textSecondary"
                    aria-label="Fechar"
                    onPress={onClose}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <X size={16} strokeWidth={2.2} aria-hidden={true} />
                  </Button>
                </Dialog.Close>
              </XStack>
            </XStack>

            <Separator borderColor="$borderSubtle" />

            <YStack
              flex={1}
              minHeight={0}
              padding={noPadding ? 0 : isMobile ? '$4' : '$5'}
              gap={noPadding ? 0 : '$4'}
              overflow={bodyScroll ? 'scroll' : 'hidden'}
            >
              {children}
            </YStack>

            {footer ? (
              <>
                <Separator borderColor="$borderSubtle" />
                <XStack
                  alignItems="center"
                  justifyContent="flex-end"
                  paddingHorizontal={isMobile ? '$4' : '$5'}
                  paddingVertical="$3.5"
                  backgroundColor="$bgSurface"
                  gap="$2.5"
                  flexShrink={0}
                >
                  {footer}
                </XStack>
              </>
            ) : null}
          </Dialog.Content>
        </YStack>
      </Dialog.Portal>
    </Dialog>
  );
}
