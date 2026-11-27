import { ShieldAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Text, XStack, YStack } from 'tamagui';

import { authApi } from '@/app/api';
import { LocalLoginForm } from '@/features/auth/components/LocalLoginForm';
import { LocalRegisterForm } from '@/features/auth/components/LocalRegisterForm';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';
import { LegalModal } from '@/features/legal/LegalModal';
import { useSessionStore } from '@/features/session/model/sessionStore';
import { APP_NAME, type AuthOptions } from '@/shared/domain';
import { SurfaceCard } from '@/shared/ui/tamagui';

import styles from './LoginPage.module.css';

type View = 'login' | 'register' | 'reset';

const HERO_COPY: Record<View, { line1: string; accent: string }> = {
  login: { line1: 'ENTRE NO SEU', accent: 'ESCRITÓRIO!' },
  register: { line1: 'CRIE SUA CONTA E', accent: 'COMECE AGORA!' },
  reset: { line1: 'RECUPERE O SEU', accent: 'ACESSO!' },
};

function BrandMark() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="2"
        width="24"
        height="24"
        rx="7"
        fill="url(#brand-bg)"
        stroke="rgba(255,255,255,0.22)"
      />
      <path
        d="M8.5 10.5 14 7.5l5.5 3v7L14 20.5l-5.5-3v-7Z"
        stroke="#ffffff"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="14" r="2.2" fill="#67e8f9" />
      <defs>
        <linearGradient
          id="brand-bg"
          x1="2"
          y1="2"
          x2="26"
          y2="26"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#6d28d9" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function CosmicArtwork() {
  return (
    <svg
      className={styles.artwork}
      viewBox="0 0 800 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="sky-glow" cx="30%" cy="22%" r="75%">
          <stop offset="0%" stopColor="#3b1d7a" />
          <stop offset="48%" stopColor="#1d0d42" />
          <stop offset="100%" stopColor="#120826" />
        </radialGradient>
        <radialGradient id="nebula-bottom" cx="25%" cy="85%" r="55%">
          <stop offset="0%" stopColor="#5b21b6" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#2e1065" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#120826" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="planet-main" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="45%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <radialGradient id="planet-moon" cx="32%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#e9d5ff" />
          <stop offset="55%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#4c1d95" />
        </radialGradient>
        <linearGradient id="meteor" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.92" />
        </linearGradient>
      </defs>

      <rect width="800" height="900" fill="url(#sky-glow)" />
      <rect width="800" height="900" fill="url(#nebula-bottom)" />

      {/* Órbitas */}
      <ellipse
        cx="210"
        cy="210"
        rx="320"
        ry="110"
        transform="rotate(-24 210 210)"
        fill="none"
        stroke="rgba(165, 180, 252, 0.16)"
        strokeWidth="1.5"
      />
      <ellipse
        cx="210"
        cy="210"
        rx="390"
        ry="145"
        transform="rotate(-24 210 210)"
        fill="none"
        stroke="rgba(165, 180, 252, 0.09)"
        strokeWidth="1.2"
      />

      {/* Planeta principal */}
      <circle
        cx="185"
        cy="195"
        r="225"
        fill="url(#planet-main)"
        opacity="0.9"
      />
      <path
        d="M-10 140c70-26 140 10 200-14 55-22 105-72 170-55 30 8 48 30 48 64-58-14-105 26-168 48-68 24-135-6-205 20-26 10-42 18-55 24z"
        fill="rgba(255, 255, 255, 0.14)"
      />
      <path
        d="M15 270c75-24 148 16 218-10 50-18 96-54 152-42-22 65-75 124-148 150-85 30-180 6-232-60z"
        fill="rgba(30, 27, 75, 0.24)"
      />

      {/* Lua roxa */}
      <circle
        cx="490"
        cy="435"
        r="66"
        fill="url(#planet-moon)"
        opacity="0.92"
      />
      <circle cx="468" cy="420" r="12" fill="rgba(76, 29, 149, 0.28)" />
      <circle cx="512" cy="452" r="17" fill="rgba(76, 29, 149, 0.22)" />
      <circle cx="486" cy="468" r="8" fill="rgba(76, 29, 149, 0.25)" />

      {/* Planeta pequeno inferior */}
      <circle
        cx="165"
        cy="670"
        r="115"
        fill="rgba(109, 40, 217, 0.24)"
        stroke="rgba(196, 181, 253, 0.12)"
      />

      {/* Estrelas cadentes */}
      <line
        x1="470"
        y1="175"
        x2="635"
        y2="340"
        stroke="url(#meteor)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="635" cy="340" r="3" fill="#ffffff" />

      <line
        x1="285"
        y1="560"
        x2="405"
        y2="680"
        stroke="url(#meteor)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="405" cy="680" r="2.2" fill="#e0f2fe" />

      <line
        x1="570"
        y1="610"
        x2="660"
        y2="700"
        stroke="url(#meteor)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="660" cy="700" r="2" fill="#c4b5fd" />

      {/* Campo de estrelas */}
      <g fill="#ffffff">
        <circle cx="455" cy="115" r="2.2" opacity="0.9" />
        <circle cx="565" cy="145" r="1.6" opacity="0.7" />
        <circle cx="645" cy="215" r="2" opacity="0.85" />
        <circle cx="385" cy="285" r="1.5" opacity="0.65" />
        <circle cx="540" cy="315" r="1.4" opacity="0.6" />
        <circle cx="695" cy="395" r="2.2" opacity="0.75" />
        <circle cx="350" cy="470" r="1.8" opacity="0.8" />
        <circle cx="620" cy="515" r="1.6" opacity="0.65" />
        <circle cx="290" cy="595" r="2" opacity="0.75" />
        <circle cx="485" cy="645" r="1.5" opacity="0.7" />
        <circle cx="685" cy="745" r="2" opacity="0.8" />
        <circle cx="415" cy="790" r="1.8" opacity="0.65" />
        <circle cx="560" cy="825" r="1.4" opacity="0.6" />
        <circle cx="115" cy="495" r="1.6" opacity="0.7" />
        <circle cx="72" cy="575" r="2.1" opacity="0.85" />
      </g>
    </svg>
  );
}

/** Entrar (nickname ou e-mail, e senha) ou criar conta. */
export function LoginPage() {
  const [view, setView] = useState<View>('login');
  const [legalOpen, setLegalOpen] = useState(false);
  const sessionNotice = useSessionStore((s) => s.notice);
  const clearNotice = useSessionStore((s) => s.clearNotice);
  // O servidor diz o que está ligado. Até responder: sem código e sem dica de domínio.
  const [options, setOptions] = useState<AuthOptions>({
    emailCodes: false,
    domains: [],
    allowRegistration: true,
  });
  const { emailCodes } = options;
  const allowRegistration = options.allowRegistration !== false;
  const hero = HERO_COPY[view];

  useEffect(() => {
    let active = true;
    void authApi.options().then((result) => {
      if (active && result.ok) setOptions(result.data);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-label="Apresentação">
        <CosmicArtwork />
        <div className={styles.heroFade} aria-hidden="true" />
        <div className={styles.heroContent}>
          <header className={styles.brandBar}>
            <BrandMark />
            <h1 className={styles.brandName}>{APP_NAME}</h1>
          </header>

          <div className={styles.heroHeadline}>
            <p className={styles.heroLine}>{hero.line1}</p>
            <p className={styles.heroAccent}>{hero.accent}</p>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <SurfaceCard
          variant="glass"
          width="100%"
          maxWidth={view === 'register' ? 540 : 440}
          padding="$6"
          borderRadius="$2xl"
          gap="$4"
          marginTop="auto"
          marginBottom="auto"
        >
          {sessionNotice ? (
            <XStack
              role="alert"
              alignItems="center"
              justifyContent="space-between"
              gap="$2.5"
              padding="$3"
              borderRadius="$lg"
              backgroundColor="$dangerBg"
              borderColor="$dangerBorder"
              borderWidth={1}
            >
              <Text
                fontFamily="$body"
                fontSize="$3"
                color="$dangerText"
                flex={1}
              >
                {sessionNotice}
              </Text>
              <Button
                padding="$1.5"
                backgroundColor="transparent"
                borderWidth={0}
                aria-label="Fechar aviso"
                color="$dangerText"
                onPress={clearNotice}
              >
                <X size={15} aria-hidden={true} />
              </Button>
            </XStack>
          ) : null}
          {view === 'register' && allowRegistration ? (
            <LocalRegisterForm
              emailCodes={emailCodes}
              domains={options.domains}
              onBack={() => setView('login')}
            />
          ) : view === 'reset' && emailCodes ? (
            <ResetPasswordForm onBack={() => setView('login')} />
          ) : (
            <LocalLoginForm
              onRegister={
                allowRegistration ? () => setView('register') : undefined
              }
              onForgot={emailCodes ? () => setView('reset') : undefined}
            />
          )}
          <YStack
            marginTop="$2"
            paddingTop="$3"
            borderTopWidth={1}
            borderTopColor="$borderGlass"
            alignItems="center"
          >
            <XStack
              alignItems="center"
              justifyContent="center"
              gap="$1.5"
              flexWrap="wrap"
            >
              <ShieldAlert
                size={13}
                color="var(--text-muted)"
                aria-hidden={true}
              />
              <Text
                fontFamily="$body"
                fontSize="$2"
                color="$textMuted"
                textAlign="center"
              >
                Uso profissional exclusivo para maiores de 18 anos (ECA) ·{' '}
                <Text
                  role="button"
                  tabIndex={0}
                  color="$accentLink"
                  textDecorationLine="underline"
                  cursor="pointer"
                  onPress={() => setLegalOpen(true)}
                >
                  Termos de Uso & Privacidade (LGPD)
                </Text>
              </Text>
            </XStack>
          </YStack>
        </SurfaceCard>
      </section>

      {legalOpen ? <LegalModal onClose={() => setLegalOpen(false)} /> : null}
    </main>
  );
}
