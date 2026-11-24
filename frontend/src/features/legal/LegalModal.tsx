import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';

import { authApi } from '@/app/api';
import { endSession } from '@/app/session';
import { errorMessage } from '@/shared/domain';

import styles from './LegalModal.module.css';

type Props = {
  /** Quando informado (usuário logado), habilita a aba de exportação e exclusão de dados (LGPD). */
  token?: string;
  initialTab?: 'terms' | 'privacy' | 'data';
  onClose: () => void;
};

/**
 * Modal de Conformidade Legal:
 * - Aviso ECA (Lei nº 8.069/1990): serviço de uso profissional para maiores de 18 anos;
 * - Termos de Uso e Código de Conduta (moderação contra abuso verbal, discurso de ódio e spam);
 * - Política de Privacidade e Direitos do Titular (LGPD — Lei nº 13.709/2018).
 */
export function LegalModal({ token, initialTab = 'terms', onClose }: Props) {
  const [tab, setTab] = useState<'terms' | 'privacy' | 'data'>(initialTab);
  const [exportBusy, setExportBusy] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const handleExport = async () => {
    if (!token) return;
    setExportBusy(true);
    setErr('');
    setMsg('');
    const res = await authApi.exportData(token);
    setExportBusy(false);
    if (!res.ok) {
      setErr(errorMessage(res.error));
      return;
    }
    const blob = new Blob([JSON.stringify(res.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `escritorio-virtual-meus-dados-lgpd.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Arquivo JSON com seus dados pessoais baixado com sucesso.');
  };

  const handleDelete = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !deletePassword) return;
    setDeleteBusy(true);
    setErr('');
    const res = await authApi.deleteAccount(token, deletePassword);
    setDeleteBusy(false);
    if (!res.ok) {
      setErr(errorMessage(res.error));
      return;
    }
    await endSession(token);
    onClose();
  };

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Termos de Uso, ECA (18+) e Privacidade (LGPD)"
      data-scroll-lock="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>
              ⚖️ Termos de Uso, ECA (18+) & Privacidade (LGPD)
            </h2>
            <p className={styles.subtitle}>
              Escritório Virtual — Plataforma de uso profissional exclusiva para
              maiores de 18 anos
            </p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            aria-label="Fechar"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === 'terms' ? styles.tabActive : ''}`}
            onClick={() => setTab('terms')}
          >
            📜 Termos & ECA (18+)
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === 'privacy' ? styles.tabActive : ''}`}
            onClick={() => setTab('privacy')}
          >
            🔒 Privacidade (LGPD)
          </button>
          {token ? (
            <button
              type="button"
              className={`${styles.tabBtn} ${tab === 'data' ? styles.tabActive : ''}`}
              onClick={() => setTab('data')}
            >
              📦 Meus Dados (Art. 18)
            </button>
          ) : null}
        </div>

        <div className={styles.body}>
          {tab === 'terms' ? (
            <div className={styles.prose}>
              <div className={styles.noticeBox}>
                <strong>
                  🔞 Aviso de Classificação e ECA (Lei nº 8.069/1990):
                </strong>{' '}
                O Escritório Virtual é atualmente um ambiente de{' '}
                <strong>uso estritamente profissional</strong>, destinado{' '}
                <strong>exclusivamente a pessoas maiores de 18 anos</strong>.
                Não é permitido o cadastro ou uso por crianças ou adolescentes.
              </div>
              <h3>1. Finalidade do Serviço</h3>
              <p>
                O Escritório Virtual oferece um espaço interativo para trabalho
                remoto, colaboração em equipes, chat de texto e chamadas de
                áudio/vídeo por proximidade.
              </p>
              <h3>2. Código de Conduta e Moderação</h3>
              <p>
                Respeito e inclusão são obrigatórios. É estritamente proibido
                praticar assédio, preconceito, racismo, homofobia, transfobia,
                xenofobia, discurso de ódio, abuso verbal ou spam. O sistema
                aplica censura automática, avisos progressivos e restrição
                temporária ou definitiva de acesso em caso de violação.
              </p>
              <h3>3. Segurança da Conta</h3>
              <p>
                Cada usuário é responsável por manter sua senha segura.
                Recomendamos fortemente a confirmação do e-mail e a ativação da
                autenticação em 2 etapas (MFA) nas configurações da conta.
              </p>
            </div>
          ) : tab === 'privacy' ? (
            <div className={styles.prose}>
              <h3>1. Conformidade com a LGPD (Lei nº 13.709/2018)</h3>
              <p>
                Coletamos apenas os dados mínimos necessários para operar sua
                conta no escritório virtual: nome completo, nickname, e-mail,
                cargo (opcional), preferências de aparência/tema e registros
                técnicos de segurança (rate-limit contra ataques).
              </p>
              <h3>2. Chamadas de Áudio e Vídeo</h3>
              <p>
                As chamadas em tempo real são transmitidas de forma
                criptografada e <strong>não são gravadas</strong> pela
                plataforma.
              </p>
              <h3>3. Segurança e Sigilo</h3>
              <p>
                Senhas são armazenadas exclusivamente como hash criptográfico
                irreversível (scrypt) e segredos de 2FA são criptografados em
                repouso (AES-256-GCM). Nenhum administrador ou controlador tem
                acesso à sua senha em texto puro.
              </p>
              <h3>4. Comunicações por E-mail</h3>
              <p>
                E-mails de novidades e patch notes só são enviados mediante seu
                consentimento explícito (opt-in), revogável a qualquer momento
                no menu da conta. Códigos de segurança e avisos essenciais de
                conta são enviados para proteger seu acesso.
              </p>
              <h3>5. Canal do Controlador / Encarregado (DPO)</h3>
              <p>
                Para dúvidas ou solicitações sobre seus dados pessoais, entre em
                contato pelo e-mail <strong>bdd.vasconcelos@gmail.com</strong>.
              </p>
            </div>
          ) : (
            <div className={styles.dataPane}>
              <div className={styles.dataCard}>
                <h3>
                  📥 Exportar meus dados (Portabilidade — Art. 18, II e V)
                </h3>
                <p className={styles.desc}>
                  Baixe uma cópia em JSON com todos os dados pessoais vinculados
                  à sua conta.
                </p>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  disabled={exportBusy}
                  onClick={() => void handleExport()}
                >
                  {exportBusy
                    ? 'Preparando arquivo…'
                    : 'Baixar meus dados (.json)'}
                </button>
              </div>

              <form
                className={styles.dangerCard}
                onSubmit={(e) => void handleDelete(e)}
              >
                <h3>🗑️ Excluir minha conta (Eliminação — Art. 18, VI)</h3>
                <p className={styles.desc}>
                  Esta ação é permanente: remove sua conta e encerra sua sessão
                  imediatamente. Confirme sua senha atual para prosseguir:
                </p>
                <input
                  type="password"
                  className={styles.input}
                  placeholder="Digite sua senha atual"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className={styles.dangerBtn}
                  disabled={deleteBusy || !deletePassword}
                >
                  {deleteBusy
                    ? 'Excluindo…'
                    : 'Excluir minha conta permanentemente'}
                </button>
              </form>

              {msg ? <p className={styles.success}>{msg}</p> : null}
              {err ? <p className={styles.error}>{err}</p> : null}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
