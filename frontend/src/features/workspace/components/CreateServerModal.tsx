import { Check, Globe, Link2, Lock, Plus, Server } from 'lucide-react';
import { useState } from 'react';
import { Button, Tabs, Text, XStack, YStack } from 'tamagui';

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
      icon={
        mode === 'create' ? (
          <Server size={18} color="var(--accent-link)" aria-hidden={true} />
        ) : (
          <Link2 size={18} color="var(--accent-link)" aria-hidden={true} />
        )
      }
      onClose={onClose}
      footer={
        <>
          <ActionButton variant="secondary" size="sm" onPress={onClose}>
            Cancelar
          </ActionButton>
          {mode === 'create' ? (
            <ActionButton
              size="sm"
              loading={busy}
              icon={<Plus size={14} aria-hidden={true} />}
              onPress={() => void handleCreate()}
            >
              Criar servidor
            </ActionButton>
          ) : (
            <ActionButton
              size="sm"
              loading={busy}
              icon={<Link2 size={14} aria-hidden={true} />}
              onPress={() => void handleJoin()}
            >
              Entrar no servidor
            </ActionButton>
          )}
        </>
      }
    >
      <YStack gap="$4">
        {canCreate ? (
          <Tabs
            value={mode}
            onValueChange={(val) => {
              setMode(val as 'create' | 'join');
              setError('');
            }}
            orientation="horizontal"
          >
            <Tabs.List
              backgroundColor="$bgSurface"
              padding="$1"
              borderRadius="$lg"
              borderWidth={1}
              borderColor="$borderSubtle"
              gap="$1"
              width="100%"
            >
              <Tabs.Tab
                value="create"
                flex={1}
                paddingVertical="$2"
                borderRadius="$md"
                backgroundColor={
                  mode === 'create' ? '$accentChip' : 'transparent'
                }
                borderWidth={1}
                borderColor={
                  mode === 'create' ? '$accentBorderSoft' : 'transparent'
                }
                cursor="pointer"
              >
                <XStack alignItems="center" justifyContent="center" gap="$1.5">
                  <Server size={14} aria-hidden={true} />
                  <Text
                    fontFamily="$body"
                    fontSize="$3"
                    fontWeight={mode === 'create' ? '700' : '500'}
                    color={
                      mode === 'create' ? '$textPrimary' : '$textSecondary'
                    }
                  >
                    Criar servidor
                  </Text>
                </XStack>
              </Tabs.Tab>
              <Tabs.Tab
                value="join"
                flex={1}
                paddingVertical="$2"
                borderRadius="$md"
                backgroundColor={
                  mode === 'join' ? '$accentChip' : 'transparent'
                }
                borderWidth={1}
                borderColor={
                  mode === 'join' ? '$accentBorderSoft' : 'transparent'
                }
                cursor="pointer"
              >
                <XStack alignItems="center" justifyContent="center" gap="$1.5">
                  <Link2 size={14} aria-hidden={true} />
                  <Text
                    fontFamily="$body"
                    fontSize="$3"
                    fontWeight={mode === 'join' ? '700' : '500'}
                    color={mode === 'join' ? '$textPrimary' : '$textSecondary'}
                  >
                    Entrar com convite
                  </Text>
                </XStack>
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>
        ) : null}

        {mode === 'create' ? (
          <YStack gap="$3.5">
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
                      width={34}
                      height={34}
                      padding={0}
                      circular
                      backgroundColor={color}
                      borderWidth={selected ? 2 : 1}
                      borderColor={
                        selected ? '#ffffff' : 'rgba(255,255,255,0.2)'
                      }
                      aria-label={`Selecionar cor ${color}`}
                      aria-pressed={selected}
                      cursor="pointer"
                      alignItems="center"
                      justifyContent="center"
                      onPress={() => setAccentColor(color)}
                    >
                      {selected ? (
                        <Check size={15} color="#ffffff" aria-hidden={true} />
                      ) : null}
                    </Button>
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
                  size="sm"
                  variant={visibility === 'invite' ? 'primary' : 'secondary'}
                  icon={<Lock size={14} aria-hidden={true} />}
                  onPress={() => setVisibility('invite')}
                >
                  Por convite
                </ActionButton>
                <ActionButton
                  flex={1}
                  size="sm"
                  variant={visibility === 'open' ? 'primary' : 'secondary'}
                  icon={<Globe size={14} aria-hidden={true} />}
                  onPress={() => setVisibility('open')}
                >
                  Aberto
                </ActionButton>
              </XStack>
            </YStack>
          </YStack>
        ) : (
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
        )}
      </YStack>
    </ModalFrame>
  );
}
