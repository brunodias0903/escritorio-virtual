import {
  Check,
  Copy,
  KeyRound,
  Link2,
  Mail,
  MailPlus,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Separator, Spinner, Text, XStack, YStack } from 'tamagui';

import { workspaceApi } from '@/app/api';
import type { ServerInvite } from '@/features/workspace/api/workspaceApi';
import { errorMessage, type Session } from '@/shared/domain';
import {
  ActionButton,
  EmptyState,
  IconButton,
  SelectField,
  StatusBadge,
  SurfaceCard,
  TextField,
} from '@/shared/ui/tamagui';

export type InvitedEmailEntry = {
  serverId: string;
  email: string;
  invitedBy: string;
  createdAt: number;
};

const EXPIRATION_OPTIONS = [
  { value: '24', label: 'Expira em 24 horas' },
  { value: '168', label: 'Expira em 7 dias' },
  { value: '720', label: 'Expira em 30 dias' },
  { value: '', label: 'Sem expiração' },
] as const;

type Props = {
  session: Session;
  activeServerId: string;
  invites: ServerInvite[];
  invitedEmails: InvitedEmailEntry[];
  loading: boolean;
  nowMs: number;
  onInvitesChange: (updater: (prev: ServerInvite[]) => ServerInvite[]) => void;
  onInvitedEmailsChange: (
    updater: (prev: InvitedEmailEntry[]) => InvitedEmailEntry[],
  ) => void;
  onError: (msg: string) => void;
  onNotify: (msg: string) => void;
};

export function InvitesTab({
  session,
  activeServerId,
  invites,
  invitedEmails,
  loading,
  nowMs,
  onInvitesChange,
  onInvitedEmailsChange,
  onError,
  onNotify,
}: Props) {
  const [inviteEmailInput, setInviteEmailInput] = useState('');
  const [addingEmail, setAddingEmail] = useState(false);
  const [inviteMaxUses, setInviteMaxUses] = useState('');
  const [inviteExpiresInHours, setInviteExpiresInHours] = useState('24');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [busyInviteCode, setBusyInviteCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleAddInvitedEmail = async (e: FormEvent) => {
    e.preventDefault();
    const email = inviteEmailInput.trim().toLowerCase();
    if (!email) return;
    setAddingEmail(true);
    onError('');
    const res = await workspaceApi.addInvitedEmail(
      session.token,
      activeServerId,
      email,
    );
    setAddingEmail(false);
    if (!res.ok) {
      onError(errorMessage(res.error));
      return;
    }
    onInvitedEmailsChange((prev) => [
      res.data.invite,
      ...prev.filter((item) => item.email !== res.data.invite.email),
    ]);
    setInviteEmailInput('');
    onNotify(`E-mail ${email} adicionado à lista de convites.`);
  };

  const handleRemoveInvitedEmail = async (email: string) => {
    onError('');
    const res = await workspaceApi.removeInvitedEmail(
      session.token,
      activeServerId,
      email,
    );
    if (!res.ok) {
      onError(errorMessage(res.error));
      return;
    }
    onInvitedEmailsChange((prev) =>
      prev.filter((item) => item.email !== email),
    );
    onNotify(`Convite de ${email} removido.`);
  };

  const handleCreateInvite = async (e: FormEvent) => {
    e.preventDefault();
    setCreatingInvite(true);
    onError('');
    const maxUses = inviteMaxUses.trim()
      ? Math.max(1, Number.parseInt(inviteMaxUses, 10) || 1)
      : null;
    const expiresInHours = inviteExpiresInHours.trim()
      ? Math.max(1, Number.parseInt(inviteExpiresInHours, 10) || 1)
      : null;
    const res = await workspaceApi.createServerInvite(
      session.token,
      activeServerId,
      { maxUses, expiresInHours },
    );
    setCreatingInvite(false);
    if (!res.ok) {
      onError(errorMessage(res.error));
      return;
    }
    onInvitesChange((prev) => [res.data.invite, ...prev]);
    setInviteMaxUses('');
    onNotify('Convite criado.');
  };

  const handleCopyInvite = async (code: string) => {
    try {
      await navigator.clipboard?.writeText(code);
      setCopiedCode(code);
      onNotify(`Código ${code} copiado.`);
      window.setTimeout(() => {
        setCopiedCode((prev) => (prev === code ? null : prev));
      }, 1800);
    } catch {
      onNotify(`Código: ${code}`);
    }
  };

  const handleRevokeInvite = async (code: string) => {
    setBusyInviteCode(code);
    onError('');
    const res = await workspaceApi.revokeServerInvite(
      session.token,
      activeServerId,
      code,
    );
    setBusyInviteCode(null);
    if (!res.ok) {
      onError(errorMessage(res.error));
      return;
    }
    onInvitesChange((prev) =>
      prev.map((inv) => (inv.code === code ? { ...inv, revoked: true } : inv)),
    );
    onNotify('Convite revogado.');
  };

  return (
    <YStack gap="$4">
      <YStack gap="$1">
        <Text
          fontFamily="$heading"
          fontSize="$6"
          fontWeight="700"
          color="$textPrimary"
        >
          Acesso e convites
        </Text>
        <Text fontFamily="$body" fontSize="$3" color="$textMuted">
          Libere acesso por e-mail ou gere códigos de convite com limite de uso
          e validade.
        </Text>
      </YStack>

      {/* Convite por e-mail */}
      <SurfaceCard padding="$4" gap="$3">
        <XStack alignItems="center" gap="$2.5">
          <YStack
            width={32}
            height={32}
            borderRadius="$md"
            backgroundColor="$bgControl"
            alignItems="center"
            justifyContent="center"
          >
            <MailPlus size={15} color="var(--accent-link)" aria-hidden={true} />
          </YStack>
          <YStack flex={1}>
            <Text
              fontFamily="$heading"
              fontSize="$4"
              fontWeight="700"
              color="$textPrimary"
            >
              Convidar por e-mail
            </Text>
            <Text fontFamily="$body" fontSize="$2" color="$textMuted">
              Autoriza o endereço a criar uma conta e entrar automaticamente
              neste servidor.
            </Text>
          </YStack>
        </XStack>

        <form onSubmit={(e) => void handleAddInvitedEmail(e)}>
          <XStack gap="$2" alignItems="center" flexWrap="wrap">
            <YStack flex={1} minWidth={200}>
              <TextField
                id="server-invite-email"
                compact
                value={inviteEmailInput}
                onChangeText={setInviteEmailInput}
                placeholder="nome@empresa.com"
                inputMode="email"
                leadingIcon={
                  <Mail
                    size={14}
                    color="var(--text-muted)"
                    aria-hidden={true}
                  />
                }
              />
            </YStack>
            <ActionButton
              type="submit"
              size="sm"
              loading={addingEmail}
              disabled={!inviteEmailInput.trim()}
              icon={<Plus size={14} aria-hidden={true} />}
            >
              Convidar
            </ActionButton>
          </XStack>
        </form>

        {invitedEmails.length > 0 ? (
          <>
            <Separator borderColor="$borderSubtle" />
            <YStack gap="$1.5">
              {invitedEmails.map((entry) => (
                <XStack
                  key={entry.email}
                  alignItems="center"
                  justifyContent="space-between"
                  gap="$2"
                  paddingHorizontal="$3"
                  paddingVertical="$2"
                  borderRadius="$md"
                  backgroundColor="$bgSurfaceElevated"
                  borderWidth={1}
                  borderColor="$borderSubtle"
                >
                  <XStack alignItems="center" gap="$2" flex={1} minWidth={0}>
                    <Mail
                      size={14}
                      color="var(--text-muted)"
                      aria-hidden={true}
                    />
                    <Text
                      fontFamily="$body"
                      fontSize="$3"
                      color="$textPrimary"
                      numberOfLines={1}
                    >
                      {entry.email}
                    </Text>
                  </XStack>
                  <IconButton
                    size="xs"
                    variant="danger"
                    icon={<Trash2 size={13} aria-hidden={true} />}
                    aria-label={`Remover convite de ${entry.email}`}
                    title="Remover convite"
                    onPress={() => void handleRemoveInvitedEmail(entry.email)}
                  />
                </XStack>
              ))}
            </YStack>
          </>
        ) : null}
      </SurfaceCard>

      {/* Novo código de convite */}
      <SurfaceCard padding="$4" gap="$3">
        <XStack alignItems="center" gap="$2.5">
          <YStack
            width={32}
            height={32}
            borderRadius="$md"
            backgroundColor="$bgControl"
            alignItems="center"
            justifyContent="center"
          >
            <KeyRound size={15} color="var(--accent-link)" aria-hidden={true} />
          </YStack>
          <YStack flex={1}>
            <Text
              fontFamily="$heading"
              fontSize="$4"
              fontWeight="700"
              color="$textPrimary"
            >
              Novo código de convite
            </Text>
            <Text fontFamily="$body" fontSize="$2" color="$textMuted">
              Compartilhe um código rápido para colegas entrarem no servidor.
            </Text>
          </YStack>
        </XStack>

        <form onSubmit={(e) => void handleCreateInvite(e)}>
          <XStack gap="$2.5" alignItems="flex-end" flexWrap="wrap">
            <YStack flex={1} minWidth={160}>
              <TextField
                id="server-invite-max-uses"
                compact
                label="Limite de usos"
                value={inviteMaxUses}
                onChangeText={(val) =>
                  setInviteMaxUses(val.replace(/\D/g, '').slice(0, 4))
                }
                placeholder="Ilimitado"
                inputMode="numeric"
              />
            </YStack>
            <YStack flex={1.2} minWidth={180}>
              <SelectField
                id="server-invite-expiration"
                compact
                label="Validade"
                value={inviteExpiresInHours}
                options={EXPIRATION_OPTIONS}
                onValueChange={setInviteExpiresInHours}
              />
            </YStack>
            <ActionButton
              type="submit"
              size="sm"
              loading={creatingInvite}
              icon={<Plus size={14} aria-hidden={true} />}
            >
              Gerar convite
            </ActionButton>
          </XStack>
        </form>
      </SurfaceCard>

      {/* Lista de códigos */}
      <YStack gap="$2.5">
        <Text
          fontFamily="$heading"
          fontSize="$4"
          fontWeight="700"
          color="$textSecondary"
        >
          Códigos gerados ({invites.length})
        </Text>

        {loading ? (
          <XStack
            alignItems="center"
            justifyContent="center"
            padding="$6"
            gap="$2"
          >
            <Spinner size="small" color="$accent" />
            <Text fontFamily="$body" fontSize="$3" color="$textMuted">
              Carregando convites…
            </Text>
          </XStack>
        ) : invites.length === 0 ? (
          <EmptyState
            icon={
              <Link2 size={20} color="var(--text-muted)" aria-hidden={true} />
            }
            title="Nenhum convite gerado ainda"
            description="Crie seu primeiro código acima para convidar pessoas para este servidor."
          />
        ) : (
          <YStack gap="$2">
            {invites.map((inv) => {
              const expired = inv.expiresAt !== null && nowMs > inv.expiresAt;
              const exhausted = inv.maxUses !== null && inv.uses >= inv.maxUses;
              const inactive = inv.revoked || expired || exhausted;
              const statusTone = inv.revoked
                ? 'danger'
                : expired || exhausted
                  ? 'warning'
                  : 'success';
              const statusLabel = inv.revoked
                ? 'Revogado'
                : expired
                  ? 'Expirado'
                  : exhausted
                    ? 'Esgotado'
                    : 'Ativo';
              const copied = copiedCode === inv.code;

              return (
                <SurfaceCard key={inv.code} padding="$3" gap="$2">
                  <XStack
                    alignItems="center"
                    justifyContent="space-between"
                    gap="$3"
                    flexWrap="wrap"
                  >
                    <YStack gap="$1" flex={1} minWidth={180}>
                      <XStack alignItems="center" gap="$2" flexWrap="wrap">
                        <Text
                          fontFamily="$mono"
                          fontSize="$4"
                          fontWeight="700"
                          color="$textPrimary"
                          letterSpacing={1}
                        >
                          {inv.code}
                        </Text>
                        <StatusBadge tone={statusTone}>
                          {statusLabel}
                        </StatusBadge>
                      </XStack>
                      <Text fontFamily="$body" fontSize="$2" color="$textMuted">
                        {inv.uses}
                        {inv.maxUses !== null ? `/${inv.maxUses}` : ''} uso(s)
                        {inv.expiresAt !== null
                          ? ` · expira em ${new Date(inv.expiresAt).toLocaleDateString('pt-BR')}`
                          : ' · sem expiração'}
                      </Text>
                    </YStack>

                    <XStack gap="$1.5" alignItems="center">
                      <IconButton
                        size="sm"
                        variant={copied ? 'accent' : 'default'}
                        disabled={inactive}
                        icon={
                          copied ? (
                            <Check size={14} aria-hidden={true} />
                          ) : (
                            <Copy size={14} aria-hidden={true} />
                          )
                        }
                        aria-label="Copiar código"
                        title="Copiar código"
                        onPress={() => void handleCopyInvite(inv.code)}
                      />
                      {!inv.revoked ? (
                        <IconButton
                          size="sm"
                          variant="danger"
                          disabled={busyInviteCode === inv.code}
                          icon={<Trash2 size={14} aria-hidden={true} />}
                          aria-label="Revogar convite"
                          title="Revogar convite"
                          onPress={() => void handleRevokeInvite(inv.code)}
                        />
                      ) : null}
                    </XStack>
                  </XStack>
                </SurfaceCard>
              );
            })}
          </YStack>
        )}
      </YStack>
    </YStack>
  );
}
