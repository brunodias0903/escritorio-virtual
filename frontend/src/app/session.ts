import { useSessionStore } from '@/features/session/model/sessionStore';
import type { Session } from '@/shared/domain';

import { authApi } from './api';
import { sessionStorage } from './sessionBackend';

/** Entra no app e guarda a sessão para a próxima vez. */
export const beginSession = (session: Session): void => {
  void sessionStorage.save(session);
  useSessionStore.getState().signIn(session);
};

/** Sai: encerra a sessão no servidor, apaga a guardada e volta ao login. */
export const endSession = async (token: string): Promise<void> => {
  useSessionStore.getState().signOut();
  await Promise.all([authApi.logout(token), sessionStorage.clear()]);
};

/** Recupera a sessão guardada ao abrir o app. */
export const restoreSession = async (): Promise<void> => {
  useSessionStore.getState().hydrate(await sessionStorage.load());
};
