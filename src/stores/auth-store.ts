"use client";

import { create } from "zustand";

import { type MockSession, clearMockSession, readMockSession } from "@/lib/mock-auth";

type AuthStore = {
  session: MockSession | null;
  hydrated: boolean;
  hydrate: () => void;
  setSession: (session: MockSession | null) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  hydrated: false,
  hydrate: () => {
    set({ session: readMockSession(), hydrated: true });
  },
  setSession: (session) => set({ session, hydrated: true }),
  logout: () => {
    clearMockSession();
    set({ session: null, hydrated: true });
  },
}));
