import { useState, type FormEvent } from 'react';

import { authApi } from '@/app/api';
import { beginSession } from '@/app/session';
import { errorMessage } from '@/shared/domain';
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
    if (!validation.ok) return setError(validation.message);
    setError('');
    setInfo('');
    setBusy(true);
    const result = await authApi.register(validation.data);
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
