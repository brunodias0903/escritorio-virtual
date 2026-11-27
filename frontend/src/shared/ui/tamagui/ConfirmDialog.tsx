import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { AlertDialog, Separator, Text, XStack, YStack } from 'tamagui';

import { ActionButton } from './ActionButton';

type Tone = 'danger' | 'warning' | 'accent';

type Props = {
  open: boolean;
  title: string;
  description: string;
  tone?: Tone;
  icon?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  confirmDisabled?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  zIndex?: number;
};

/**
 * Diálogo de confirmação construído com `AlertDialog` nativo do Tamagui.
 * Ideal para ações destrutivas, moderação ou confirmações críticas.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  tone = 'danger',
  icon,
  confirmLabel,
  cancelLabel = 'Cancelar',
  loading = false,
  confirmDisabled = false,
  children,
  onConfirm,
  onCancel,
  zIndex = 1400,
}: Props) {
  if (!open) return null;

  const badgeBg =
    tone === 'danger'
      ? '$dangerBg'
      : tone === 'warning'
        ? '$warningBg'
        : '$accentChip';
  const badgeBorder =
    tone === 'danger'
      ? '$dangerBorder'
      : tone === 'warning'
        ? '$warningBorder'
        : '$accentBorderSoft';
  const iconColor =
    tone === 'danger'
      ? 'var(--danger-text)'
      : tone === 'warning'
        ? '#f59e0b'
        : 'var(--accent-link)';

  const defaultIcon =
    tone === 'danger' ? (
      <ShieldAlert size={20} color={iconColor} aria-hidden={true} />
    ) : tone === 'warning' ? (
      <AlertTriangle size={20} color={iconColor} aria-hidden={true} />
    ) : (
      <Info size={20} color={iconColor} aria-hidden={true} />
    );

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !loading) onCancel();
      }}
    >
      <AlertDialog.Portal zIndex={zIndex}>
        <AlertDialog.Overlay
          key="alert-overlay"
          position="fixed"
          top={0}
          right={0}
          bottom={0}
          left={0}
          zIndex={zIndex}
          backgroundColor="rgba(4, 6, 18, 0.76)"
          style={{
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
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
          justifyContent="center"
          padding="$4"
          pointerEvents="box-none"
        >
          <AlertDialog.Content
            key="alert-content"
            elevate
            bordered
            width="100%"
            maxWidth={440}
            backgroundColor="$bgSurfaceElevated"
            borderColor="$borderBar"
            borderWidth={1}
            borderRadius="$2xl"
            padding={0}
            overflow="hidden"
            data-scroll-lock="true"
            style={{
              boxShadow:
                '0 24px 64px rgba(2, 4, 16, 0.72), inset 0 1px 0 rgba(255, 255, 255, 0.07)',
            }}
          >
            <YStack padding="$5" gap="$3.5">
              <XStack alignItems="flex-start" gap="$3">
                <YStack
                  width={40}
                  height={40}
                  borderRadius="$lg"
                  backgroundColor={badgeBg}
                  borderColor={badgeBorder}
                  borderWidth={1}
                  alignItems="center"
                  justifyContent="center"
                  flexShrink={0}
                >
                  {icon ?? defaultIcon}
                </YStack>
                <YStack flex={1} gap="$1">
                  <AlertDialog.Title asChild>
                    <Text
                      fontFamily="$heading"
                      fontSize="$6"
                      fontWeight="700"
                      color="$textPrimary"
                    >
                      {title}
                    </Text>
                  </AlertDialog.Title>
                  <AlertDialog.Description asChild>
                    <Text
                      fontFamily="$body"
                      fontSize="$3"
                      color="$textSecondary"
                      lineHeight={19}
                    >
                      {description}
                    </Text>
                  </AlertDialog.Description>
                </YStack>
              </XStack>

              {children ? <YStack gap="$3">{children}</YStack> : null}
            </YStack>

            <Separator borderColor="$borderSubtle" />

            <XStack
              paddingHorizontal="$5"
              paddingVertical="$3.5"
              backgroundColor="$bgSurface"
              justifyContent="flex-end"
              gap="$2.5"
            >
              <AlertDialog.Cancel asChild>
                <ActionButton
                  variant="secondary"
                  size="sm"
                  disabled={loading}
                  onPress={onCancel}
                >
                  {cancelLabel}
                </ActionButton>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <ActionButton
                  variant={
                    tone === 'danger'
                      ? 'danger'
                      : tone === 'warning'
                        ? 'warning'
                        : 'primary'
                  }
                  size="sm"
                  loading={loading}
                  disabled={confirmDisabled}
                  onPress={onConfirm}
                >
                  {confirmLabel}
                </ActionButton>
              </AlertDialog.Action>
            </XStack>
          </AlertDialog.Content>
        </YStack>
      </AlertDialog.Portal>
    </AlertDialog>
  );
}
