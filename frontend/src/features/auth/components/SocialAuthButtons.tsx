import { useState } from 'react';
import { Separator, Text, XStack, YStack } from 'tamagui';

import { ActionButton } from '@/shared/ui/tamagui';

export type OAuthProvider = 'google' | 'github';

const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: 'Google',
  github: 'GitHub',
};

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.8-5.4 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12Z"
      />
      <path
        fill="#34A853"
        d="M3.6 7.4l3.2 2.3C7.7 7.6 9.7 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 8.3 2.5 5.1 4.6 3.6 7.4Z"
      />
      <path
        fill="#FBBC05"
        d="M12 21.5c2.5 0 4.7-.8 6.3-2.3l-2.9-2.4c-.8.6-1.9 1-3.4 1-3.8 0-5.1-2.5-5.4-3.8l-3.2 2.5C4.9 19.3 8.2 21.5 12 21.5Z"
      />
      <path
        fill="#4285F4"
        d="M21.1 12.2c0-.6-.1-1.1-.2-1.6H12v3.9h5.4c-.3 1.2-1 2.2-2 2.9l2.9 2.4c1.7-1.6 2.8-4 2.8-7.6Z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.09.68-.22.68-.49 0-.24-.01-1.05-.01-1.9-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.36-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.38 9.38 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.81 0 .27.18.59.69.49A10.22 10.22 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"
      />
    </svg>
  );
}

const PROVIDER_ICONS: Record<OAuthProvider, () => React.JSX.Element> = {
  google: GoogleIcon,
  github: GitHubIcon,
};

type Props = {
  onSelectProvider?: (provider: OAuthProvider) => void;
};

/**
 * Botões de acesso rápido OAuth (Google e GitHub) construídos com Tamagui.
 */
export function SocialAuthButtons({ onSelectProvider }: Props) {
  const [notice, setNotice] = useState('');

  const handleProvider = (provider: OAuthProvider) => {
    if (onSelectProvider) {
      onSelectProvider(provider);
      return;
    }
    setNotice(
      `Login rápido com ${PROVIDER_LABELS[provider]} preparado na Fase 3. Configure as credenciais OAuth no servidor para ativar o redirecionamento.`,
    );
  };

  return (
    <YStack gap="$3" width="100%" marginTop="$1">
      <XStack alignItems="center" gap="$3">
        <Separator flex={1} borderColor="$borderSubtle" />
        <Text fontFamily="$body" fontSize="$2" color="$textMuted">
          Ou continue com
        </Text>
        <Separator flex={1} borderColor="$borderSubtle" />
      </XStack>

      <XStack gap="$2.5">
        {(['google', 'github'] as const).map((provider) => {
          const IconComponent = PROVIDER_ICONS[provider];
          return (
            <ActionButton
              key={provider}
              type="button"
              variant="oauth"
              flex={1}
              aria-label={`Continuar com ${PROVIDER_LABELS[provider]}`}
              icon={<IconComponent />}
              onPress={() => handleProvider(provider)}
            >
              {PROVIDER_LABELS[provider]}
            </ActionButton>
          );
        })}
      </XStack>

      {notice ? (
        <Text
          role="status"
          aria-live="polite"
          fontFamily="$body"
          fontSize="$2"
          color="$accentLink"
          textAlign="center"
        >
          {notice}
        </Text>
      ) : null}
    </YStack>
  );
}
