import {
  Accessibility,
  Lock,
  Palette,
  Pencil,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';

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
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { Icon } from '@/shared/ui/Icon';

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
 * Modal completo e organizado de Conta, Perfil, Segurança (MFA multi-canal),
 * Preferências (tema, idioma, acessibilidade) e Privacidade (LGPD).
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
  const navRef = useRef<HTMLElement>(null);
  const contentInnerRef = useRef<HTMLDivElement>(null);
  const [layoutHeight, setLayoutHeight] = useState<number | undefined>(
    undefined,
  );

  useEffect(() => {
    const inner = contentInnerRef.current;
    if (!inner || typeof ResizeObserver === 'undefined') return;

    const updateHeight = () => {
      const contentHeight = inner.offsetHeight + 40;
      const navHeight = navRef.current?.scrollHeight ?? 0;
      const maxAvailable =
        typeof window !== 'undefined' ? window.innerHeight * 0.72 : 640;
      setLayoutHeight(
        Math.min(Math.max(contentHeight, navHeight), maxAvailable),
      );
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [tab, verifyOpen, error, saved, loaded]);

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

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Configurações da conta"
      data-scroll-lock="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <header className={styles.header}>
          <div className={styles.headerIdentity}>
            <h2 className={styles.title}>Configurações da conta</h2>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            aria-label="Fechar"
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        <div
          className={styles.layout}
          style={
            layoutHeight !== undefined ? { height: layoutHeight } : undefined
          }
        >
          <nav ref={navRef} className={styles.nav} aria-label="Seções da conta">
            <button
              type="button"
              className={`${styles.navBtn} ${tab === 'profile' ? styles.navActive : ''}`}
              onClick={() => {
                setTab('profile');
                setError('');
                setSaved('');
              }}
            >
              <User size={16} aria-hidden={true} />
              <span>Conta</span>
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${tab === 'security' ? styles.navActive : ''}`}
              onClick={() => {
                setTab('security');
                setError('');
                setSaved('');
              }}
            >
              <ShieldCheck size={16} aria-hidden={true} />
              <span>Segurança</span>
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${tab === 'appearance' ? styles.navActive : ''}`}
              onClick={() => {
                setTab('appearance');
                setError('');
                setSaved('');
              }}
            >
              <Palette size={16} aria-hidden={true} />
              <span>Tema e idioma</span>
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${tab === 'accessibility' ? styles.navActive : ''}`}
              onClick={() => {
                setTab('accessibility');
                setError('');
                setSaved('');
              }}
            >
              <Accessibility size={16} aria-hidden={true} />
              <span>Acessibilidade</span>
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${tab === 'privacy' ? styles.navActive : ''}`}
              onClick={() => {
                setTab('privacy');
                setError('');
                setSaved('');
              }}
            >
              <Lock size={16} aria-hidden={true} />
              <span>Privacidade</span>
            </button>

            {onExit ? (
              <button
                type="button"
                className={styles.logoutBtn}
                onClick={() => {
                  onClose();
                  onExit();
                }}
              >
                <Icon name="exit" size={16} color="var(--danger-text)" />
                <span>Sair da conta</span>
              </button>
            ) : null}
          </nav>

          <div className={styles.content}>
            <div ref={contentInnerRef} className={styles.contentInner}>
              {error ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}
              {saved && !error ? (
                <p className={styles.saved} role="status">
                  {saved}
                </p>
              ) : null}

              {tab === 'profile' ? (
                <form
                  className={styles.section}
                  onSubmit={(e) => void saveProfile(e)}
                  noValidate
                >
                  <div className={styles.avatarSection}>
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
                    <span className={styles.avatarMeta}>
                      {email} · {ACCOUNT_TIER_LABELS[tier]}
                      {secondaryTiers.length > 0
                        ? ` + ${secondaryTiers.map((s) => ACCOUNT_TIER_LABELS[s]).join(', ')}`
                        : ''}
                    </span>
                  </div>

                  {loaded && !emailVerified ? (
                    <div className={styles.warnBox}>
                      <div>
                        <strong>✉️ E-mail ainda não verificado</strong>
                        <p>
                          Confirme seu e-mail para proteger sua conta e liberar
                          o 2FA por e-mail.
                        </p>
                      </div>
                      {!verifyOpen ? (
                        <button
                          type="button"
                          className={styles.primarySmallBtn}
                          disabled={verifyBusy}
                          onClick={() => void sendVerifyCode()}
                        >
                          {verifyBusy ? 'Enviando…' : 'Enviar código'}
                        </button>
                      ) : (
                        <div className={styles.inlineVerify}>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="000000"
                            value={verifyCode}
                            onChange={(e) =>
                              setVerifyCode(
                                e.target.value.replace(/\D/g, '').slice(0, 6),
                              )
                            }
                            className={styles.input}
                          />
                          <button
                            type="button"
                            className={styles.primarySmallBtn}
                            disabled={verifyBusy || verifyCode.length !== 6}
                            onClick={() => void confirmVerifyCode()}
                          >
                            Confirmar
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className={styles.grid2}>
                    <Field
                      label="Nome completo"
                      value={fullName}
                      onChange={setFullName}
                      maxLength={80}
                      variant="auth"
                      fullWidth
                    />
                    <div>
                      <div className={styles.usernameRow}>
                        <div className={styles.usernameFieldWrap}>
                          <Field
                            label="Nome de usuário"
                            value={nickname}
                            onChange={(val) => {
                              setNickname(val);
                              setUsernameCheck({ status: 'idle' });
                            }}
                            maxLength={20}
                            variant="auth"
                            fullWidth
                          />
                        </div>
                        {nickname.trim().toLowerCase() !==
                        session.user.nickname.toLowerCase() ? (
                          <button
                            type="button"
                            className={styles.checkUsernameBtn}
                            disabled={
                              usernameCheck.status === 'checking' ||
                              nickname.trim().length < 3
                            }
                            onClick={() => {
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
                                .checkUsernameAvailable(
                                  candidate,
                                  session.token,
                                )
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
                            {usernameCheck.status === 'checking'
                              ? 'Verificando…'
                              : 'Verificar'}
                          </button>
                        ) : null}
                      </div>
                      {usernameCheck.message ? (
                        <p
                          className={
                            usernameCheck.status === 'available'
                              ? styles.usernameHintOk
                              : styles.usernameHintErr
                          }
                          role="status"
                        >
                          {usernameCheck.message}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles.grid2}>
                    <label className={styles.selectField}>
                      <span>Identidade de gênero (opcional)</span>
                      <select
                        value={genderIdentity}
                        onChange={(e) =>
                          setGenderIdentity(e.target.value as GenderIdentity)
                        }
                        className={styles.select}
                      >
                        {GENDER_IDENTITIES.map((g) => (
                          <option key={g} value={g}>
                            {GENDER_IDENTITY_LABELS[g]}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className={styles.selectField}>
                      <span>Pronomes (opcional)</span>
                      <select
                        value={
                          (PRONOUN_PRESETS as readonly string[]).includes(
                            pronouns,
                          )
                            ? pronouns
                            : ''
                        }
                        onChange={(e) => setPronouns(e.target.value)}
                        className={styles.select}
                      >
                        {PRONOUN_PRESETS.map((p) => (
                          <option key={p || 'none'} value={p}>
                            {p || 'Prefiro não informar'}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    title={busy ? 'Salvando…' : 'Salvar perfil'}
                    variant="gradient"
                    disabled={busy || !loaded}
                  />

                  <div className={styles.mfaCard} style={{ marginTop: 14 }}>
                    <div className={styles.mfaCardHead}>
                      <div>
                        <strong>E-mail da conta</strong>
                        <p className={styles.hint}>{session.user.email}</p>
                      </div>
                      <button
                        type="button"
                        className={styles.checkUsernameBtn}
                        onClick={() => {
                          setEmailChangeOpen((v) => !v);
                          setEmailChangeStep('form');
                          setError('');
                          setSaved('');
                        }}
                      >
                        {emailChangeOpen ? 'Cancelar' : 'Alterar e-mail'}
                      </button>
                    </div>

                    {emailChangeOpen ? (
                      emailChangeStep === 'form' ? (
                        <div className={styles.form} style={{ marginTop: 10 }}>
                          <Field
                            label="Novo e-mail"
                            type="email"
                            value={newEmail}
                            onChange={setNewEmail}
                            placeholder="novo@exemplo.com"
                            variant="auth"
                            fullWidth
                          />
                          <Field
                            label="Senha atual"
                            type="password"
                            value={emailChangePassword}
                            onChange={setEmailChangePassword}
                            variant="auth"
                            fullWidth
                          />
                          <Button
                            type="button"
                            title={busy ? 'Enviando…' : 'Enviar verificação'}
                            variant="secondary"
                            disabled={
                              busy || !newEmail.trim() || !emailChangePassword
                            }
                            onClick={() => {
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
                          />
                        </div>
                      ) : (
                        <div className={styles.form} style={{ marginTop: 10 }}>
                          {emailChangeCodesRequired ? (
                            <>
                              <Field
                                label={`Código enviado para ${session.user.email}`}
                                value={oldEmailCode}
                                onChange={setOldEmailCode}
                                maxLength={6}
                                variant="auth"
                                fullWidth
                              />
                              <Field
                                label={`Código enviado para ${newEmail.trim()}`}
                                value={newEmailCode}
                                onChange={setNewEmailCode}
                                maxLength={6}
                                variant="auth"
                                fullWidth
                              />
                            </>
                          ) : null}
                          {emailChangeMfaRequired ? (
                            <Field
                              label="Código do app autenticador (TOTP)"
                              value={emailChangeMfaCode}
                              onChange={setEmailChangeMfaCode}
                              maxLength={12}
                              variant="auth"
                              fullWidth
                            />
                          ) : null}
                          <Button
                            type="button"
                            title={
                              busy ? 'Confirmando…' : 'Confirmar novo e-mail'
                            }
                            variant="gradient"
                            disabled={busy}
                            onClick={() => {
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
                          />
                        </div>
                      )
                    ) : null}
                  </div>
                </form>
              ) : tab === 'security' ? (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    Autenticação em 2 etapas (MFA)
                  </h3>
                  <p className={styles.hint}>
                    Você pode ativar os dois métodos ao mesmo tempo para ter um
                    plano de reserva caso perca acesso ao principal:
                  </p>

                  <div className={styles.mfaCards}>
                    <div
                      className={`${styles.mfaCard} ${emailMfaEnabled ? styles.mfaCardActive : ''}`}
                    >
                      <div className={styles.mfaCardHead}>
                        <strong>Código por e-mail</strong>
                        <span className={styles.pill}>
                          {emailMfaEnabled
                            ? totpMfaEnabled
                              ? primaryMfa === 'email'
                                ? 'Principal'
                                : 'Secundário'
                              : 'Ativo'
                            : 'Disponível'}
                        </span>
                      </div>
                      <p className={styles.hint}>
                        Envia um código de 6 dígitos para{' '}
                        <strong>{email}</strong> sempre que você fizer login.
                      </p>
                      <div className={styles.mfaCardActions}>
                        <button
                          type="button"
                          className={
                            emailMfaEnabled
                              ? styles.secondaryBtn
                              : styles.primarySmallBtn
                          }
                          disabled={
                            busy || (!emailVerified && !emailMfaEnabled)
                          }
                          onClick={() => void toggleEmailMfa(!emailMfaEnabled)}
                        >
                          {emailMfaEnabled
                            ? 'Desativar 2FA por e-mail'
                            : !emailVerified
                              ? 'Verifique seu e-mail primeiro'
                              : 'Ativar 2FA por e-mail'}
                        </button>
                        {emailMfaEnabled && totpMfaEnabled ? (
                          <label className={styles.primaryCheck}>
                            <input
                              type="checkbox"
                              checked={primaryMfa === 'email'}
                              onChange={() => {
                                setPrimaryMfa('email');
                                setSaved(
                                  'Código por e-mail definido como método principal.',
                                );
                              }}
                            />
                            <span>Usar como principal</span>
                          </label>
                        ) : null}
                      </div>
                    </div>

                    <div
                      className={`${styles.mfaCard} ${totpMfaEnabled ? styles.mfaCardActive : ''}`}
                    >
                      <div className={styles.mfaCardHead}>
                        <strong>Aplicativo autenticador (TOTP)</strong>
                        <span className={styles.pill}>
                          {totpMfaEnabled
                            ? emailMfaEnabled
                              ? primaryMfa === 'totp'
                                ? 'Principal'
                                : 'Secundário'
                              : 'Ativo'
                            : 'Mais seguro'}
                        </span>
                      </div>
                      <p className={styles.hint}>
                        Compatível com Google Authenticator, Microsoft
                        Authenticator, Authy e 1Password (com 8 códigos de
                        recuperação).
                      </p>
                      <div className={styles.mfaCardActions}>
                        <button
                          type="button"
                          className={
                            totpMfaEnabled
                              ? styles.secondaryBtn
                              : styles.primarySmallBtn
                          }
                          onClick={() => setTotpModalOpen(true)}
                        >
                          {totpMfaEnabled
                            ? 'Gerenciar / Desativar app'
                            : 'Configurar com QR Code'}
                        </button>
                        {totpMfaEnabled && emailMfaEnabled ? (
                          <label className={styles.primaryCheck}>
                            <input
                              type="checkbox"
                              checked={primaryMfa === 'totp'}
                              onChange={() => {
                                setPrimaryMfa('totp');
                                setSaved(
                                  'Aplicativo autenticador (TOTP) definido como método principal.',
                                );
                              }}
                            />
                            <span>Usar como principal</span>
                          </label>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <form
                    className={styles.passwordBox}
                    onSubmit={(e) => void savePassword(e)}
                  >
                    <h3 className={styles.sectionTitle}>Alterar senha</h3>
                    <Field
                      label="Senha atual"
                      value={currentPassword}
                      onChange={setCurrentPassword}
                      type="password"
                      autoComplete="current-password"
                      variant="auth"
                      fullWidth
                    />
                    <div className={styles.grid2}>
                      <Field
                        label="Nova senha (10+ caracteres)"
                        value={newPassword}
                        onChange={setNewPassword}
                        type="password"
                        autoComplete="new-password"
                        variant="auth"
                        fullWidth
                      />
                      <Field
                        label="Confirmar nova senha"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        type="password"
                        autoComplete="new-password"
                        variant="auth"
                        fullWidth
                      />
                    </div>
                    <Button
                      type="submit"
                      title={busy ? 'Atualizando…' : 'Atualizar senha'}
                      variant="gradient"
                      disabled={busy || !newPassword}
                    />
                  </form>
                </div>
              ) : tab === 'appearance' ? (
                <div className={styles.section}>
                  <div className={styles.prefCard}>
                    <div>
                      <strong>Tema da interface</strong>
                      <p className={styles.hint}>
                        Escolha um preset e alterne entre os modos claro e
                        escuro.
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => {
                        onClose();
                        onOpenThemes();
                      }}
                    >
                      Escolher tema
                    </button>
                  </div>

                  <div className={styles.prefCard}>
                    <div>
                      <strong>{t('common.language')}</strong>
                      <p className={styles.hint}>
                        Altere o idioma da interface (Português, English,
                        Español).
                      </p>
                    </div>
                    <select
                      aria-label={t('common.language')}
                      value={locale}
                      onChange={(e) => setLocale(e.target.value as Locale)}
                      className={styles.select}
                    >
                      {SUPPORTED_LOCALES.map((loc) => (
                        <option key={loc} value={loc}>
                          {t(`common.language.${loc}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.prefCard}>
                    <div>
                      <strong>Notificações</strong>
                      <p className={styles.hint}>
                        Escolha quais mensagens disparam o contador no ícone do
                        servidor e o som de alerta.
                      </p>
                    </div>
                    <select
                      aria-label="Notificações do servidor e DMs"
                      value={notifyMode}
                      onChange={(e) =>
                        setNotifyMode(e.target.value as ChatNotifyMode)
                      }
                      className={styles.select}
                    >
                      {CHAT_NOTIFY_MODES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : tab === 'accessibility' ? (
                <div className={styles.section}>
                  <div className={styles.prefCard}>
                    <div>
                      <strong>Acessibilidade e inclusão</strong>
                      <p className={styles.hint}>
                        Alto contraste, redução de animações, texto ampliado,
                        leitura facilitada, alertas visuais e filtros para
                        daltonismo.
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.primarySmallBtn}
                      onClick={() => setA11yModalOpen(true)}
                    >
                      Configurar acessibilidade
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.section}>
                  {marketingOptIn !== null ? (
                    <label className={styles.prefCard}>
                      <div>
                        <strong>E-mails de novidades</strong>
                        <p className={styles.hint}>
                          Receba atualizações opcionais por e-mail. Códigos de
                          segurança e avisos importantes sempre são enviados.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={marketingOptIn}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setMarketingOptIn(next);
                          void authApi.updateEmailPreferences(
                            session.token,
                            next,
                          );
                        }}
                      />
                    </label>
                  ) : null}

                  <div className={styles.prefCard}>
                    <div>
                      <strong>Termos de Uso e Privacidade (LGPD)</strong>
                      <p className={styles.hint}>
                        Consulte nossos termos, exporte todos os seus dados
                        pessoais em JSON ou solicite exclusão da conta (Art.
                        18).
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => setLegalModalOpen(true)}
                    >
                      Abrir central LGPD
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
    </div>,
    document.body,
  );
}
