import { Mail, MailCheck, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { authApi } from '@/app/api';
import { errorMessage } from '@/shared/domain';
import {
  ActionButton,
  ModalFrame,
  StatusBadge,
  SurfaceCard,
  TextField,
} from '@/shared/ui/tamagui';

type Props = {
  token: string;
  email: string;
  onVerified: () => void;
  onDismiss: () => void;
};

/**
 * Destaque em Tamagui exibido para contas pendentes de verificação de e-mail.
 */
export function VerifyEmailPrompt({
  token,
  email,
  onVerified,
  onDismiss,
}: Props) {
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const sendCode = async () => {
    setBusy(true);
    setError('');
    setInfo('');
    const res = await authApi.startVerifyEmail(token);
    setBusy(false);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setCodeSent(true);
    setInfo(`Código de 6 dígitos enviado para ${email}.`);
  };

  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    const clean = code.replace(/\D/g, '').slice(0, 6);
    if (clean.length !== 6) {
      setError('Digite os 6 números do código enviado ao seu e-mail.');
      return;
    }
    setBusy(true);
    setError('');
    const res = await authApi.confirmVerifyEmail(token, clean);
    setBusy(false);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    onVerified();
  };

  return (
    <ModalFrame
      title="Confirme seu e-mail"
      subtitle="Proteja sua conta e habilite recuperação de senha e 2FA."
      icon={
        <MailCheck size={18} color="var(--accent-link)" aria-hidden={true} />
      }
      maxWidth={460}
      onClose={onDismiss}
    >
      <YStack gap="$3.5">
        <StatusBadge
          tone="warning"
          icon={<Mail size={12} aria-hidden={true} />}
        >
          Verificação pendente
        </StatusBadge>

        <Text
          fontFamily="$body"
          fontSize="$3"
          color="$textSecondary"
          lineHeight="20px"
        >
          Sua conta (
          <Text fontWeight="700" color="$textPrimary">
            {email}
          </Text>
          ) foi criada antes da confirmação por código. Verifique seu e-mail
          agora para mais segurança no Escritório Virtual.
        </Text>

        {!codeSent ? (
          <YStack gap="$2">
            <ActionButton
              loading={busy}
              fullWidth
              icon={<Send size={14} aria-hidden={true} />}
              onPress={() => void sendCode()}
            >
              {busy ? 'Enviando código…' : 'Enviar código de verificação'}
            </ActionButton>
            <ActionButton
              variant="secondary"
              disabled={busy}
              fullWidth
              onPress={onDismiss}
            >
              Verificar depois
            </ActionButton>
          </YStack>
        ) : (
          <form onSubmit={(e) => void confirm(e)}>
            <YStack gap="$3">
              {info ? (
                <SurfaceCard variant="success" padding="$3">
                  <Text
                    fontFamily="$body"
                    fontSize="$2"
                    color="$presenceAvailable"
                  >
                    {info}
                  </Text>
                </SurfaceCard>
              ) : null}

              <TextField
                id="verify-email-code"
                label="Código de 6 dígitos"
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

              <XStack gap="$2">
                <ActionButton
                  type="submit"
                  flex={1}
                  loading={busy}
                  disabled={code.length !== 6}
                >
                  {busy ? 'Confirmando…' : 'Confirmar e-mail'}
                </ActionButton>
                <ActionButton
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onPress={() => void sendCode()}
                >
                  Reenviar
                </ActionButton>
              </XStack>

              <ActionButton
                type="button"
                variant="ghost"
                size="sm"
                fullWidth
                onPress={onDismiss}
              >
                Fazer isso depois
              </ActionButton>
            </YStack>
          </form>
        )}

        {error && !codeSent ? (
          <Text
            fontFamily="$body"
            fontSize="$2"
            color="$dangerText"
            role="alert"
          >
            {error}
          </Text>
        ) : null}
      </YStack>
    </ModalFrame>
  );
}
