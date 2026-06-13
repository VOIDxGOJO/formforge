'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type WorkspaceState = {
  workspaceId: string | null;
  setWorkspaceId: (id: string) => void;
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      workspaceId: null,
      setWorkspaceId: (workspaceId) => set({ workspaceId })
    }),
    { name: 'formforge-workspace' }
  )
);

export const useWorkspace = () => useWorkspaceStore();
