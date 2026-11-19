import { useEffect, useId, useState, type FormEvent } from 'react';

import { authApi } from '@/app/api';
import { beginSession } from '@/app/session';
import { errorMessage, type Session } from '@/shared/domain';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';

import { validateUpdate } from '../model/validation';
import styles from './AccountEditor.module.css';

type Props = {
  session: Session;
  onClose: () => void;
};

/**
 * Minha conta: muda nome completo (o que aparece), nickname, cargo e senha.
 * O e-mail não muda: ele diz de qual empresa a pessoa é.
 */
export function AccountEditor({ session, onClose }: Props) {
  const titleId = useId();
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState(session.user.email);
  const [fullName, setFullName] = useState(session.user.name);
  const [nickname, setNickname] = useState(session.user.nickname);
  const [role, setRole] = useState(session.user.role);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void authApi.account(session.token).then((result) => {
      if (!alive) return;
      setLoaded(true);
      if (!result.ok) return setError(errorMessage(result.error));
      setEmail(result.data.email);
      setFullName(result.data.fullName);
      setNickname(result.data.nickname);
      setRole(result.data.role);
    });
    return () => {
      alive = false;
    };
  }, [session.token]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateUpdate({
      fullName,
      nickname,
      role,
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!validation.ok) return setError(validation.message);
    setError('');
    setBusy(true);
    const result = await authApi.updateAccount(session.token, validation.data);
    setBusy(false);
    if (!result.ok) return setError(errorMessage(result.error));
    // Sessão nova: o escritório reconecta com o nome e o cargo novos.
    beginSession(result.data);
    onClose();
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className={styles.scroll}>
        <form className={styles.card} onSubmit={(e) => void save(e)} noValidate>
          <h2 id={titleId} className={styles.title}>
            Minha conta
          </h2>
          <p className={styles.email}>{email}</p>
          <Field
            label="Nome completo (é o nome que aparece)"
            value={fullName}
            onChange={setFullName}
            autoComplete="name"
            maxLength={80}
          />
          <Field
            label="Nickname (pode usar para entrar)"
            value={nickname}
            onChange={setNickname}
            autoComplete="username"
            maxLength={20}
          />
          <Field label="Cargo" value={role} onChange={setRole} maxLength={60} />
          <p className={styles.section}>
            Trocar a senha (deixe em branco para manter)
          </p>
          <Field
            label="Senha atual"
            value={currentPassword}
            onChange={setCurrentPassword}
            type="password"
            autoComplete="current-password"
          />
          <Field
            label="Senha nova (10 caracteres ou mais)"
            value={newPassword}
            onChange={setNewPassword}
            type="password"
            autoComplete="new-password"
          />
          <Field
            label="Confirme a senha nova"
            value={confirmPassword}
            onChange={setConfirmPassword}
            type="password"
            autoComplete="new-password"
          />
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            title={busy ? 'Salvando…' : 'Salvar'}
            disabled={busy || !loaded}
          />
          <Button title="Cancelar" variant="link" onClick={onClose} />
        </form>
      </div>
    </div>
  );
}
