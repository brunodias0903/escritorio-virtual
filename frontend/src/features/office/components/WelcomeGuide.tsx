import { Armchair, Compass, Mic, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { ActionButton, IconButton, SurfaceCard } from '@/shared/ui/tamagui';

const STORAGE_KEY = 'voffice:welcome:v1';

const wasDismissed = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true;
  }
};

/** Mini-guia discreto em Tamagui exibido apenas na primeira visita ao escritório. */
export function WelcomeGuide() {
  const [open, setOpen] = useState(() => !wasDismissed());

  if (!open) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignora
    }
    setOpen(false);
  };

  return (
    <YStack
      position="fixed"
      right="$4"
      bottom="$4"
      zIndex="$popup"
      maxWidth={340}
      aria-label="Dicas rápidas do escritório"
      data-scroll-lock="true"
    >
      <SurfaceCard
        variant="elevated"
        padding="$4"
        gap="$3"
        style={{
          boxShadow: '0 16px 40px rgba(2, 4, 16, 0.56)',
        }}
      >
        <XStack alignItems="center" justifyContent="space-between" gap="$2">
          <XStack alignItems="center" gap="$2">
            <Sparkles size={16} color="var(--accent-link)" aria-hidden={true} />
            <Text
              fontFamily="$heading"
              fontSize="$4"
              fontWeight="700"
              color="$textPrimary"
            >
              Bem-vindo ao Escritório
            </Text>
          </XStack>
          <IconButton
            size="xs"
            variant="ghost"
            aria-label="Fechar dicas"
            icon={<X size={14} aria-hidden={true} />}
            onPress={dismiss}
          />
        </XStack>

        <YStack gap="$2.5">
          <XStack alignItems="flex-start" gap="$2.5">
            <YStack
              width={26}
              height={26}
              borderRadius="$md"
              backgroundColor="$bgControl"
              alignItems="center"
              justifyContent="center"
              flexShrink={0}
            >
              <Compass
                size={14}
                color="var(--accent-link)"
                aria-hidden={true}
              />
            </YStack>
            <Text
              fontFamily="$body"
              fontSize="$2"
              color="$textSecondary"
              flex={1}
              lineHeight={17}
            >
              Use{' '}
              <Text fontWeight="700" color="$textPrimary">
                WASD / setas
              </Text>{' '}
              (ou o direcional no celular) para andar até uma mesa ou sala.
            </Text>
          </XStack>

          <XStack alignItems="flex-start" gap="$2.5">
            <YStack
              width={26}
              height={26}
              borderRadius="$md"
              backgroundColor="$bgControl"
              alignItems="center"
              justifyContent="center"
              flexShrink={0}
            >
              <Armchair
                size={14}
                color="var(--accent-link)"
                aria-hidden={true}
              />
            </YStack>
            <Text
              fontFamily="$body"
              fontSize="$2"
              color="$textSecondary"
              flex={1}
              lineHeight={17}
            >
              <Text fontWeight="700" color="$textPrimary">
                Passe o mouse sobre sua mesa
              </Text>{' '}
              para mover, bloquear ou personalizar.
            </Text>
          </XStack>

          <XStack alignItems="flex-start" gap="$2.5">
            <YStack
              width={26}
              height={26}
              borderRadius="$md"
              backgroundColor="$bgControl"
              alignItems="center"
              justifyContent="center"
              flexShrink={0}
            >
              <Mic size={14} color="var(--accent-link)" aria-hidden={true} />
            </YStack>
            <Text
              fontFamily="$body"
              fontSize="$2"
              color="$textSecondary"
              flex={1}
              lineHeight={17}
            >
              <Text fontWeight="700" color="$textPrimary">
                Segure o mouse (~2s)
              </Text>{' '}
              no fone, microfone ou câmera para trocar dispositivos e ver
              preview.
            </Text>
          </XStack>
        </YStack>

        <ActionButton size="sm" fullWidth onPress={dismiss}>
          Entendi
        </ActionButton>
      </SurfaceCard>
    </YStack>
  );
}
