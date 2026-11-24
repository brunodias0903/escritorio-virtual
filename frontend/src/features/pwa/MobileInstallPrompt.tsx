import { useEffect, useState } from 'react';

import { APP_NAME } from '@/shared/domain';
import { useI18n } from '@/shared/i18n';
import {
  detectMobileEnvironment,
  dismissInstallPrompt,
  isInstallPromptDismissed,
  type MobileEnvironment,
} from '@/shared/lib/mobileInstall';

import styles from './MobileInstallPrompt.module.css';

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

  // Android fallback (quando o prompt nativo não está disponível)
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
 * Recomenda a instalação como aplicativo (PWA / Adicionar à Tela de Início)
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
    <aside
      className={styles.banner}
      aria-label="Recomendação para instalar o Escritório Virtual como aplicativo"
      data-scroll-lock="true"
    >
      <div className={styles.topRow}>
        <img
          src="/app-icon.svg"
          alt=""
          className={styles.badge}
          aria-hidden="true"
        />
        <div className={styles.copy}>
          <strong className={styles.title}>
            {t('pwa.title', { name: APP_NAME })}
          </strong>
          <p className={styles.subtitle}>
            {t('pwa.subtitle', { device: deviceLabel })}
          </p>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          aria-label="Fechar recomendação por enquanto"
          onClick={() => handleDismiss('later')}
        >
          ✕
        </button>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={() => {
            void handlePrimaryAction();
          }}
        >
          {deferredPrompt
            ? t('pwa.installNow')
            : guideOpen
              ? t('pwa.hideSteps')
              : t('pwa.howToInstall')}
        </button>
        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={() => handleDismiss('forever')}
        >
          {t('pwa.neverShow')}
        </button>
      </div>

      {guideOpen ? (
        <div className={styles.guide}>
          <div className={styles.guideHeading}>{guide.heading}</div>
          <ol className={styles.steps}>
            {guide.steps.map((step, index) => (
              <li key={index} className={styles.step}>
                <span className={styles.stepIcon} aria-hidden="true">
                  {step.icon}
                </span>
                <span>{step.text}</span>
              </li>
            ))}
          </ol>
          {guide.tip ? <p className={styles.tip}>{guide.tip}</p> : null}
        </div>
      ) : null}
    </aside>
  );
}
