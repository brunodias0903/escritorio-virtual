import { useState, type FormEvent } from 'react';

import { authApi } from '@/app/api';
import { beginSession } from '@/app/session';
import {
  recommendedPrefsForNeeds,
  useAccessibilityStore,
} from '@/features/accessibility/accessibilityStore';
import {
  ACCESSIBILITY_NEEDS,
  ACCESSIBILITY_NEED_LABELS,
  GENDER_IDENTITIES,
  GENDER_IDENTITY_LABELS,
  PRONOUN_PRESETS,
  errorMessage,
  type AccessibilityNeed,
  type GenderIdentity,
} from '@/shared/domain';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';

import { validateRegister } from '../model/validation';
import styles from './AuthForm.module.css';
import { BriefcaseIcon, LockIcon, MailIcon, UserIcon } from './AuthIcons';
import { CodeField } from './CodeField';
import { SocialAuthButtons } from './SocialAuthButtons';

type Props = {
  /** Pede o código do e-mail antes de criar a conta. */
  emailCodes: boolean;
  /** Domínios aceitos, só para a dica (ex.: "gmail.com", "outlook.com"). */
  domains: string[];
  onBack: () => void;
};

const formatDomainsHint = (
  domains: string[],
): { text: string; title?: string } | null => {
  if (domains.length === 0) return null;
  const formatted = domains.map((d) => `@${d}`);
  if (formatted.length <= 3) {
    return { text: `Domínios aceitos: ${formatted.join(', ')}` };
  }
  const preview = formatted.slice(0, 3).join(', ');
  const rest = formatted.length - 3;
  return {
    text: `Aceita ${preview} e outros ${rest} provedores`,
    title: formatted.join(', '),
  };
};

/** Cadastro: nome completo, nickname, e-mail liberado no servidor, e senha (duas vezes). */
export function LocalRegisterForm({ emailCodes, domains, onBack }: Props) {
  const domainsHint = formatDomainsHint(domains);
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [code, setCode] = useState('');
  const [info, setInfo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailMarketingOptIn, setEmailMarketingOptIn] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [inclusionOpen, setInclusionOpen] = useState(false);
  const [genderIdentity, setGenderIdentity] =
    useState<GenderIdentity>('prefer_not_to_say');
  const [pronouns, setPronouns] = useState('');
  const [accessibilityNeeds, setAccessibilityNeeds] = useState<
    AccessibilityNeed[]
  >([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateRegister({
      fullName,
      nickname,
      email,
      ...(emailCodes ? { code } : {}),
      role,
      password,
      confirmPassword,
    });
    if (!acceptedTerms) {
      return setError(
        'Confirme que você tem 18 anos ou mais e aceita os Termos de Uso e Privacidade (LGPD).',
      );
    }
    if (!validation.ok) return setError(validation.message);
    setError('');
    setInfo('');
    setBusy(true);
    const accessibilityPrefs =
      accessibilityNeeds.length > 0
        ? recommendedPrefsForNeeds(accessibilityNeeds)
        : undefined;
    if (accessibilityPrefs) {
      useAccessibilityStore.getState().hydrate(accessibilityPrefs);
    }
    const result = await authApi.register({
      ...validation.data,
      emailMarketingOptIn,
      acceptedTerms: true,
      ...(genderIdentity !== 'prefer_not_to_say' ? { genderIdentity } : {}),
      ...(pronouns.trim() ? { pronouns: pronouns.trim() } : {}),
      ...(accessibilityNeeds.length > 0 ? { accessibilityNeeds } : {}),
      ...(accessibilityPrefs ? { accessibilityPrefs } : {}),
    });
    setBusy(false);
    // A conta já entra direto. Depois, entra-se com o nickname (ou o e-mail) e a senha.
    if (result.ok) beginSession(result.data);
    else setError(errorMessage(result.error));
  };

  return (
    <form className={styles.form} onSubmit={(e) => void submit(e)} noValidate>
      <div className={styles.header}>
        <h2 className={styles.title}>Criar conta</h2>
        <p className={styles.subtitle}>
          Preencha seus dados para entrar no escritório
        </p>
      </div>

      <div className={styles.row}>
        <Field
          label="Nome e sobrenome"
          value={fullName}
          onChange={setFullName}
          autoComplete="name"
          placeholder="Maria Silva"
          leadingIcon={<UserIcon />}
          maxLength={80}
          variant="auth"
          fullWidth
        />
        <Field
          label="Apelido (nickname)"
          value={nickname}
          onChange={setNickname}
          autoComplete="username"
          placeholder="maria.silva"
          leadingIcon={<UserIcon />}
          maxLength={20}
          variant="auth"
          fullWidth
        />
      </div>

      <Field
        label="E-mail"
        value={email}
        onChange={setEmail}
        type="email"
        autoComplete="email"
        placeholder="seu.nome@gmail.com"
        leadingIcon={<MailIcon />}
        hint={domainsHint?.text}
        hintTitle={domainsHint?.title}
        variant="auth"
        fullWidth
      />

      {emailCodes ? (
        <CodeField
          email={email}
          purpose="register"
          code={code}
          onCode={setCode}
          fullWidth
          onMessage={(text, kind) => {
            setError(kind === 'error' ? text : '');
            setInfo(kind === 'info' ? text : '');
          }}
        />
      ) : null}

      <Field
        label="Cargo / Função (opcional)"
        value={role}
        onChange={setRole}
        placeholder="Ex.: Desenvolvedor, Designer"
        leadingIcon={<BriefcaseIcon />}
        maxLength={60}
        variant="auth"
        fullWidth
      />

      <div className={styles.row}>
        <Field
          label="Senha (10+ caracteres)"
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 10 caracteres"
          leadingIcon={<LockIcon />}
          variant="auth"
          fullWidth
        />
        <Field
          label="Confirme a senha"
          value={confirmPassword}
          onChange={setConfirmPassword}
          type="password"
          autoComplete="new-password"
          placeholder="Repita a senha"
          leadingIcon={<LockIcon />}
          variant="auth"
          fullWidth
        />
      </div>

      <button
        type="button"
        onClick={() => setInclusionOpen((v) => !v)}
        style={{
          alignSelf: 'flex-start',
          fontSize: 12.5,
          fontWeight: 600,
          color: '#a59dff',
          cursor: 'pointer',
          padding: '2px 0',
        }}
      >
        {inclusionOpen ? '▾' : '▸'} Inclusão, pronomes e acessibilidade
        (opcional)
      </button>

      {inclusionOpen ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: 12,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              fontSize: 12,
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            <span>Identidade de gênero (opcional)</span>
            <select
              value={genderIdentity}
              onChange={(e) =>
                setGenderIdentity(e.target.value as GenderIdentity)
              }
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                background: 'rgba(18,18,34,0.85)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.14)',
                fontSize: 13,
              }}
            >
              {GENDER_IDENTITIES.map((g) => (
                <option key={g} value={g}>
                  {GENDER_IDENTITY_LABELS[g]}
                </option>
              ))}
            </select>
          </label>

          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              fontSize: 12,
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            <span>Pronomes (opcional)</span>
            <select
              value={
                (PRONOUN_PRESETS as readonly string[]).includes(pronouns)
                  ? pronouns
                  : ''
              }
              onChange={(e) => setPronouns(e.target.value)}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                background: 'rgba(18,18,34,0.85)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.14)',
                fontSize: 13,
              }}
            >
              {PRONOUN_PRESETS.map((p) => (
                <option key={p || 'none'} value={p}>
                  {p || 'Prefiro não informar'}
                </option>
              ))}
            </select>
          </label>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              fontSize: 12,
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            <span>
              Necessidades de acessibilidade / PCD (opcional e privado — ativa
              recursos automaticamente):
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ACCESSIBILITY_NEEDS.map((need) => {
                const active = accessibilityNeeds.includes(need);
                return (
                  <button
                    key={need}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setAccessibilityNeeds((prev) =>
                        prev.includes(need)
                          ? prev.filter((n) => n !== need)
                          : [...prev, need],
                      )
                    }
                    style={{
                      padding: '5px 9px',
                      borderRadius: 999,
                      fontSize: 11.5,
                      border: active
                        ? '1px solid #a59dff'
                        : '1px solid rgba(255,255,255,0.16)',
                      background: active
                        ? 'rgba(108,99,255,0.28)'
                        : 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    {active ? '✓ ' : ''}
                    {ACCESSIBILITY_NEED_LABELS[need]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className={styles.checkbox}
          required
        />
        <span className={styles.checkboxText}>
          <strong>Declaro ter 18 anos ou mais</strong>, estou ciente de que o
          Escritório Virtual é de uso profissional para maiores de idade (ECA —
          Lei nº 8.069/1990) e concordo com os Termos de Uso e Política de
          Privacidade (LGPD).
        </span>
      </label>

      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={emailMarketingOptIn}
          onChange={(e) => setEmailMarketingOptIn(e.target.checked)}
          className={styles.checkbox}
        />
        <span className={styles.checkboxText}>
          Aceito receber novidades, patch notes e atualizações do escritório por
          e-mail (e-mails importantes como códigos de conta sempre são
          enviados).
        </span>
      </label>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {info && !error ? <p className={styles.info}>{info}</p> : null}

      <Button
        type="submit"
        title={busy ? 'Criando…' : 'Criar conta e entrar'}
        variant="gradient"
        disabled={busy}
        fullWidth
      />

      <SocialAuthButtons />

      <div className={styles.links}>
        <p className={styles.switchText}>
          Já tem uma conta?
          <button type="button" onClick={onBack} className={styles.switchLink}>
            Entrar
          </button>
        </p>
      </div>
    </form>
  );
}
