import {
  canManageDesks,
  canManageServer,
  effectiveTiersOf,
  type AccountTier,
  type Person,
  type SessionUser,
} from '@/shared/domain';

/**
 * Resolve os cargos efetivos do usuário no servidor ativo:
 * - `master` mantém poder global em todos os servidores;
 * - no servidor padrão (`default`), usa os cargos globais da sessão;
 * - em servidores secundários, usa os cargos específicos daquele servidor (`mePerson`)
 *   e assume `member` com segurança antes da carga da lista de pessoas.
 */
export function resolveActiveServerTiers(
  user: Pick<SessionUser, 'tier' | 'secondaryTiers' | 'admin'>,
  activeServerId: string,
  mePerson?: Pick<Person, 'tier' | 'secondaryTiers'> | null,
): AccountTier[] {
  const globalTiers = effectiveTiersOf(
    user.tier ?? (user.admin ? 'admin' : 'member'),
    user.secondaryTiers,
  );
  if (globalTiers.includes('master')) return ['master'];
  if (activeServerId === 'default') return globalTiers;
  if (mePerson?.tier) {
    return effectiveTiersOf(mePerson.tier, mePerson.secondaryTiers);
  }
  return ['member'];
}

export type ServerUiCapabilities = {
  canOpenServerSettings: boolean;
  canManageChannels: boolean;
  canReorderChannels: boolean;
  canManageDesks: boolean;
};

/** Calcula todas as capacidades gerenciais de UI para o servidor ativo. */
export function resolveServerUiCapabilities(
  user: Pick<SessionUser, 'tier' | 'secondaryTiers' | 'admin'>,
  activeServerId: string,
  mePerson?: Pick<Person, 'tier' | 'secondaryTiers'> | null,
): ServerUiCapabilities {
  const tiers = resolveActiveServerTiers(user, activeServerId, mePerson);
  const managesServer = canManageServer(tiers);
  return {
    canOpenServerSettings: managesServer,
    canManageChannels: managesServer,
    canReorderChannels: managesServer,
    canManageDesks: canManageDesks(tiers),
  };
}
