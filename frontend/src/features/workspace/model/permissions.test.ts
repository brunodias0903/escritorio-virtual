import { describe, expect, it } from 'vitest';

import type { AccountTier } from '@/shared/domain';

import {
  resolveActiveServerTiers,
  resolveServerUiCapabilities,
} from './permissions';

describe('resolveActiveServerTiers e resolveServerUiCapabilities', () => {
  it('nega todas as opções gerenciais de UI para cargos comuns (member, tester, designer, developer)', () => {
    const nonAdmin: AccountTier[] = [
      'member',
      'tester',
      'designer',
      'developer',
    ];
    for (const tier of nonAdmin) {
      const caps = resolveServerUiCapabilities(
        { tier, secondaryTiers: [], admin: false },
        'default',
      );
      expect(caps).toEqual({
        canOpenServerSettings: false,
        canManageChannels: false,
        canReorderChannels: false,
        canManageDesks: false,
      });
    }
  });

  it('libera opções gerenciais para master e admin no servidor padrão', () => {
    for (const tier of ['master', 'admin'] as const) {
      const caps = resolveServerUiCapabilities(
        { tier, secondaryTiers: [], admin: true },
        'default',
      );
      expect(caps).toEqual({
        canOpenServerSettings: true,
        canManageChannels: true,
        canReorderChannels: true,
        canManageDesks: true,
      });
    }
  });

  it('isola permissões de UI em servidores secundários (admin no default mas member no srv-b não vê configs nem reordenação)', () => {
    const adminDefault = {
      tier: 'admin' as const,
      secondaryTiers: [] as AccountTier[],
      admin: true,
    };

    // Antes de `people.me` carregar no servidor secundário, faz fallback seguro para member (sem flash de UI admin)
    expect(resolveActiveServerTiers(adminDefault, 'srv-getter', null)).toEqual([
      'member',
    ]);
    expect(
      resolveServerUiCapabilities(adminDefault, 'srv-getter', null),
    ).toEqual({
      canOpenServerSettings: false,
      canManageChannels: false,
      canReorderChannels: false,
      canManageDesks: false,
    });

    // Depois que `people.me` confirma que ele é member em srv-getter, continua sem UI gerencial
    expect(
      resolveServerUiCapabilities(adminDefault, 'srv-getter', {
        tier: 'member',
        secondaryTiers: [],
      }),
    ).toEqual({
      canOpenServerSettings: false,
      canManageChannels: false,
      canReorderChannels: false,
      canManageDesks: false,
    });
  });

  it('concede UI gerencial no servidor secundário para membro promovido a admin local e mantém master global', () => {
    const memberDefault = {
      tier: 'member' as const,
      secondaryTiers: [] as AccountTier[],
      admin: false,
    };
    expect(
      resolveServerUiCapabilities(memberDefault, 'srv-getter', {
        tier: 'admin',
        secondaryTiers: [],
      }),
    ).toEqual({
      canOpenServerSettings: true,
      canManageChannels: true,
      canReorderChannels: true,
      canManageDesks: true,
    });

    // Master mantém acesso global em qualquer servidor mesmo antes de `people.me` carregar
    expect(
      resolveServerUiCapabilities(
        { tier: 'master', secondaryTiers: [], admin: true },
        'srv-getter',
        null,
      ),
    ).toEqual({
      canOpenServerSettings: true,
      canManageChannels: true,
      canReorderChannels: true,
      canManageDesks: true,
    });
  });
});
