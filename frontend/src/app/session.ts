import { useSessionStore } from '@/features/session/model/sessionStore';
import type { Session, SessionUser } from '@/shared/domain';

import { authApi } from './api';
import { sessionStorage } from './sessionBackend';

/** Entra no app e guarda a sessão para a próxima vez. */
export const beginSession = (session: Session): void => {
  void sessionStorage.save(session);
  useSessionStore.getState().signIn(session);
};

/** Atualiza dados da sessão ativa (ex.: cargos alterados no painel admin) sem desconectar. */
export const patchSessionUser = (patch: Partial<SessionUser>): void => {
  useSessionStore.getState().patchUser(patch);
  const next = useSessionStore.getState().session;
  if (next) void sessionStorage.save(next);
};

/** Sai: encerra a sessão no servidor, apaga a guardada e volta ao login. */
export const endSession = async (
  token: string,
  notice?: string,
): Promise<void> => {
  useSessionStore.getState().signOut(notice);
  await Promise.all([authApi.logout(token), sessionStorage.clear()]);
};

/** Recupera a sessão guardada ao abrir o app. */
export const restoreSession = async (): Promise<void> => {
  useSessionStore.getState().hydrate(await sessionStorage.load());
};
