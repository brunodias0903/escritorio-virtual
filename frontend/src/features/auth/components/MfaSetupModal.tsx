import {
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { authApi } from '@/app/api';
import { errorMessage, type MfaSetupResponse } from '@/shared/domain';
import {
  ActionButton,
  ModalFrame,
  StatusBadge,
  SurfaceCard,
  TextField,
} from '@/shared/ui/tamagui';

type Props = {
  token: string;
  mfaEnabled: boolean;
  onChanged: (enabled: boolean) => void;
  onClose: () => void;
};

/**
 * Configuração de Autenticação em 2 Etapas (MFA / TOTP) em Tamagui com ícones Lucide.
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

  return (
    <ModalFrame
      title="Autenticação em 2 etapas (MFA)"
      subtitle="Proteção adicional com aplicativo autenticador TOTP."
      icon={
        <KeyRound size={18} color="var(--accent-link)" aria-hidden={true} />
      }
      maxWidth={480}
      closeDisabled={Boolean(recoveryCodes)}
      zIndex={1350}
      onClose={onClose}
    >
      {recoveryCodes ? (
        <YStack gap="$3.5">
          <StatusBadge
            tone="success"
            icon={<CheckCircle2 size={13} aria-hidden={true} />}
          >
            Autenticação em 2 etapas ativada
          </StatusBadge>
          <Text fontFamily="$body" fontSize="$3" color="$textSecondary">
            Guarde estes{' '}
            <Text fontWeight="700" color="$textPrimary">
              8 códigos de recuperação
            </Text>{' '}
            em um local seguro. Cada código pode ser usado uma única vez caso
            você perca acesso ao celular.
          </Text>
          <XStack flexWrap="wrap" gap="$2">
            {recoveryCodes.map((c) => (
              <YStack
                key={c}
                flexBasis="47%"
                flexGrow={1}
                paddingVertical="$2"
                paddingHorizontal="$3"
                borderRadius="$md"
                backgroundColor="$bgSurface"
                borderWidth={1}
                borderColor="$borderSubtle"
                alignItems="center"
              >
                <Text
                  fontFamily="$mono"
                  fontSize="$3"
                  fontWeight="700"
                  color="$textPrimary"
                  letterSpacing={1}
                >
                  {c}
                </Text>
              </YStack>
            ))}
          </XStack>
          <XStack gap="$2.5" justifyContent="flex-end" flexWrap="wrap">
            <ActionButton
              variant="secondary"
              size="sm"
              icon={
                copied ? (
                  <Check size={14} aria-hidden={true} />
                ) : (
                  <Copy size={14} aria-hidden={true} />
                )
              }
              onPress={() => void copyText(recoveryCodes.join('\n'))}
            >
              {copied ? 'Códigos copiados' : 'Copiar todos os códigos'}
            </ActionButton>
            <ActionButton size="sm" onPress={onClose}>
              Já salvei, concluir
            </ActionButton>
          </XStack>
        </YStack>
      ) : mfaEnabled ? (
        <form onSubmit={(e) => void handleDisable(e)}>
          <YStack gap="$3.5">
            <StatusBadge
              tone="success"
              icon={<ShieldCheck size={13} aria-hidden={true} />}
            >
              Proteção em 2 etapas ativa
            </StatusBadge>
            <Text fontFamily="$body" fontSize="$3" color="$textSecondary">
              Sua conta exige um código do aplicativo autenticador ao entrar.
              Para desativar, confirme sua senha e um código válido:
            </Text>
            <TextField
              id="mfa-disable-password"
              label="Senha atual"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="Digite sua senha atual"
            />
            <TextField
              id="mfa-disable-code"
              label="Código do autenticador ou recuperação"
              value={code}
              onChangeText={setCode}
              placeholder="000000"
              error={error}
            />
            <ActionButton
              type="submit"
              variant="danger"
              loading={busy}
              fullWidth
            >
              {busy ? 'Desativando…' : 'Desativar autenticação em 2 etapas'}
            </ActionButton>
          </YStack>
        </form>
      ) : !setup ? (
        <YStack gap="$3.5">
          <Text fontFamily="$body" fontSize="$3" color="$textSecondary">
            Adicione uma camada extra de proteção usando Google Authenticator,
            Microsoft Authenticator, Authy ou qualquer aplicativo TOTP
            compatível.
          </Text>
          {error ? (
            <Text fontFamily="$body" fontSize="$3" color="$dangerText">
              {error}
            </Text>
          ) : null}
          <ActionButton
            loading={busy}
            fullWidth
            icon={<QrCode size={15} aria-hidden={true} />}
            onPress={() => void startSetup()}
          >
            {busy ? 'Gerando QR Code…' : 'Configurar aplicativo autenticador'}
          </ActionButton>
        </YStack>
      ) : (
        <form onSubmit={(e) => void handleEnable(e)}>
          <YStack gap="$3.5">
            <Text fontFamily="$body" fontSize="$3" color="$textSecondary">
              1. Escaneie o QR Code abaixo no seu aplicativo autenticador ou
              copie a chave manual:
            </Text>
            <SurfaceCard alignItems="center" padding="$4" gap="$3">
              <YStack
                padding="$2.5"
                borderRadius="$lg"
                backgroundColor="#ffffff"
              >
                <img
                  src={setup.qrDataUrl}
                  alt="QR Code para aplicativo autenticador"
                  style={{ width: 176, height: 176, display: 'block' }}
                />
              </YStack>
              <XStack
                alignItems="center"
                justifyContent="space-between"
                gap="$2"
                width="100%"
                padding="$2.5"
                borderRadius="$md"
                backgroundColor="$bgSurfaceElevated"
                borderWidth={1}
                borderColor="$borderSubtle"
              >
                <Text
                  fontFamily="$mono"
                  fontSize="$2"
                  color="$textPrimary"
                  flex={1}
                  numberOfLines={1}
                >
                  {setup.secret}
                </Text>
                <ActionButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={
                    copied ? (
                      <Check size={13} aria-hidden={true} />
                    ) : (
                      <Copy size={13} aria-hidden={true} />
                    )
                  }
                  onPress={() => void copyText(setup.secret)}
                >
                  {copied ? 'Copiado' : 'Copiar chave'}
                </ActionButton>
              </XStack>
            </SurfaceCard>

            <TextField
              id="mfa-enable-code"
              label="2. Código de 6 dígitos do aplicativo"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChangeText={(val) =>
                setCode(val.replace(/\D/g, '').slice(0, 6))
              }
              error={error}
              autoFocus
            />

            <ActionButton
              type="submit"
              loading={busy}
              disabled={code.length !== 6}
              fullWidth
            >
              {busy ? 'Validando…' : 'Ativar autenticação em 2 etapas'}
            </ActionButton>
          </YStack>
        </form>
      )}
    </ModalFrame>
  );
}
