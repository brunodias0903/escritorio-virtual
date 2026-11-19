import type { Session } from '@/shared/domain';
import { create } from 'zustand';

type SessionState = {
  session: Session | null;
  /** Falso até terminar de procurar uma sessão guardada. */
  hydrated: boolean;
  hydrate: (session: Session | null) => void;
  signIn: (session: Session) => void;
  signOut: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  hydrated: false,
  hydrate: (session) => set({ session, hydrated: true }),
  signIn: (session) => set({ session, hydrated: true }),
  signOut: () => set({ session: null }),
}));
