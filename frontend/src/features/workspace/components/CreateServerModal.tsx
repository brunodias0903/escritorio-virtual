import { useState } from 'react';
import { Button, Text, XStack, YStack } from 'tamagui';

import { workspaceApi } from '@/app/api';
import { errorMessage, type WorkspaceServer } from '@/shared/domain';
import {
  ActionButton,
  ModalFrame,
  SurfaceCard,
  TextField,
} from '@/shared/ui/tamagui';

type Props = {
  token: string;
  canCreate: boolean;
  onJoinedOrCreated: (
    server: WorkspaceServer,
    action: 'create' | 'join',
  ) => void;
  onClose: () => void;
};

const SERVER_COLORS = [
  '#5b6cff',
  '#31e0c1',
  '#ff2e93',
  '#d4a853',
  '#38bdf8',
] as const;

/**
 * Modal em Tamagui para criar um novo servidor ou entrar em um existente via convite.
 */
export function CreateServerModal({
  token,
  canCreate,
  onJoinedOrCreated,
  onClose,
}: Props) {
  const [mode, setMode] = useState<'create' | 'join'>(
    canCreate ? 'create' : 'join',
  );
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [accentColor, setAccentColor] = useState<string>(SERVER_COLORS[0]);
  const [visibility, setVisibility] = useState<'invite' | 'open'>('invite');
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 40) {
      setError('O nome do servidor deve ter entre 2 e 40 caracteres.');
      return;
    }
    setError('');
    setBusy(true);
    const res = await workspaceApi.createServer(token, {
      name: trimmed,
      description: description.trim(),
      accentColor,
      visibility,
    });
    setBusy(false);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    onJoinedOrCreated(res.data.server, 'create');
    onClose();
  };

  const handleJoin = async () => {
    const clean = inviteCode.trim();
    if (clean.length < 4) {
      setError('Informe um código de convite válido.');
      return;
    }
    setError('');
    setBusy(true);
    const res = await workspaceApi.joinServerByInvite(token, clean);
    setBusy(false);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    onJoinedOrCreated(res.data.server, 'join');
    onClose();
  };

  return (
    <ModalFrame
      title={mode === 'create' ? 'Criar servidor' : 'Entrar com convite'}
      subtitle={
        mode === 'create'
          ? 'Configure um novo espaço para sua equipe trabalhar junta.'
          : 'Digite o código de convite recebido para acessar outro servidor.'
      }
      onClose={onClose}
    >
      <YStack gap="$4">
        {canCreate ? (
          <XStack gap="$2">
            <ActionButton
              flex={1}
              variant={mode === 'create' ? 'primary' : 'secondary'}
              onPress={() => {
                setMode('create');
                setError('');
              }}
            >
              Criar servidor
            </ActionButton>
            <ActionButton
              flex={1}
              variant={mode === 'join' ? 'primary' : 'secondary'}
              onPress={() => {
                setMode('join');
                setError('');
              }}
            >
              Entrar com convite
            </ActionButton>
          </XStack>
        ) : null}

        {mode === 'create' ? (
          <>
            <SurfaceCard alignItems="center" flexDirection="row" gap="$3">
              <YStack
                width={48}
                height={48}
                borderRadius="$lg"
                backgroundColor={accentColor}
                alignItems="center"
                justifyContent="center"
              >
                <Text
                  fontFamily="$heading"
                  fontSize="$7"
                  fontWeight="800"
                  color="#ffffff"
                >
                  {(name.trim().charAt(0) || 'S').toUpperCase()}
                </Text>
              </YStack>
              <YStack flex={1} gap="$0.5">
                <Text
                  fontFamily="$heading"
                  fontSize="$5"
                  fontWeight="700"
                  color="$textPrimary"
                >
                  {name.trim() || 'Novo Servidor'}
                </Text>
                <Text fontFamily="$body" fontSize="$2" color="$textMuted">
                  {visibility === 'invite'
                    ? 'Privado por convite'
                    : 'Aberto para membros'}
                </Text>
              </YStack>
            </SurfaceCard>

            <TextField
              id="create-server-name"
              label="Nome do servidor"
              value={name}
              onChangeText={(val) => {
                setName(val);
                if (error) setError('');
              }}
              placeholder="Ex.: Time de Produto"
              maxLength={40}
              error={error}
            />

            <TextField
              id="create-server-description"
              label="Descrição (opcional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Para que esse espaço será usado?"
              maxLength={120}
            />

            <YStack gap="$2">
              <Text
                fontFamily="$body"
                fontSize="$3"
                fontWeight="600"
                color="$textSecondary"
              >
                Cor de destaque
              </Text>
              <XStack gap="$2.5">
                {SERVER_COLORS.map((color) => {
                  const selected = accentColor === color;
                  return (
                    <Button
                      key={color}
                      width={32}
                      height={32}
                      circular
                      backgroundColor={color}
                      borderWidth={selected ? 3 : 1}
                      borderColor={
                        selected ? '#ffffff' : 'rgba(255,255,255,0.2)'
                      }
                      aria-label={`Selecionar cor ${color}`}
                      aria-pressed={selected}
                      onPress={() => setAccentColor(color)}
                    />
                  );
                })}
              </XStack>
            </YStack>

            <YStack gap="$2">
              <Text
                fontFamily="$body"
                fontSize="$3"
                fontWeight="600"
                color="$textSecondary"
              >
                Acesso ao servidor
              </Text>
              <XStack gap="$2">
                <ActionButton
                  flex={1}
                  variant={visibility === 'invite' ? 'primary' : 'secondary'}
                  onPress={() => setVisibility('invite')}
                >
                  Por convite
                </ActionButton>
                <ActionButton
                  flex={1}
                  variant={visibility === 'open' ? 'primary' : 'secondary'}
                  onPress={() => setVisibility('open')}
                >
                  Aberto
                </ActionButton>
              </XStack>
            </YStack>

            <XStack gap="$2.5" justifyContent="flex-end" marginTop="$1">
              <ActionButton variant="secondary" onPress={onClose}>
                Cancelar
              </ActionButton>
              <ActionButton loading={busy} onPress={() => void handleCreate()}>
                Criar servidor
              </ActionButton>
            </XStack>
          </>
        ) : (
          <>
            <TextField
              id="join-server-code"
              label="Código de convite"
              value={inviteCode}
              onChangeText={(val) => {
                setInviteCode(val.toUpperCase());
                if (error) setError('');
              }}
              placeholder="Ex.: A1B2C3D4"
              maxLength={32}
              error={error}
            />

            <XStack gap="$2.5" justifyContent="flex-end">
              <ActionButton variant="secondary" onPress={onClose}>
                Cancelar
              </ActionButton>
              <ActionButton loading={busy} onPress={() => void handleJoin()}>
                Entrar no servidor
              </ActionButton>
            </XStack>
          </>
        )}
      </YStack>
    </ModalFrame>
  );
}
