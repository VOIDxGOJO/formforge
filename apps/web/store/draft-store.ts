import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { FieldSchema } from '@formforge/types';

export type FormDraft = {
  name: string;
  description: string | null;
  objective: string;
  fields: FieldSchema[];
};

type DraftState = {
  draft: FormDraft | null;
  setDraft: (draft: FormDraft) => void;
  clearDraft: () => void;
};

// An AI draft lives only in this browser tab until the creator saves it.
export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      draft: null,
      setDraft: (draft) => set({ draft }),
      clearDraft: () => set({ draft: null })
    }),
    { name: 'formforge-ai-draft', storage: createJSONStorage(() => sessionStorage) }
  )
);
