import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';

import { authApi } from '@/app/api';
import { beginSession } from '@/app/session';
import { AccessibilityModal } from '@/features/accessibility/AccessibilityModal';
import { useAccessibilityStore } from '@/features/accessibility/accessibilityStore';
import { validateUpdate } from '@/features/auth/model/validation';
import { LegalModal } from '@/features/legal/LegalModal';
import { FaceAvatar } from '@/features/office/components/FaceAvatar';
import {
  ACCOUNT_TIER_LABELS,
  GENDER_IDENTITIES,
  GENDER_IDENTITY_LABELS,
  PRONOUN_PRESETS,
  STATUSES,
  STATUS_LABELS,
  defaultAppearance,
  errorMessage,
  type AccessibilityNeed,
  type AccountTier,
  type Appearance,
  type GenderIdentity,
  type MfaMethod,
  type Session,
  type Status,
} from '@/shared/domain';
import { SUPPORTED_LOCALES, useI18n, type Locale } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { Icon } from '@/shared/ui/Icon';

import styles from './AccountModal.module.css';
import { MfaSetupModal } from './MfaSetupModal';

type Tab = 'profile' | 'security' | 'preferences' | 'privacy';

const STATUS_COLORS: Record<Status, string> = {
  available: '#31e0c1',
  busy: '#ff6b81',
  away: '#f1c40f',
};

type Props = {
  session: Session;
  status: Status;
  appearance: Appearance | undefined;
  initialTab?: Tab;
  onStatus: (status: Status) => void;
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
  status,
  appearance,
  initialTab = 'profile',
  onStatus,
  onEditAvatar,
  onOpenThemes,
  onExit,
  onClose,
}: Props) {
  const { locale, setLocale, t } = useI18n();
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
  const [mfaMethod, setMfaMethod] = useState<MfaMethod>('none');
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
  const [a11yModalOpen, setA11yModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

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
      setMfaMethod(
        res.data.mfaEnabled ? (res.data.mfaMethod ?? 'totp') : 'none',
      );
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
    setMfaMethod(res.data.mfaMethod);
    setSaved(
      enable
        ? '2FA por e-mail ativado! Um código de 6 dígitos será enviado no login.'
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
            <FaceAvatar
              appearance={appearance ?? defaultAppearance(session.user.email)}
              size={40}
            />
            <div>
              <h2 className={styles.title}>{fullName || session.user.name}</h2>
              <p className={styles.subtitle}>
                {email} · {tier === 'master' ? '👑 ' : ''}
                {ACCOUNT_TIER_LABELS[tier]}
                {secondaryTiers.length > 0
                  ? ` + ${secondaryTiers.map((s) => ACCOUNT_TIER_LABELS[s]).join(', ')}`
                  : ''}
              </p>
            </div>
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

        <div className={styles.layout}>
          <nav className={styles.nav} aria-label="Seções da conta">
            <button
              type="button"
              className={`${styles.navBtn} ${tab === 'profile' ? styles.navActive : ''}`}
              onClick={() => {
                setTab('profile');
                setError('');
                setSaved('');
              }}
            >
              👤 Perfil & Conta
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
              🔐 Segurança & 2FA
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${tab === 'preferences' ? styles.navActive : ''}`}
              onClick={() => {
                setTab('preferences');
                setError('');
                setSaved('');
              }}
            >
              🎨 Aparência & ♿
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
              ⚖️ Privacidade (LGPD)
            </button>
          </nav>

          <div className={styles.content}>
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
                <div className={styles.quickRow}>
                  <div className={styles.statusChips}>
                    {STATUSES.map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={status === value}
                        className={`${styles.statusChip} ${status === value ? styles.statusChipActive : ''}`}
                        onClick={() => onStatus(value)}
                      >
                        <span
                          className={styles.dot}
                          style={{ backgroundColor: STATUS_COLORS[value] }}
                        />
                        {STATUS_LABELS[value]}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => {
                      onClose();
                      onEditAvatar();
                    }}
                  >
                    ✏️ Personalizar avatar e foto
                  </button>
                </div>

                {loaded && !emailVerified ? (
                  <div className={styles.warnBox}>
                    <div>
                      <strong>✉️ E-mail ainda não verificado</strong>
                      <p>
                        Confirme seu e-mail para proteger sua conta e liberar o
                        2FA por e-mail.
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
                  <Field
                    label="Nickname (login)"
                    value={nickname}
                    onChange={setNickname}
                    maxLength={20}
                    variant="auth"
                    fullWidth
                  />
                </div>

                <Field
                  label="Cargo / Função"
                  value={role}
                  onChange={setRole}
                  placeholder="Ex.: Desenvolvedor, Designer"
                  maxLength={60}
                  variant="auth"
                  fullWidth
                />

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
              </form>
            ) : tab === 'security' ? (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  Autenticação em 2 etapas (MFA)
                </h3>
                <p className={styles.hint}>
                  Escolha como deseja confirmar seu login em novos dispositivos:
                </p>

                <div className={styles.mfaCards}>
                  <div
                    className={`${styles.mfaCard} ${mfaMethod === 'email' ? styles.mfaCardActive : ''}`}
                  >
                    <div className={styles.mfaCardHead}>
                      <strong>✉️ Código por E-mail (Padrão)</strong>
                      <span className={styles.pill}>
                        {mfaMethod === 'email' ? 'Ativo' : 'Disponível'}
                      </span>
                    </div>
                    <p className={styles.hint}>
                      Envia um código de 6 dígitos para <strong>{email}</strong>{' '}
                      sempre que você fizer login.
                    </p>
                    <button
                      type="button"
                      className={
                        mfaMethod === 'email'
                          ? styles.secondaryBtn
                          : styles.primarySmallBtn
                      }
                      disabled={
                        busy || (!emailVerified && mfaMethod !== 'email')
                      }
                      onClick={() => void toggleEmailMfa(mfaMethod !== 'email')}
                    >
                      {mfaMethod === 'email'
                        ? 'Desativar 2FA por e-mail'
                        : !emailVerified
                          ? 'Verifique seu e-mail primeiro'
                          : 'Usar 2FA por e-mail'}
                    </button>
                  </div>

                  <div
                    className={`${styles.mfaCard} ${mfaMethod === 'totp' ? styles.mfaCardActive : ''}`}
                  >
                    <div className={styles.mfaCardHead}>
                      <strong>📱 App Autenticador (TOTP)</strong>
                      <span className={styles.pill}>
                        {mfaMethod === 'totp' ? 'Ativo' : 'Mais seguro'}
                      </span>
                    </div>
                    <p className={styles.hint}>
                      Compatível com Google Authenticator, Microsoft
                      Authenticator, Authy e 1Password (com 8 códigos de
                      recuperação).
                    </p>
                    <button
                      type="button"
                      className={
                        mfaMethod === 'totp'
                          ? styles.secondaryBtn
                          : styles.primarySmallBtn
                      }
                      onClick={() => setTotpModalOpen(true)}
                    >
                      {mfaMethod === 'totp'
                        ? 'Gerenciar / Desativar app'
                        : 'Configurar com QR Code'}
                    </button>
                  </div>

                  <div
                    className={`${styles.mfaCard} ${styles.mfaCardDisabled}`}
                  >
                    <div className={styles.mfaCardHead}>
                      <strong>💬 WhatsApp</strong>
                      <span className={styles.pillMuted}>
                        Em breve (Fase 3)
                      </span>
                    </div>
                    <p className={styles.hint}>
                      Envio de códigos via WhatsApp Business Cloud API será
                      liberado quando o servidor entrar em nuvem na Fase 3
                      (mantendo a V1 100% gratuita).
                    </p>
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
            ) : tab === 'preferences' ? (
              <div className={styles.section}>
                <div className={styles.prefCard}>
                  <div>
                    <strong>🎨 Temas e cores da interface</strong>
                    <p className={styles.hint}>
                      Escolha entre temas prontos ou personalize cada cor do
                      Escritório Virtual.
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
                    Abrir temas
                  </button>
                </div>

                <div className={styles.prefCard}>
                  <div>
                    <strong>🌐 {t('common.language')}</strong>
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
                    <strong>♿ Acessibilidade & inclusão</strong>
                    <p className={styles.hint}>
                      Alto contraste, reduzir animações, texto ampliado, leitura
                      facilitada, alertas visuais e filtros para daltonismo.
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
                      <strong>📬 E-mails de novidades e patch notes</strong>
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
                    <strong>
                      ⚖️ Termos de Uso (ECA 18+), Privacidade & LGPD
                    </strong>
                    <p className={styles.hint}>
                      Consulte nossos termos, exporte todos os seus dados
                      pessoais em JSON ou solicite exclusão da conta (Art. 18).
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
        {onExit ? (
          <footer className={styles.footer}>
            <button
              type="button"
              className={styles.logoutBtn}
              onClick={() => {
                onClose();
                onExit();
              }}
            >
              <Icon name="exit" size={16} color="#ff9aa8" />
              <span>Sair da conta</span>
            </button>
          </footer>
        ) : null}
      </div>

      {totpModalOpen ? (
        <MfaSetupModal
          token={session.token}
          mfaEnabled={mfaMethod === 'totp'}
          onChanged={(enabled) => setMfaMethod(enabled ? 'totp' : 'none')}
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
