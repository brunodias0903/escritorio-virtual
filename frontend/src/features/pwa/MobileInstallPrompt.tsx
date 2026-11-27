import { useEffect, useState } from 'react';
import { Button, Text, XStack, YStack } from 'tamagui';

import { APP_NAME } from '@/shared/domain';
import { useI18n } from '@/shared/i18n';
import {
  detectMobileEnvironment,
  dismissInstallPrompt,
  isInstallPromptDismissed,
  type MobileEnvironment,
} from '@/shared/lib/mobileInstall';
import { ActionButton, SurfaceCard } from '@/shared/ui/tamagui';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type InstallStep = {
  icon: string;
  text: string;
};

function getInstallSteps(env: MobileEnvironment): {
  heading: string;
  steps: InstallStep[];
  tip?: string;
} {
  if (env.platform === 'ios') {
    if (env.browser === 'safari') {
      return {
        heading: 'Como instalar no iPhone / iPad (Safari)',
        steps: [
          {
            icon: '⬆️',
            text: 'Toque no botão Compartilhar (quadrado com seta para cima) na barra do Safari.',
          },
          {
            icon: '➕',
            text: 'Role as opções e toque em "Adicionar à Tela de Início".',
          },
          {
            icon: '✅',
            text: 'Toque em "Adicionar" no topo direito. O Escritório Virtual vai aparecer como um app normal na sua tela inicial.',
          },
        ],
      };
    }

    return {
      heading: 'Como instalar no iPhone / iPad',
      steps: [
        {
          icon: '⬆️',
          text: 'Toque no botão Compartilhar (ícone de seta para cima na barra de endereço) ou no menu do navegador.',
        },
        {
          icon: '➕',
          text: 'Escolha "Adicionar à Tela de Início" e confirme tocando em "Adicionar".',
        },
      ],
      tip: 'Se a opção não aparecer neste navegador, abra o link no Safari para transformar a página em app.',
    };
  }

  if (env.browser === 'samsung') {
    return {
      heading: 'Como instalar no Android (Samsung Internet)',
      steps: [
        {
          icon: '☰',
          text: 'Toque no menu (três linhas) na barra inferior do navegador.',
        },
        {
          icon: '➕',
          text: 'Toque em "Adicionar página a" → "Tela inicial".',
        },
        {
          icon: '✅',
          text: 'Confirme tocando em "Adicionar" para abrir o Escritório Virtual em tela cheia.',
        },
      ],
    };
  }

  if (env.browser === 'firefox') {
    return {
      heading: 'Como instalar no Android (Firefox)',
      steps: [
        {
          icon: '⋮',
          text: 'Toque no menu (três pontinhos) na barra do Firefox.',
        },
        {
          icon: '📲',
          text: 'Toque em "Instalar" ou "Adicionar à tela inicial".',
        },
        {
          icon: '✅',
          text: 'Confirme para criar o atalho em modo aplicativo.',
        },
      ],
    };
  }

  return {
    heading: 'Como instalar no Android',
    steps: [
      {
        icon: '⋮',
        text: 'Toque no menu (três pontinhos) no canto superior direito do navegador.',
      },
      {
        icon: '📲',
        text: 'Toque em "Instalar aplicativo" ou "Adicionar à tela inicial".',
      },
      {
        icon: '✅',
        text: 'Confirme em "Instalar" para abrir o Escritório Virtual em tela cheia como um app.',
      },
    ],
  };
}

/**
 * Banner em Tamagui recomendando a instalação como aplicativo (PWA)
 * quando o acesso ocorre em smartphone ou tablet Android/iOS fora do modo app.
 */
export function MobileInstallPrompt() {
  const { t } = useI18n();
  const [env] = useState<MobileEnvironment>(() => detectMobileEnvironment());
  const [visible, setVisible] = useState(
    () =>
      env.platform !== null && !env.isStandalone && !isInstallPromptDismissed(),
  );
  const [guideOpen, setGuideOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (env.platform === null || env.isStandalone) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setVisible(false);
      setGuideOpen(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [env.platform, env.isStandalone]);

  if (!visible || env.platform === null || env.isStandalone) return null;

  const deviceLabel =
    env.formFactor === 'tablet'
      ? t('pwa.device.tablet')
      : t('pwa.device.phone');
  const guide = getInstallSteps(env);

  const handlePrimaryAction = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (choice.outcome === 'accepted') {
        setVisible(false);
      }
      return;
    }
    setGuideOpen((open) => !open);
  };

  const handleDismiss = (mode: 'later' | 'forever') => {
    dismissInstallPrompt(mode);
    setVisible(false);
    setGuideOpen(false);
  };

  return (
    <YStack
      position="fixed"
      left="$3"
      right="$3"
      bottom="$3"
      zIndex="$modal"
      alignItems="center"
      pointerEvents="box-none"
      aria-label="Recomendação para instalar o Escritório Virtual como aplicativo"
      data-scroll-lock="true"
    >
      <SurfaceCard
        variant="elevated"
        width="100%"
        maxWidth={440}
        borderColor="$borderGlass"
        gap="$3"
      >
        <XStack alignItems="flex-start" gap="$3">
          <img
            src="/app-icon.svg"
            alt=""
            width={40}
            height={40}
            style={{ borderRadius: 10, flexShrink: 0 }}
            aria-hidden="true"
          />
          <YStack flex={1} gap="$0.5">
            <Text
              fontFamily="$heading"
              fontSize="$4"
              fontWeight="700"
              color="$textPrimary"
            >
              {t('pwa.title', { name: APP_NAME })}
            </Text>
            <Text fontFamily="$body" fontSize="$2" color="$textMuted">
              {t('pwa.subtitle', { device: deviceLabel })}
            </Text>
          </YStack>
          <Button
            width={28}
            height={28}
            circular
            backgroundColor="$bgControl"
            borderColor="$borderSubtle"
            borderWidth={1}
            color="$textSecondary"
            aria-label="Fechar recomendação por enquanto"
            onPress={() => handleDismiss('later')}
          >
            ✕
          </Button>
        </XStack>

        <XStack gap="$2">
          <ActionButton
            flex={1}
            onPress={() => {
              void handlePrimaryAction();
            }}
          >
            {deferredPrompt
              ? t('pwa.installNow')
              : guideOpen
                ? t('pwa.hideSteps')
                : t('pwa.howToInstall')}
          </ActionButton>
          <ActionButton
            variant="secondary"
            onPress={() => handleDismiss('forever')}
          >
            {t('pwa.neverShow')}
          </ActionButton>
        </XStack>

        {guideOpen ? (
          <SurfaceCard backgroundColor="$bgSurface" gap="$2">
            <Text
              fontFamily="$heading"
              fontSize="$3"
              fontWeight="700"
              color="$textPrimary"
            >
              {guide.heading}
            </Text>
            <YStack gap="$1.5">
              {guide.steps.map((step, index) => (
                <XStack key={index} gap="$2" alignItems="flex-start">
                  <Text fontSize="$3" aria-hidden={true}>
                    {step.icon}
                  </Text>
                  <Text
                    flex={1}
                    fontFamily="$body"
                    fontSize="$2"
                    color="$textSecondary"
                  >
                    {step.text}
                  </Text>
                </XStack>
              ))}
            </YStack>
            {guide.tip ? (
              <Text fontFamily="$body" fontSize="$2" color="$accentLink">
                {guide.tip}
              </Text>
            ) : null}
          </SurfaceCard>
        ) : null}
      </SurfaceCard>
    </YStack>
  );
}
