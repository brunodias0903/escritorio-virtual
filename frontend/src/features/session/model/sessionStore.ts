import type { Session, SessionUser } from '@/shared/domain';
import { create } from 'zustand';

type SessionState = {
  session: Session | null;
  /** Falso até terminar de procurar uma sessão guardada. */
  hydrated: boolean;
  /** Aviso exibido na tela de login (ex.: banimento, expulsão ou restrição). */
  notice: string | null;
  hydrate: (session: Session | null) => void;
  signIn: (session: Session) => void;
  patchUser: (patch: Partial<SessionUser>) => void;
  signOut: (notice?: string) => void;
  clearNotice: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  hydrated: false,
  notice: null,
  hydrate: (session) => set({ session, hydrated: true }),
  signIn: (session) => set({ session, hydrated: true, notice: null }),
  patchUser: (patch) =>
    set((state) =>
      state.session
        ? {
            session: {
              ...state.session,
              user: { ...state.session.user, ...patch },
            },
          }
        : state,
    ),
  signOut: (notice) => set({ session: null, notice: notice ?? null }),
  clearNotice: () => set({ notice: null }),
}));
