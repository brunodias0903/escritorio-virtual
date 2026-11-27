import {
  Accessibility,
  AlertCircle,
  Bell,
  CheckCircle2,
  Globe,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Palette,
  Pencil,
  Save,
  Shield,
  ShieldCheck,
  Smartphone,
  User,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Separator, Text, XStack, YStack } from 'tamagui';

import { authApi } from '@/app/api';
import { beginSession } from '@/app/session';
import { AccessibilityModal } from '@/features/accessibility/AccessibilityModal';
import { useAccessibilityStore } from '@/features/accessibility/accessibilityStore';
import { validateUpdate } from '@/features/auth/model/validation';
import {
  CHAT_NOTIFY_MODES,
  useNotificationPrefsStore,
  type ChatNotifyMode,
} from '@/features/chat/model/notificationPrefsStore';
import { LegalModal } from '@/features/legal/LegalModal';
import { FaceAvatar } from '@/features/office/components/FaceAvatar';
import {
  ACCOUNT_TIER_LABELS,
  GENDER_IDENTITIES,
  GENDER_IDENTITY_LABELS,
  PRONOUN_PRESETS,
  defaultAppearance,
  errorMessage,
  type AccessibilityNeed,
  type AccountTier,
  type Appearance,
  type GenderIdentity,
  type Session,
  type Status,
} from '@/shared/domain';
import { SUPPORTED_LOCALES, useI18n, type Locale } from '@/shared/i18n';
import {
  ActionButton,
  ModalFrame,
  SelectField,
  SettingSwitchRow,
  SettingsShell,
  StatusBadge,
  SurfaceCard,
  TextField,
  ToggleSwitch,
  type SettingsNavItem,
} from '@/shared/ui/tamagui';

import styles from './AccountModal.module.css';
import { MfaSetupModal } from './MfaSetupModal';

type Tab = 'profile' | 'security' | 'appearance' | 'accessibility' | 'privacy';

type Props = {
  session: Session;
  status?: Status;
  appearance: Appearance | undefined;
  initialTab?: Tab;
  onStatus?: (status: Status) => void;
  onEditAvatar: () => void;
  onOpenThemes: () => void;
  onExit?: () => void;
  onClose: () => void;
};

/**
 * Modal completo de Conta, Perfil, Segurança (MFA multi-canal),
 * Preferências e Privacidade (LGPD) construído com Tamagui e Lucide.
 */
export function AccountModal({
  session,
  appearance,
  initialTab = 'profile',
  onEditAvatar,
  onOpenThemes,
  onExit,
  onClose,
}: Props) {
  const { locale, setLocale, t } = useI18n();
  const notifyMode = useNotificationPrefsStore((s) => s.mode);
  const setNotifyMode = useNotificationPrefsStore((s) => s.setMode);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [loaded, setLoaded] = useState(false);

  const [email, setEmail] = useState(session.user.email);
  const [fullName, setFullName] = useState(session.user.name);
  const [nickname, setNickname] = useState(session.user.nickname);
  const [role, setRole] = useState(session.user.role);
  const [tier, setTier] = useState<AccountTier>(session.user.tier ?? 'tester');
  const [secondaryTiers, setSecondaryTiers] = useState<AccountTier[]>(
    session.user.secondaryTiers ?? [],
  );
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [marketingOptIn, setMarketingOptIn] = useState<boolean | null>(null);
  const [genderIdentity, setGenderIdentity] =
    useState<GenderIdentity>('prefer_not_to_say');
  const [pronouns, setPronouns] = useState('');
  const [accessibilityNeeds, setAccessibilityNeeds] = useState<
    AccessibilityNeed[]
  >([]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyBusy, setVerifyBusy] = useState(false);

  const [totpModalOpen, setTotpModalOpen] = useState(false);
  const [emailMfaEnabled, setEmailMfaEnabled] = useState(false);
  const [totpMfaEnabled, setTotpMfaEnabled] = useState(false);
  const [primaryMfa, setPrimaryMfa] = useState<'totp' | 'email'>('totp');
  const [a11yModalOpen, setA11yModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [usernameCheck, setUsernameCheck] = useState<{
    status: 'idle' | 'checking' | 'available' | 'unavailable';
    message?: string;
  }>({ status: 'idle' });
  const [emailChangeOpen, setEmailChangeOpen] = useState(false);
  const [emailChangeStep, setEmailChangeStep] = useState<'form' | 'confirm'>(
    'form',
  );
  const [newEmail, setNewEmail] = useState('');
  const [emailChangePassword, setEmailChangePassword] = useState('');
  const [oldEmailCode, setOldEmailCode] = useState('');
  const [newEmailCode, setNewEmailCode] = useState('');
  const [emailChangeMfaCode, setEmailChangeMfaCode] = useState('');
  const [emailChangeCodesRequired, setEmailChangeCodesRequired] =
    useState(false);
  const [emailChangeMfaRequired, setEmailChangeMfaRequired] = useState(false);

  useEffect(() => {
    let alive = true;
    void authApi.account(session.token).then((res) => {
      if (!alive) return;
      setLoaded(true);
      if (!res.ok) return setError(errorMessage(res.error));
      setEmail(res.data.email);
      setFullName(res.data.fullName);
      setNickname(res.data.nickname);
      setRole(res.data.role);
      setTier(res.data.tier);
      setSecondaryTiers(res.data.secondaryTiers ?? []);
      setEmailVerified(res.data.emailVerified);
      const resolvedMfa = res.data.mfaEnabled
        ? (res.data.mfaMethod ?? 'totp')
        : 'none';
      setEmailMfaEnabled(resolvedMfa === 'email');
      setTotpMfaEnabled(resolvedMfa === 'totp');
      setPrimaryMfa(resolvedMfa === 'email' ? 'email' : 'totp');
      setMarketingOptIn(res.data.emailMarketingOptIn ?? null);
      setGenderIdentity(res.data.genderIdentity ?? 'prefer_not_to_say');
      setPronouns(res.data.pronouns ?? '');
      setAccessibilityNeeds(res.data.accessibilityNeeds ?? []);
      if (res.data.accessibilityPrefs) {
        useAccessibilityStore.getState().hydrate(res.data.accessibilityPrefs);
      }
    });
    return () => {
      alive = false;
    };
  }, [session.token]);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved('');
    const validation = validateUpdate({
      fullName,
      nickname,
      role,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    if (!validation.ok) return setError(validation.message);
    setBusy(true);
    const res = await authApi.updateAccount(session.token, {
      ...validation.data,
      genderIdentity,
      pronouns: pronouns.trim(),
      accessibilityNeeds,
      accessibilityPrefs: useAccessibilityStore.getState().prefs,
    });
    setBusy(false);
    if (!res.ok) return setError(errorMessage(res.error));
    beginSession(res.data);
    setSaved('Perfil atualizado com sucesso!');
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved('');
    const validation = validateUpdate({
      fullName,
      nickname,
      role,
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!validation.ok) return setError(validation.message);
    setBusy(true);
    const res = await authApi.updateAccount(session.token, validation.data);
    setBusy(false);
    if (!res.ok) return setError(errorMessage(res.error));
    beginSession(res.data);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSaved('Senha alterada com sucesso!');
  };

  const toggleEmailMfa = async (enable: boolean) => {
    setError('');
    setSaved('');
    setBusy(true);
    const res = await authApi.setEmailMfa(session.token, enable);
    setBusy(false);
    if (!res.ok) return setError(errorMessage(res.error));
    setEmailMfaEnabled(enable);
    if (enable && !totpMfaEnabled) {
      setPrimaryMfa('email');
    } else if (!enable && totpMfaEnabled) {
      setPrimaryMfa('totp');
    }
    setSaved(
      enable
        ? '2FA por e-mail ativado! Um código de 6 dígitos poderá ser enviado no login.'
        : '2FA por e-mail desativado.',
    );
  };

  const sendVerifyCode = async () => {
    setError('');
    setSaved('');
    setVerifyBusy(true);
    const res = await authApi.startVerifyEmail(session.token);
    setVerifyBusy(false);
    if (!res.ok) return setError(errorMessage(res.error));
    setVerifyOpen(true);
    setSaved('Código de 6 dígitos enviado para o seu e-mail.');
  };

  const confirmVerifyCode = async () => {
    setError('');
    setSaved('');
    setVerifyBusy(true);
    const res = await authApi.confirmVerifyEmail(session.token, verifyCode);
    setVerifyBusy(false);
    if (!res.ok) return setError(errorMessage(res.error));
    setEmailVerified(true);
    setVerifyOpen(false);
    setVerifyCode('');
    setSaved('E-mail verificado com sucesso!');
  };

  const navItems: SettingsNavItem<Tab>[] = [
    {
      id: 'profile',
      label: 'Conta',
      icon: <User size={16} aria-hidden={true} />,
    },
    {
      id: 'security',
      label: 'Segurança',
      icon: <ShieldCheck size={16} aria-hidden={true} />,
    },
    {
      id: 'appearance',
      label: 'Tema e idioma',
      icon: <Palette size={16} aria-hidden={true} />,
    },
    {
      id: 'accessibility',
      label: 'Acessibilidade',
      icon: <Accessibility size={16} aria-hidden={true} />,
    },
    {
      id: 'privacy',
      label: 'Privacidade',
      icon: <Lock size={16} aria-hidden={true} />,
    },
  ];

  const genderOptions = GENDER_IDENTITIES.map((g) => ({
    value: g,
    label: GENDER_IDENTITY_LABELS[g],
  }));

  const pronounOptions = PRONOUN_PRESETS.map((p) => ({
    value: p,
    label: p || 'Prefiro não informar',
  }));

  const localeOptions = SUPPORTED_LOCALES.map((loc) => ({
    value: loc,
    label: t(`common.language.${loc}`),
  }));

  const notifyOptions = CHAT_NOTIFY_MODES.map((opt) => ({
    value: opt.value,
    label: opt.label,
  }));

  const banner = error ? (
    <SurfaceCard
      variant="danger"
      padding="$3"
      flexDirection="row"
      alignItems="center"
      gap="$2.5"
    >
      <AlertCircle size={16} color="var(--danger-text)" aria-hidden={true} />
      <Text fontFamily="$body" fontSize="$3" color="$dangerText" flex={1}>
        {error}
      </Text>
    </SurfaceCard>
  ) : saved ? (
    <SurfaceCard
      variant="success"
      padding="$3"
      flexDirection="row"
      alignItems="center"
      gap="$2.5"
    >
      <CheckCircle2
        size={16}
        color="var(--status-available)"
        aria-hidden={true}
      />
      <Text
        fontFamily="$body"
        fontSize="$3"
        color="$presenceAvailable"
        flex={1}
      >
        {saved}
      </Text>
    </SurfaceCard>
  ) : null;

  const sidebarHeader = (
    <XStack
      alignItems="center"
      gap="$2.5"
      paddingHorizontal="$1.5"
      paddingVertical="$1"
    >
      <FaceAvatar
        appearance={appearance ?? defaultAppearance(session.user.email)}
        size={34}
      />
      <YStack flex={1} minWidth={0}>
        <Text
          fontFamily="$heading"
          fontSize="$3"
          fontWeight="700"
          color="$textPrimary"
          numberOfLines={1}
        >
          {fullName || session.user.name}
        </Text>
        <Text
          fontFamily="$body"
          fontSize="$1"
          color="$textMuted"
          numberOfLines={1}
        >
          @{nickname || session.user.nickname}
        </Text>
      </YStack>
    </XStack>
  );

  const sidebarFooter = onExit ? (
    <ActionButton
      variant="danger"
      size="sm"
      fullWidth
      icon={<LogOut size={14} aria-hidden={true} />}
      onPress={() => {
        onClose();
        onExit();
      }}
    >
      Sair da conta
    </ActionButton>
  ) : undefined;

  return (
    <>
      <ModalFrame
        title="Configurações da conta"
        subtitle="Gerencie seu perfil, segurança, aparência, acessibilidade e privacidade."
        icon={<User size={18} color="var(--accent-link)" aria-hidden={true} />}
        maxWidth={880}
        maxHeight="86dvh"
        noPadding
        bodyScroll={false}
        onClose={onClose}
      >
        <SettingsShell
          activeTab={tab}
          onTabChange={(next) => {
            setTab(next);
            setError('');
            setSaved('');
          }}
          items={navItems}
          sidebarHeader={sidebarHeader}
          sidebarFooter={sidebarFooter}
          banner={banner}
          minHeight={500}
        >
          {tab === 'profile' ? (
            <form onSubmit={(e) => void saveProfile(e)} noValidate>
              <YStack gap="$4">
                <SurfaceCard
                  padding="$4"
                  flexDirection="row"
                  alignItems="center"
                  gap="$4"
                  flexWrap="wrap"
                >
                  <button
                    type="button"
                    className={styles.avatarEditBtn}
                    aria-label="Alterar foto e avatar"
                    title="Alterar foto e avatar"
                    onClick={() => {
                      onClose();
                      onEditAvatar();
                    }}
                  >
                    <span className={styles.avatarMedia}>
                      <FaceAvatar
                        appearance={
                          appearance ?? defaultAppearance(session.user.email)
                        }
                        size={80}
                      />
                    </span>
                    <span
                      className={styles.avatarPencilOverlay}
                      aria-hidden={true}
                    >
                      <Pencil size={22} />
                    </span>
                  </button>
                  <YStack flex={1} gap="$1" minWidth={200}>
                    <Text
                      fontFamily="$heading"
                      fontSize="$5"
                      fontWeight="700"
                      color="$textPrimary"
                    >
                      {fullName || session.user.name}
                    </Text>
                    <Text fontFamily="$body" fontSize="$2" color="$textMuted">
                      {email}
                    </Text>
                    <XStack gap="$1.5" flexWrap="wrap" marginTop="$1">
                      <StatusBadge
                        tone="accent"
                        icon={<Shield size={11} aria-hidden={true} />}
                      >
                        {ACCOUNT_TIER_LABELS[tier]}
                      </StatusBadge>
                      {secondaryTiers.map((sec) => (
                        <StatusBadge key={sec} tone="neutral">
                          {ACCOUNT_TIER_LABELS[sec]}
                        </StatusBadge>
                      ))}
                    </XStack>
                  </YStack>
                </SurfaceCard>

                {loaded && !emailVerified ? (
                  <SurfaceCard variant="warning" padding="$3.5" gap="$2.5">
                    <XStack alignItems="center" gap="$2">
                      <Mail
                        size={16}
                        color="var(--warning-badge)"
                        aria-hidden={true}
                      />
                      <Text
                        fontFamily="$heading"
                        fontSize="$4"
                        fontWeight="700"
                        color="$textPrimary"
                      >
                        E-mail ainda não verificado
                      </Text>
                    </XStack>
                    <Text
                      fontFamily="$body"
                      fontSize="$2"
                      color="$textSecondary"
                    >
                      Confirme seu e-mail para proteger sua conta e liberar o
                      2FA por e-mail.
                    </Text>
                    {!verifyOpen ? (
                      <XStack>
                        <ActionButton
                          type="button"
                          size="sm"
                          loading={verifyBusy}
                          onPress={() => void sendVerifyCode()}
                        >
                          {verifyBusy ? 'Enviando…' : 'Enviar código'}
                        </ActionButton>
                      </XStack>
                    ) : (
                      <XStack gap="$2" alignItems="center" flexWrap="wrap">
                        <YStack width={150}>
                          <TextField
                            id="account-verify-code"
                            compact
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="000000"
                            value={verifyCode}
                            onChangeText={(val) =>
                              setVerifyCode(val.replace(/\D/g, '').slice(0, 6))
                            }
                          />
                        </YStack>
                        <ActionButton
                          type="button"
                          size="sm"
                          loading={verifyBusy}
                          disabled={verifyCode.length !== 6}
                          onPress={() => void confirmVerifyCode()}
                        >
                          Confirmar
                        </ActionButton>
                      </XStack>
                    )}
                  </SurfaceCard>
                ) : null}

                <XStack gap="$3" flexWrap="wrap">
                  <YStack flex={1} minWidth={220}>
                    <TextField
                      id="account-full-name"
                      label="Nome completo"
                      value={fullName}
                      onChangeText={setFullName}
                      maxLength={80}
                    />
                  </YStack>
                  <YStack flex={1} minWidth={220} gap="$1">
                    <XStack gap="$2" alignItems="flex-end">
                      <YStack flex={1}>
                        <TextField
                          id="account-nickname"
                          label="Nome de usuário"
                          value={nickname}
                          onChangeText={(val) => {
                            setNickname(val);
                            setUsernameCheck({ status: 'idle' });
                          }}
                          maxLength={20}
                        />
                      </YStack>
                      {nickname.trim().toLowerCase() !==
                      session.user.nickname.toLowerCase() ? (
                        <ActionButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          loading={usernameCheck.status === 'checking'}
                          disabled={nickname.trim().length < 3}
                          onPress={() => {
                            const candidate = nickname.trim();
                            if (!/^[a-zA-Z0-9._-]{3,20}$/.test(candidate)) {
                              setUsernameCheck({
                                status: 'unavailable',
                                message:
                                  'Use 3 a 20 caracteres (letras, números, ponto, _ ou -).',
                              });
                              return;
                            }
                            setUsernameCheck({ status: 'checking' });
                            void authApi
                              .checkUsernameAvailable(candidate, session.token)
                              .then((res) => {
                                if (!res.ok) {
                                  setUsernameCheck({
                                    status: 'unavailable',
                                    message: errorMessage(res.error),
                                  });
                                  return;
                                }
                                setUsernameCheck(
                                  res.data.available
                                    ? {
                                        status: 'available',
                                        message: `@${candidate} está disponível.`,
                                      }
                                    : {
                                        status: 'unavailable',
                                        message: `@${candidate} já está em uso.`,
                                      },
                                );
                              });
                          }}
                        >
                          Verificar
                        </ActionButton>
                      ) : null}
                    </XStack>
                    {usernameCheck.message ? (
                      <Text
                        fontFamily="$body"
                        fontSize="$2"
                        color={
                          usernameCheck.status === 'available'
                            ? '$presenceAvailable'
                            : '$dangerText'
                        }
                        role="status"
                      >
                        {usernameCheck.message}
                      </Text>
                    ) : null}
                  </YStack>
                </XStack>

                <XStack gap="$3" flexWrap="wrap">
                  <YStack flex={1} minWidth={220}>
                    <SelectField
                      id="account-gender"
                      label="Identidade de gênero (opcional)"
                      value={genderIdentity}
                      options={genderOptions}
                      onValueChange={(val) =>
                        setGenderIdentity(val as GenderIdentity)
                      }
                    />
                  </YStack>
                  <YStack flex={1} minWidth={220}>
                    <SelectField
                      id="account-pronouns"
                      label="Pronomes (opcional)"
                      value={
                        (PRONOUN_PRESETS as readonly string[]).includes(
                          pronouns,
                        )
                          ? pronouns
                          : ''
                      }
                      options={pronounOptions}
                      onValueChange={setPronouns}
                    />
                  </YStack>
                </XStack>

                <XStack justifyContent="flex-end">
                  <ActionButton
                    type="submit"
                    loading={busy}
                    disabled={!loaded}
                    icon={<Save size={15} aria-hidden={true} />}
                  >
                    {busy ? 'Salvando…' : 'Salvar perfil'}
                  </ActionButton>
                </XStack>

                <Separator borderColor="$borderSubtle" />

                <SurfaceCard padding="$4" gap="$3">
                  <XStack
                    alignItems="center"
                    justifyContent="space-between"
                    gap="$3"
                    flexWrap="wrap"
                  >
                    <YStack gap="$0.5">
                      <Text
                        fontFamily="$heading"
                        fontSize="$4"
                        fontWeight="700"
                        color="$textPrimary"
                      >
                        E-mail da conta
                      </Text>
                      <Text fontFamily="$body" fontSize="$2" color="$textMuted">
                        {session.user.email}
                      </Text>
                    </YStack>
                    <ActionButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      onPress={() => {
                        setEmailChangeOpen((v) => !v);
                        setEmailChangeStep('form');
                        setError('');
                        setSaved('');
                      }}
                    >
                      {emailChangeOpen ? 'Cancelar' : 'Alterar e-mail'}
                    </ActionButton>
                  </XStack>

                  {emailChangeOpen ? (
                    emailChangeStep === 'form' ? (
                      <YStack gap="$3">
                        <TextField
                          id="account-new-email"
                          label="Novo e-mail"
                          inputMode="email"
                          value={newEmail}
                          onChangeText={setNewEmail}
                          placeholder="novo@exemplo.com"
                        />
                        <TextField
                          id="account-email-password"
                          label="Senha atual"
                          secureTextEntry
                          value={emailChangePassword}
                          onChangeText={setEmailChangePassword}
                        />
                        <XStack justifyContent="flex-end">
                          <ActionButton
                            type="button"
                            variant="secondary"
                            size="sm"
                            loading={busy}
                            disabled={!newEmail.trim() || !emailChangePassword}
                            onPress={() => {
                              setBusy(true);
                              setError('');
                              void authApi
                                .startEmailChange(session.token, {
                                  newEmail: newEmail.trim(),
                                  password: emailChangePassword,
                                })
                                .then((res) => {
                                  setBusy(false);
                                  if (!res.ok) {
                                    setError(errorMessage(res.error));
                                    return;
                                  }
                                  setEmailChangeCodesRequired(
                                    res.data.codesRequired,
                                  );
                                  setEmailChangeMfaRequired(
                                    res.data.mfaRequired,
                                  );
                                  setEmailChangeStep('confirm');
                                });
                            }}
                          >
                            {busy ? 'Enviando…' : 'Enviar verificação'}
                          </ActionButton>
                        </XStack>
                      </YStack>
                    ) : (
                      <YStack gap="$3">
                        {emailChangeCodesRequired ? (
                          <>
                            <TextField
                              id="account-old-email-code"
                              label={`Código enviado para ${session.user.email}`}
                              value={oldEmailCode}
                              onChangeText={setOldEmailCode}
                              maxLength={6}
                            />
                            <TextField
                              id="account-new-email-code"
                              label={`Código enviado para ${newEmail.trim()}`}
                              value={newEmailCode}
                              onChangeText={setNewEmailCode}
                              maxLength={6}
                            />
                          </>
                        ) : null}
                        {emailChangeMfaRequired ? (
                          <TextField
                            id="account-email-mfa-code"
                            label="Código do app autenticador (TOTP)"
                            value={emailChangeMfaCode}
                            onChangeText={setEmailChangeMfaCode}
                            maxLength={12}
                          />
                        ) : null}
                        <XStack justifyContent="flex-end">
                          <ActionButton
                            type="button"
                            size="sm"
                            loading={busy}
                            onPress={() => {
                              setBusy(true);
                              setError('');
                              void authApi
                                .confirmEmailChange(session.token, {
                                  newEmail: newEmail.trim(),
                                  password: emailChangePassword,
                                  oldCode: oldEmailCode.trim(),
                                  newCode: newEmailCode.trim(),
                                  mfaCode: emailChangeMfaCode.trim(),
                                })
                                .then((res) => {
                                  setBusy(false);
                                  if (!res.ok) {
                                    setError(errorMessage(res.error));
                                    return;
                                  }
                                  beginSession(res.data);
                                  setEmailChangeOpen(false);
                                  setEmailChangePassword('');
                                  setOldEmailCode('');
                                  setNewEmailCode('');
                                  setEmailChangeMfaCode('');
                                  setSaved(
                                    'E-mail alterado com sucesso! Se o MFA por e-mail estava ativo, ele foi desvinculado para o novo endereço.',
                                  );
                                });
                            }}
                          >
                            {busy ? 'Confirmando…' : 'Confirmar novo e-mail'}
                          </ActionButton>
                        </XStack>
                      </YStack>
                    )
                  ) : null}
                </SurfaceCard>
              </YStack>
            </form>
          ) : tab === 'security' ? (
            <YStack gap="$4">
              <YStack gap="$1">
                <Text
                  fontFamily="$heading"
                  fontSize="$6"
                  fontWeight="700"
                  color="$textPrimary"
                >
                  Autenticação em 2 etapas (MFA)
                </Text>
                <Text fontFamily="$body" fontSize="$3" color="$textMuted">
                  Você pode ativar os dois métodos ao mesmo tempo para ter um
                  plano de reserva caso perca acesso ao principal.
                </Text>
              </YStack>

              <YStack gap="$2.5">
                <SurfaceCard
                  variant={emailMfaEnabled ? 'success' : 'default'}
                  padding="$4"
                  gap="$2.5"
                >
                  <XStack
                    alignItems="center"
                    justifyContent="space-between"
                    gap="$2"
                  >
                    <XStack alignItems="center" gap="$2">
                      <Mail
                        size={16}
                        color="var(--accent-link)"
                        aria-hidden={true}
                      />
                      <Text
                        fontFamily="$heading"
                        fontSize="$4"
                        fontWeight="700"
                        color="$textPrimary"
                      >
                        Código por e-mail
                      </Text>
                    </XStack>
                    <StatusBadge tone={emailMfaEnabled ? 'success' : 'neutral'}>
                      {emailMfaEnabled
                        ? totpMfaEnabled
                          ? primaryMfa === 'email'
                            ? 'Principal'
                            : 'Secundário'
                          : 'Ativo'
                        : 'Disponível'}
                    </StatusBadge>
                  </XStack>
                  <Text fontFamily="$body" fontSize="$2" color="$textSecondary">
                    Envia um código de 6 dígitos para {email} sempre que você
                    fizer login.
                  </Text>
                  <XStack
                    alignItems="center"
                    justifyContent="space-between"
                    gap="$3"
                    flexWrap="wrap"
                  >
                    <ActionButton
                      variant={emailMfaEnabled ? 'secondary' : 'primary'}
                      size="sm"
                      disabled={busy || (!emailVerified && !emailMfaEnabled)}
                      onPress={() => void toggleEmailMfa(!emailMfaEnabled)}
                    >
                      {emailMfaEnabled
                        ? 'Desativar 2FA por e-mail'
                        : !emailVerified
                          ? 'Verifique seu e-mail primeiro'
                          : 'Ativar 2FA por e-mail'}
                    </ActionButton>
                    {emailMfaEnabled && totpMfaEnabled ? (
                      <XStack alignItems="center" gap="$2">
                        <ToggleSwitch
                          checked={primaryMfa === 'email'}
                          onCheckedChange={() => {
                            setPrimaryMfa('email');
                            setSaved(
                              'Código por e-mail definido como método principal.',
                            );
                          }}
                          ariaLabel="Usar código por e-mail como principal"
                        />
                        <Text
                          fontFamily="$body"
                          fontSize="$2"
                          fontWeight="600"
                          color="$textSecondary"
                        >
                          Usar como principal
                        </Text>
                      </XStack>
                    ) : null}
                  </XStack>
                </SurfaceCard>

                <SurfaceCard
                  variant={totpMfaEnabled ? 'success' : 'default'}
                  padding="$4"
                  gap="$2.5"
                >
                  <XStack
                    alignItems="center"
                    justifyContent="space-between"
                    gap="$2"
                  >
                    <XStack alignItems="center" gap="$2">
                      <Smartphone
                        size={16}
                        color="var(--accent-link)"
                        aria-hidden={true}
                      />
                      <Text
                        fontFamily="$heading"
                        fontSize="$4"
                        fontWeight="700"
                        color="$textPrimary"
                      >
                        Aplicativo autenticador (TOTP)
                      </Text>
                    </XStack>
                    <StatusBadge tone={totpMfaEnabled ? 'success' : 'accent'}>
                      {totpMfaEnabled
                        ? emailMfaEnabled
                          ? primaryMfa === 'totp'
                            ? 'Principal'
                            : 'Secundário'
                          : 'Ativo'
                        : 'Mais seguro'}
                    </StatusBadge>
                  </XStack>
                  <Text fontFamily="$body" fontSize="$2" color="$textSecondary">
                    Compatível com Google Authenticator, Microsoft
                    Authenticator, Authy e 1Password (com 8 códigos de
                    recuperação).
                  </Text>
                  <XStack
                    alignItems="center"
                    justifyContent="space-between"
                    gap="$3"
                    flexWrap="wrap"
                  >
                    <ActionButton
                      variant={totpMfaEnabled ? 'secondary' : 'primary'}
                      size="sm"
                      onPress={() => setTotpModalOpen(true)}
                    >
                      {totpMfaEnabled
                        ? 'Gerenciar / Desativar app'
                        : 'Configurar com QR Code'}
                    </ActionButton>
                    {totpMfaEnabled && emailMfaEnabled ? (
                      <XStack alignItems="center" gap="$2">
                        <ToggleSwitch
                          checked={primaryMfa === 'totp'}
                          onCheckedChange={() => {
                            setPrimaryMfa('totp');
                            setSaved(
                              'Aplicativo autenticador (TOTP) definido como método principal.',
                            );
                          }}
                          ariaLabel="Usar aplicativo autenticador como principal"
                        />
                        <Text
                          fontFamily="$body"
                          fontSize="$2"
                          fontWeight="600"
                          color="$textSecondary"
                        >
                          Usar como principal
                        </Text>
                      </XStack>
                    ) : null}
                  </XStack>
                </SurfaceCard>
              </YStack>

              <Separator borderColor="$borderSubtle" />

              <form onSubmit={(e) => void savePassword(e)}>
                <YStack gap="$3">
                  <XStack alignItems="center" gap="$2">
                    <KeyRound
                      size={16}
                      color="var(--accent-link)"
                      aria-hidden={true}
                    />
                    <Text
                      fontFamily="$heading"
                      fontSize="$5"
                      fontWeight="700"
                      color="$textPrimary"
                    >
                      Alterar senha
                    </Text>
                  </XStack>
                  <TextField
                    id="account-current-password"
                    label="Senha atual"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry
                    autoComplete="current-password"
                  />
                  <XStack gap="$3" flexWrap="wrap">
                    <YStack flex={1} minWidth={200}>
                      <TextField
                        id="account-new-password"
                        label="Nova senha (10+ caracteres)"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        autoComplete="new-password"
                      />
                    </YStack>
                    <YStack flex={1} minWidth={200}>
                      <TextField
                        id="account-confirm-password"
                        label="Confirmar nova senha"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        autoComplete="new-password"
                      />
                    </YStack>
                  </XStack>
                  <XStack justifyContent="flex-end">
                    <ActionButton
                      type="submit"
                      loading={busy}
                      disabled={!newPassword}
                    >
                      {busy ? 'Atualizando…' : 'Atualizar senha'}
                    </ActionButton>
                  </XStack>
                </YStack>
              </form>
            </YStack>
          ) : tab === 'appearance' ? (
            <YStack gap="$3">
              <SurfaceCard
                padding="$4"
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                gap="$3"
                flexWrap="wrap"
              >
                <XStack alignItems="center" gap="$3" flex={1} minWidth={220}>
                  <YStack
                    width={36}
                    height={36}
                    borderRadius="$md"
                    backgroundColor="$bgControl"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Palette
                      size={16}
                      color="var(--accent-link)"
                      aria-hidden={true}
                    />
                  </YStack>
                  <YStack flex={1} gap="$0.5">
                    <Text
                      fontFamily="$heading"
                      fontSize="$4"
                      fontWeight="700"
                      color="$textPrimary"
                    >
                      Tema da interface
                    </Text>
                    <Text fontFamily="$body" fontSize="$2" color="$textMuted">
                      Escolha um preset e alterne entre os modos claro e escuro.
                    </Text>
                  </YStack>
                </XStack>
                <ActionButton
                  variant="secondary"
                  size="sm"
                  onPress={() => {
                    onClose();
                    onOpenThemes();
                  }}
                >
                  Escolher tema
                </ActionButton>
              </SurfaceCard>

              <SurfaceCard
                padding="$4"
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                gap="$3"
                flexWrap="wrap"
              >
                <XStack alignItems="center" gap="$3" flex={1} minWidth={220}>
                  <YStack
                    width={36}
                    height={36}
                    borderRadius="$md"
                    backgroundColor="$bgControl"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Globe
                      size={16}
                      color="var(--accent-link)"
                      aria-hidden={true}
                    />
                  </YStack>
                  <YStack flex={1} gap="$0.5">
                    <Text
                      fontFamily="$heading"
                      fontSize="$4"
                      fontWeight="700"
                      color="$textPrimary"
                    >
                      {t('common.language')}
                    </Text>
                    <Text fontFamily="$body" fontSize="$2" color="$textMuted">
                      Altere o idioma da interface (Português, English,
                      Español).
                    </Text>
                  </YStack>
                </XStack>
                <YStack width={190}>
                  <SelectField
                    id="account-locale"
                    compact
                    ariaLabel={t('common.language')}
                    value={locale}
                    options={localeOptions}
                    onValueChange={(val) => setLocale(val as Locale)}
                  />
                </YStack>
              </SurfaceCard>

              <SurfaceCard
                padding="$4"
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                gap="$3"
                flexWrap="wrap"
              >
                <XStack alignItems="center" gap="$3" flex={1} minWidth={220}>
                  <YStack
                    width={36}
                    height={36}
                    borderRadius="$md"
                    backgroundColor="$bgControl"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Bell
                      size={16}
                      color="var(--accent-link)"
                      aria-hidden={true}
                    />
                  </YStack>
                  <YStack flex={1} gap="$0.5">
                    <Text
                      fontFamily="$heading"
                      fontSize="$4"
                      fontWeight="700"
                      color="$textPrimary"
                    >
                      Notificações
                    </Text>
                    <Text fontFamily="$body" fontSize="$2" color="$textMuted">
                      Escolha quais mensagens disparam o contador no ícone do
                      servidor e o som de alerta.
                    </Text>
                  </YStack>
                </XStack>
                <YStack width={210}>
                  <SelectField
                    id="account-notify-mode"
                    compact
                    ariaLabel="Notificações do servidor e DMs"
                    value={notifyMode}
                    options={notifyOptions}
                    onValueChange={(val) =>
                      setNotifyMode(val as ChatNotifyMode)
                    }
                  />
                </YStack>
              </SurfaceCard>
            </YStack>
          ) : tab === 'accessibility' ? (
            <SurfaceCard
              padding="$4"
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              gap="$3"
              flexWrap="wrap"
            >
              <XStack alignItems="center" gap="$3" flex={1} minWidth={220}>
                <YStack
                  width={38}
                  height={38}
                  borderRadius="$md"
                  backgroundColor="$bgControl"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Accessibility
                    size={18}
                    color="var(--accent-link)"
                    aria-hidden={true}
                  />
                </YStack>
                <YStack flex={1} gap="$0.5">
                  <Text
                    fontFamily="$heading"
                    fontSize="$4"
                    fontWeight="700"
                    color="$textPrimary"
                  >
                    Acessibilidade e inclusão
                  </Text>
                  <Text fontFamily="$body" fontSize="$2" color="$textMuted">
                    Alto contraste, redução de animações, texto ampliado,
                    leitura facilitada, alertas visuais e filtros para
                    daltonismo.
                  </Text>
                </YStack>
              </XStack>
              <ActionButton size="sm" onPress={() => setA11yModalOpen(true)}>
                Configurar acessibilidade
              </ActionButton>
            </SurfaceCard>
          ) : (
            <YStack gap="$3">
              {marketingOptIn !== null ? (
                <SettingSwitchRow
                  icon={
                    <Mail
                      size={16}
                      color="var(--accent-link)"
                      aria-hidden={true}
                    />
                  }
                  title="E-mails de novidades"
                  description="Receba atualizações opcionais por e-mail. Códigos de segurança e avisos importantes sempre são enviados."
                  checked={marketingOptIn}
                  onCheckedChange={(next) => {
                    setMarketingOptIn(next);
                    void authApi.updateEmailPreferences(session.token, next);
                  }}
                />
              ) : null}

              <SurfaceCard
                padding="$4"
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                gap="$3"
                flexWrap="wrap"
              >
                <XStack alignItems="center" gap="$3" flex={1} minWidth={220}>
                  <YStack
                    width={36}
                    height={36}
                    borderRadius="$md"
                    backgroundColor="$bgControl"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Lock
                      size={16}
                      color="var(--accent-link)"
                      aria-hidden={true}
                    />
                  </YStack>
                  <YStack flex={1} gap="$0.5">
                    <Text
                      fontFamily="$heading"
                      fontSize="$4"
                      fontWeight="700"
                      color="$textPrimary"
                    >
                      Termos de Uso e Privacidade (LGPD)
                    </Text>
                    <Text fontFamily="$body" fontSize="$2" color="$textMuted">
                      Consulte nossos termos, exporte todos os seus dados
                      pessoais em JSON ou solicite exclusão da conta (Art. 18).
                    </Text>
                  </YStack>
                </XStack>
                <ActionButton
                  variant="secondary"
                  size="sm"
                  onPress={() => setLegalModalOpen(true)}
                >
                  Abrir central LGPD
                </ActionButton>
              </SurfaceCard>
            </YStack>
          )}
        </SettingsShell>
      </ModalFrame>

      {totpModalOpen ? (
        <MfaSetupModal
          token={session.token}
          mfaEnabled={totpMfaEnabled}
          onChanged={(enabled) => {
            setTotpMfaEnabled(enabled);
            if (enabled) {
              setPrimaryMfa('totp');
            } else if (emailMfaEnabled) {
              setPrimaryMfa('email');
            }
          }}
          onClose={() => setTotpModalOpen(false)}
        />
      ) : null}

      {a11yModalOpen ? (
        <AccessibilityModal
          initialNeeds={accessibilityNeeds}
          onSave={async (needs, prefs) => {
            setAccessibilityNeeds(needs);
            await authApi.updateAccount(session.token, {
              fullName,
              nickname,
              role,
              currentPassword: '',
              newPassword: '',
              genderIdentity,
              pronouns: pronouns.trim(),
              accessibilityNeeds: needs,
              accessibilityPrefs: prefs,
            });
            setSaved('Preferências de acessibilidade salvas!');
          }}
          onClose={() => setA11yModalOpen(false)}
        />
      ) : null}

      {legalModalOpen ? (
        <LegalModal
          token={session.token}
          initialTab="data"
          onClose={() => setLegalModalOpen(false)}
        />
      ) : null}
    </>
  );
}
