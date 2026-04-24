"use client";

import { create } from "zustand";
import { User } from "../types";

interface AppStore {
  user: User | null;
  token: string | null;
  sidebarOpen: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  logout: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  user: null,
  token: null,
  sidebarOpen: true,

  setUser: (user) => set({ user }),

  setToken: (token) => set({ token }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ user: null, token: null });
  },
}));
