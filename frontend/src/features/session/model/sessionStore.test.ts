import type { Session } from '@/shared/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSessionStore } from './sessionStore';

const session: Session = {
  token: 'abc',
  user: {
    email: 'ana@empresa.com',
    name: 'Ana',
    admin: false,
    kind: 'company',
    tier: 'tester',
    secondaryTiers: [],
    nickname: 'ana',
    role: '',
  },
};

describe('useSessionStore', () => {
  beforeEach(() =>
    useSessionStore.setState({ session: null, hydrated: false }),
  );

  it('guarda a sessão ao entrar e atualiza cargos com patchUser', () => {
    useSessionStore.getState().signIn(session);
    expect(useSessionStore.getState()).toMatchObject({
      session,
      hydrated: true,
    });
    useSessionStore.getState().patchUser({
      tier: 'developer',
      secondaryTiers: ['admin'],
      admin: true,
    });
    expect(useSessionStore.getState().session?.user).toMatchObject({
      tier: 'developer',
      secondaryTiers: ['admin'],
      admin: true,
    });
  });

  it('limpa a sessão ao sair', () => {
    useSessionStore.getState().signIn(session);
    useSessionStore.getState().signOut();
    expect(useSessionStore.getState().session).toBeNull();
  });

  it('marca como carregado ao recuperar a sessão guardada, com ou sem sessão', () => {
    useSessionStore.getState().hydrate(null);
    expect(useSessionStore.getState()).toMatchObject({
      session: null,
      hydrated: true,
    });
    useSessionStore.getState().hydrate(session);
    expect(useSessionStore.getState().session).toEqual(session);
  });
});
