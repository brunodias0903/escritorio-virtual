import {
  CheckCircle2,
  Download,
  Menu,
  MoreVertical,
  PlusSquare,
  Share,
  Smartphone,
  X,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { APP_NAME } from '@/shared/domain';
import { useI18n } from '@/shared/i18n';
import {
  detectMobileEnvironment,
  dismissInstallPrompt,
  isInstallPromptDismissed,
  type MobileEnvironment,
} from '@/shared/lib/mobileInstall';
import { ActionButton, IconButton, SurfaceCard } from '@/shared/ui/tamagui';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type InstallStepIcon = 'share' | 'add' | 'done' | 'menu' | 'more' | 'install';

type InstallStep = {
  icon: InstallStepIcon;
  text: string;
};

function renderStepIcon(icon: InstallStepIcon): ReactNode {
  const color = 'var(--accent-link)';
  switch (icon) {
    case 'share':
      return <Share size={14} color={color} aria-hidden={true} />;
    case 'add':
      return <PlusSquare size={14} color={color} aria-hidden={true} />;
    case 'done':
      return <CheckCircle2 size={14} color="#31e0c1" aria-hidden={true} />;
    case 'menu':
      return <Menu size={14} color={color} aria-hidden={true} />;
    case 'more':
      return <MoreVertical size={14} color={color} aria-hidden={true} />;
    case 'install':
      return <Smartphone size={14} color={color} aria-hidden={true} />;
  }
}

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
            icon: 'share',
            text: 'Toque no botão Compartilhar (quadrado com seta para cima) na barra do Safari.',
          },
          {
            icon: 'add',
            text: 'Role as opções e toque em "Adicionar à Tela de Início".',
          },
          {
            icon: 'done',
            text: 'Toque em "Adicionar" no topo direito. O Escritório Virtual vai aparecer como um app normal na sua tela inicial.',
          },
        ],
      };
    }

    return {
      heading: 'Como instalar no iPhone / iPad',
      steps: [
        {
          icon: 'share',
          text: 'Toque no botão Compartilhar (ícone de seta para cima na barra de endereço) ou no menu do navegador.',
        },
        {
          icon: 'add',
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
          icon: 'menu',
          text: 'Toque no menu (três linhas) na barra inferior do navegador.',
        },
        {
          icon: 'add',
          text: 'Toque em "Adicionar página a" e depois em "Tela inicial".',
        },
        {
          icon: 'done',
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
          icon: 'more',
          text: 'Toque no menu (três pontinhos) na barra do Firefox.',
        },
        {
          icon: 'install',
          text: 'Toque em "Instalar" ou "Adicionar à tela inicial".',
        },
        {
          icon: 'done',
          text: 'Confirme para criar o atalho em modo aplicativo.',
        },
      ],
    };
  }

  return {
    heading: 'Como instalar no Android',
    steps: [
      {
        icon: 'more',
        text: 'Toque no menu (três pontinhos) no canto superior direito do navegador.',
      },
      {
        icon: 'install',
        text: 'Toque em "Instalar aplicativo" ou "Adicionar à tela inicial".',
      },
      {
        icon: 'done',
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
          <IconButton
            size="xs"
            circular
            aria-label="Fechar recomendação por enquanto"
            icon={<X size={13} aria-hidden={true} />}
            onPress={() => handleDismiss('later')}
          />
        </XStack>

        <XStack gap="$2">
          <ActionButton
            flex={1}
            size="sm"
            icon={<Download size={14} aria-hidden={true} />}
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
            size="sm"
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
            <YStack gap="$2">
              {guide.steps.map((step, index) => (
                <XStack key={index} gap="$2" alignItems="flex-start">
                  <YStack
                    width={22}
                    height={22}
                    borderRadius="$sm"
                    backgroundColor="$bgControl"
                    alignItems="center"
                    justifyContent="center"
                    flexShrink={0}
                    marginTop={1}
                  >
                    {renderStepIcon(step.icon)}
                  </YStack>
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
