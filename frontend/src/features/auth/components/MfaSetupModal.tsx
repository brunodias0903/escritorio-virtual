import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';

import { authApi } from '@/app/api';
import { errorMessage, type MfaSetupResponse } from '@/shared/domain';

import styles from './MfaSetupModal.module.css';

type Props = {
  token: string;
  mfaEnabled: boolean;
  onChanged: (enabled: boolean) => void;
  onClose: () => void;
};

/**
 * Configuração de Autenticação em 2 Etapas (MFA / TOTP) compatível com
 * Google Authenticator, Microsoft Authenticator, Authy, 1Password e similares.
 */
export function MfaSetupModal({
  token,
  mfaEnabled,
  onChanged,
  onClose,
}: Props) {
  const [setup, setSetup] = useState<MfaSetupResponse | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const startSetup = async () => {
    setBusy(true);
    setError('');
    const res = await authApi.setupMfa(token);
    setBusy(false);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setSetup(res.data);
  };

  const handleEnable = async (e: FormEvent) => {
    e.preventDefault();
    const clean = code.replace(/\D/g, '').slice(0, 6);
    if (clean.length !== 6) {
      setError('Digite o código de 6 dígitos exibido no app autenticador.');
      return;
    }
    setBusy(true);
    setError('');
    const res = await authApi.enableMfa(token, clean);
    setBusy(false);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setRecoveryCodes(res.data.recoveryCodes);
    setSetup(null);
    setCode('');
    onChanged(true);
  };

  const handleDisable = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || code.trim().length < 6) {
      setError('Informe sua senha atual e o código do autenticador.');
      return;
    }
    setBusy(true);
    setError('');
    const res = await authApi.disableMfa(token, password, code.trim());
    setBusy(false);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    onChanged(false);
    onClose();
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignora
    }
  };

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Autenticação em 2 etapas (MFA)"
      data-scroll-lock="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !recoveryCodes) onClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>🔐 Autenticação em 2 etapas (MFA)</h2>
          <button
            type="button"
            className={styles.closeBtn}
            aria-label="Fechar"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {recoveryCodes ? (
            <>
              <div className={styles.successBadge}>
                ✅ Autenticação em 2 etapas ativada!
              </div>
              <p className={styles.desc}>
                Guarde estes <strong>8 códigos de recuperação</strong> em um
                local seguro. Cada código pode ser usado uma única vez caso você
                perca acesso ao celular.
              </p>
              <div className={styles.codesGrid}>
                {recoveryCodes.map((c) => (
                  <code key={c} className={styles.recoveryCode}>
                    {c}
                  </code>
                ))}
              </div>
              <div className={styles.btnRow}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => void copyText(recoveryCodes.join('\n'))}
                >
                  {copied ? '✓ Códigos copiados!' : 'Copiar todos os códigos'}
                </button>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={onClose}
                >
                  Já salvei, concluir
                </button>
              </div>
            </>
          ) : mfaEnabled ? (
            <form
              className={styles.form}
              onSubmit={(e) => void handleDisable(e)}
            >
              <div className={styles.successBadge}>
                🛡️ Proteção em 2 etapas ativa
              </div>
              <p className={styles.desc}>
                Sua conta exige um código do aplicativo autenticador (Google
                Authenticator, Microsoft Authenticator, Authy, etc.) ao entrar.
                Para desativar, confirme sua senha e um código válido:
              </p>
              <input
                type="password"
                className={styles.input}
                placeholder="Senha atual"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <input
                type="text"
                className={styles.input}
                placeholder="Código de 6 dígitos ou código de recuperação"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
              {error ? <p className={styles.error}>{error}</p> : null}
              <button
                type="submit"
                className={styles.dangerBtn}
                disabled={busy}
              >
                {busy ? 'Desativando…' : 'Desativar autenticação em 2 etapas'}
              </button>
            </form>
          ) : !setup ? (
            <>
              <p className={styles.desc}>
                Adicione uma camada extra de proteção usando{' '}
                <strong>Google Authenticator</strong>,{' '}
                <strong>Microsoft Authenticator</strong>, <strong>Authy</strong>{' '}
                ou qualquer aplicativo TOTP compatível.
              </p>
              {error ? <p className={styles.error}>{error}</p> : null}
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={busy}
                onClick={() => void startSetup()}
              >
                {busy
                  ? 'Gerando QR Code…'
                  : 'Configurar aplicativo autenticador'}
              </button>
            </>
          ) : (
            <form
              className={styles.form}
              onSubmit={(e) => void handleEnable(e)}
            >
              <p className={styles.desc}>
                1. Escaneie o QR Code abaixo no seu aplicativo autenticador (ou
                copie a chave manual):
              </p>
              <div className={styles.qrBox}>
                <img
                  src={setup.qrDataUrl}
                  alt="QR Code para aplicativo autenticador"
                  className={styles.qrImg}
                />
                <div className={styles.secretRow}>
                  <code className={styles.secretText}>{setup.secret}</code>
                  <button
                    type="button"
                    className={styles.copyBtn}
                    onClick={() => void copyText(setup.secret)}
                  >
                    {copied ? 'Copiado!' : 'Copiar chave'}
                  </button>
                </div>
              </div>

              <p className={styles.desc}>
                2. Digite o código de 6 dígitos gerado pelo aplicativo para
                ativar:
              </p>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                className={styles.codeInput}
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                autoFocus
              />
              {error ? <p className={styles.error}>{error}</p> : null}
              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={busy || code.length !== 6}
              >
                {busy ? 'Validando…' : 'Ativar autenticação em 2 etapas'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
