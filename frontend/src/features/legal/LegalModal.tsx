import {
  Database,
  Download,
  FileText,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Tabs, Text, XStack, YStack } from 'tamagui';

import { authApi } from '@/app/api';
import { endSession } from '@/app/session';
import { errorMessage } from '@/shared/domain';
import {
  ActionButton,
  ModalFrame,
  SurfaceCard,
  TextField,
} from '@/shared/ui/tamagui';

type Props = {
  /** Quando informado (usuário logado), habilita a aba de exportação e exclusão de dados (LGPD). */
  token?: string;
  initialTab?: 'terms' | 'privacy' | 'data';
  onClose: () => void;
};

/**
 * Modal de Conformidade Legal em Tamagui (ECA 18+, Termos de Uso e LGPD).
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
    a.download = 'escritorio-virtual-meus-dados-lgpd.json';
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

  const tabs: Array<{
    id: 'terms' | 'privacy' | 'data';
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'terms',
      label: 'Termos de Uso',
      icon: <FileText size={14} aria-hidden={true} />,
    },
    {
      id: 'privacy',
      label: 'Privacidade (LGPD)',
      icon: <ShieldCheck size={14} aria-hidden={true} />,
    },
    ...(token
      ? [
          {
            id: 'data' as const,
            label: 'Meus dados',
            icon: <Database size={14} aria-hidden={true} />,
          },
        ]
      : []),
  ];

  return (
    <ModalFrame
      title="Termos e privacidade"
      subtitle="Escritório Virtual — Plataforma de uso profissional exclusiva para maiores de 18 anos"
      icon={<Scale size={18} color="var(--accent-link)" aria-hidden={true} />}
      maxWidth={660}
      zIndex={1350}
      onClose={onClose}
    >
      <Tabs
        value={tab}
        onValueChange={(val) => setTab(val as 'terms' | 'privacy' | 'data')}
        orientation="horizontal"
        flexDirection="column"
        gap="$4"
      >
        <Tabs.List
          backgroundColor="$bgSurface"
          padding="$1"
          borderRadius="$lg"
          borderWidth={1}
          borderColor="$borderSubtle"
          gap="$1"
        >
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <Tabs.Tab
                key={item.id}
                value={item.id}
                flex={1}
                paddingVertical="$2"
                paddingHorizontal="$3"
                borderRadius="$md"
                backgroundColor={active ? '$accentChip' : 'transparent'}
                borderWidth={1}
                borderColor={active ? '$accentBorderSoft' : 'transparent'}
                cursor="pointer"
              >
                <XStack alignItems="center" justifyContent="center" gap="$1.5">
                  {item.icon}
                  <Text
                    fontFamily="$body"
                    fontSize="$3"
                    fontWeight={active ? '700' : '500'}
                    color={active ? '$textPrimary' : '$textSecondary'}
                  >
                    {item.label}
                  </Text>
                </XStack>
              </Tabs.Tab>
            );
          })}
        </Tabs.List>

        {tab === 'terms' ? (
          <YStack gap="$3">
            <SurfaceCard variant="warning" gap="$2">
              <XStack alignItems="flex-start" gap="$2.5">
                <ShieldAlert
                  size={18}
                  color="var(--warning-badge)"
                  aria-hidden={true}
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <Text
                  fontFamily="$body"
                  fontSize="$3"
                  color="$textPrimary"
                  flex={1}
                >
                  <Text fontWeight="700">
                    Aviso de Classificação e ECA (Lei nº 8.069/1990):{' '}
                  </Text>
                  O Escritório Virtual é atualmente um ambiente de uso
                  estritamente profissional, destinado exclusivamente a pessoas
                  maiores de 18 anos. Não é permitido o cadastro ou uso por
                  crianças ou adolescentes.
                </Text>
              </XStack>
            </SurfaceCard>

            <YStack gap="$1">
              <Text
                fontFamily="$heading"
                fontSize="$4"
                fontWeight="700"
                color="$textPrimary"
              >
                1. Finalidade do Serviço
              </Text>
              <Text fontFamily="$body" fontSize="$3" color="$textSecondary">
                O Escritório Virtual oferece um espaço interativo para trabalho
                remoto, colaboração em equipes, chat de texto e chamadas de
                áudio/vídeo por proximidade.
              </Text>
            </YStack>

            <YStack gap="$1">
              <Text
                fontFamily="$heading"
                fontSize="$4"
                fontWeight="700"
                color="$textPrimary"
              >
                2. Código de Conduta e Moderação
              </Text>
              <Text fontFamily="$body" fontSize="$3" color="$textSecondary">
                Respeito e inclusão são obrigatórios. É estritamente proibido
                praticar assédio, preconceito, racismo, homofobia, transfobia,
                xenofobia, discurso de ódio, abuso verbal ou spam. O sistema
                aplica censura automática, avisos progressivos e restrição
                temporária ou definitiva de acesso em caso de violação.
              </Text>
            </YStack>

            <YStack gap="$1">
              <Text
                fontFamily="$heading"
                fontSize="$4"
                fontWeight="700"
                color="$textPrimary"
              >
                3. Segurança da Conta
              </Text>
              <Text fontFamily="$body" fontSize="$3" color="$textSecondary">
                Cada usuário é responsável por manter sua senha segura.
                Recomendamos fortemente a confirmação do e-mail e a ativação da
                autenticação em 2 etapas (MFA) nas configurações da conta.
              </Text>
            </YStack>
          </YStack>
        ) : tab === 'privacy' ? (
          <YStack gap="$3">
            <YStack gap="$1">
              <Text
                fontFamily="$heading"
                fontSize="$4"
                fontWeight="700"
                color="$textPrimary"
              >
                1. Conformidade com a LGPD (Lei nº 13.709/2018)
              </Text>
              <Text fontFamily="$body" fontSize="$3" color="$textSecondary">
                Coletamos apenas os dados mínimos necessários para operar sua
                conta no escritório virtual: nome completo, nickname, e-mail,
                cargo (opcional), preferências de aparência/tema e registros
                técnicos de segurança (rate-limit contra ataques).
              </Text>
            </YStack>

            <YStack gap="$1">
              <Text
                fontFamily="$heading"
                fontSize="$4"
                fontWeight="700"
                color="$textPrimary"
              >
                2. Chamadas de Áudio e Vídeo
              </Text>
              <Text fontFamily="$body" fontSize="$3" color="$textSecondary">
                As chamadas em tempo real são transmitidas de forma
                criptografada e não são gravadas pela plataforma.
              </Text>
            </YStack>

            <YStack gap="$1">
              <Text
                fontFamily="$heading"
                fontSize="$4"
                fontWeight="700"
                color="$textPrimary"
              >
                3. Segurança e Sigilo
              </Text>
              <Text fontFamily="$body" fontSize="$3" color="$textSecondary">
                Senhas são armazenadas exclusivamente como hash criptográfico
                irreversível (scrypt) e segredos de 2FA são criptografados em
                repouso (AES-256-GCM). Nenhum administrador ou controlador tem
                acesso à sua senha em texto puro.
              </Text>
            </YStack>

            <YStack gap="$1">
              <Text
                fontFamily="$heading"
                fontSize="$4"
                fontWeight="700"
                color="$textPrimary"
              >
                4. Comunicações por E-mail
              </Text>
              <Text fontFamily="$body" fontSize="$3" color="$textSecondary">
                E-mails de novidades e patch notes só são enviados mediante seu
                consentimento explícito (opt-in), revogável a qualquer momento
                no menu da conta. Códigos de segurança e avisos essenciais de
                conta são enviados para proteger seu acesso.
              </Text>
            </YStack>

            <YStack gap="$1">
              <Text
                fontFamily="$heading"
                fontSize="$4"
                fontWeight="700"
                color="$textPrimary"
              >
                5. Canal do Controlador / Encarregado (DPO)
              </Text>
              <Text fontFamily="$body" fontSize="$3" color="$textSecondary">
                Para dúvidas ou solicitações sobre seus dados pessoais, entre em
                contato pelo e-mail bdd.vasconcelos@gmail.com.
              </Text>
            </YStack>
          </YStack>
        ) : (
          <YStack gap="$3">
            <SurfaceCard gap="$2.5">
              <XStack alignItems="center" gap="$2">
                <Download
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
                  Exportar meus dados (Portabilidade — Art. 18, II e V)
                </Text>
              </XStack>
              <Text fontFamily="$body" fontSize="$3" color="$textMuted">
                Baixe uma cópia em JSON com todos os dados pessoais vinculados à
                sua conta.
              </Text>
              <ActionButton
                loading={exportBusy}
                icon={<Download size={14} aria-hidden={true} />}
                onPress={() => void handleExport()}
              >
                {exportBusy
                  ? 'Preparando arquivo…'
                  : 'Baixar meus dados (.json)'}
              </ActionButton>
            </SurfaceCard>

            <SurfaceCard variant="danger" gap="$3">
              <form
                onSubmit={(e) => void handleDelete(e)}
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <XStack alignItems="center" gap="$2">
                  <Trash2
                    size={16}
                    color="var(--danger-text)"
                    aria-hidden={true}
                  />
                  <Text
                    fontFamily="$heading"
                    fontSize="$4"
                    fontWeight="700"
                    color="$textPrimary"
                  >
                    Excluir minha conta (Eliminação — Art. 18, VI)
                  </Text>
                </XStack>
                <Text fontFamily="$body" fontSize="$3" color="$textSecondary">
                  Esta ação é permanente: remove sua conta e encerra sua sessão
                  imediatamente. Confirme sua senha atual para prosseguir:
                </Text>
                <TextField
                  id="legal-delete-password"
                  label="Senha atual"
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  secureTextEntry
                  placeholder="Digite sua senha atual"
                />
                <ActionButton
                  type="submit"
                  variant="danger"
                  loading={deleteBusy}
                  disabled={!deletePassword}
                  icon={<Trash2 size={14} aria-hidden={true} />}
                >
                  {deleteBusy
                    ? 'Excluindo…'
                    : 'Excluir minha conta permanentemente'}
                </ActionButton>
              </form>
            </SurfaceCard>

            {msg ? (
              <Text fontFamily="$body" fontSize="$3" color="$presenceAvailable">
                {msg}
              </Text>
            ) : null}
            {err ? (
              <Text fontFamily="$body" fontSize="$3" color="$dangerText">
                {err}
              </Text>
            ) : null}
          </YStack>
        )}
      </Tabs>
    </ModalFrame>
  );
}
