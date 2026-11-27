import { Bell, Mail, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Button, Text, XStack, YStack } from 'tamagui';

import { authApi } from '@/app/api';
import { ModalFrame } from '@/shared/ui/tamagui';

type Props = {
  token: string;
  onDone: (marketingOptIn: boolean) => void;
};

/**
 * Pergunta única para contas criadas antes da opção de preferência de e-mail,
 * construída com Tamagui `Dialog` e ícones Lucide.
 */
export function EmailPrefsPrompt({ token, onDone }: Props) {
  const [busy, setBusy] = useState(false);

  const choose = async (marketingOptIn: boolean) => {
    setBusy(true);
    await authApi.updateEmailPreferences(token, marketingOptIn);
    setBusy(false);
    onDone(marketingOptIn);
  };

  return (
    <ModalFrame
      title="Preferências de e-mail"
      subtitle="Escolha quais comunicações deseja receber da nossa equipe."
      icon={<Mail size={18} color="var(--accent-link)" aria-hidden={true} />}
      maxWidth={460}
      closeDisabled
      onClose={() => {}}
    >
      <YStack gap="$3">
        <Button
          disabled={busy}
          padding="$3.5"
          borderRadius="$xl"
          backgroundColor="$accentChip"
          borderWidth={1}
          borderColor="$accentBorderSoft"
          cursor={busy ? 'not-allowed' : 'pointer'}
          justifyContent="flex-start"
          height="auto"
          onPress={() => void choose(true)}
        >
          <XStack alignItems="flex-start" gap="$3" width="100%">
            <YStack
              width={34}
              height={34}
              borderRadius="$md"
              backgroundColor="$accent"
              alignItems="center"
              justifyContent="center"
              flexShrink={0}
            >
              <Bell size={16} color="#ffffff" aria-hidden={true} />
            </YStack>
            <YStack flex={1} gap="$0.5" alignItems="flex-start">
              <Text
                fontFamily="$heading"
                fontSize="$4"
                fontWeight="700"
                color="$textPrimary"
                textAlign="left"
              >
                Todas as notificações e novidades
              </Text>
              <Text
                fontFamily="$body"
                fontSize="$2"
                color="$textSecondary"
                textAlign="left"
              >
                Códigos de conta, avisos urgentes, patch notes, novidades e
                dicas.
              </Text>
            </YStack>
          </XStack>
        </Button>

        <Button
          disabled={busy}
          padding="$3.5"
          borderRadius="$xl"
          backgroundColor="$bgSurface"
          borderWidth={1}
          borderColor="$borderSubtle"
          cursor={busy ? 'not-allowed' : 'pointer'}
          justifyContent="flex-start"
          height="auto"
          onPress={() => void choose(false)}
        >
          <XStack alignItems="flex-start" gap="$3" width="100%">
            <YStack
              width={34}
              height={34}
              borderRadius="$md"
              backgroundColor="$bgControl"
              alignItems="center"
              justifyContent="center"
              flexShrink={0}
            >
              <ShieldCheck
                size={16}
                color="var(--text-secondary)"
                aria-hidden={true}
              />
            </YStack>
            <YStack flex={1} gap="$0.5" alignItems="flex-start">
              <Text
                fontFamily="$heading"
                fontSize="$4"
                fontWeight="700"
                color="$textPrimary"
                textAlign="left"
              >
                Somente os importantes
              </Text>
              <Text
                fontFamily="$body"
                fontSize="$2"
                color="$textMuted"
                textAlign="left"
              >
                Apenas códigos de verificação, recuperação de senha e alertas
                urgentes.
              </Text>
            </YStack>
          </XStack>
        </Button>

        <Text
          fontFamily="$body"
          fontSize="$2"
          color="$textMuted"
          textAlign="center"
        >
          Você pode alterar essa escolha a qualquer momento nas configurações da
          conta.
        </Text>
      </YStack>
    </ModalFrame>
  );
}
