import { create } from 'zustand';
import type { FieldSchema } from '@formforge/types';

const MAX_HISTORY = 50;

type BuilderState = {
  fields: FieldSchema[];
  selectedFieldId: string | null;
  past: FieldSchema[][];
  future: FieldSchema[][];
  setFields: (fields: FieldSchema[]) => void;
  addField: (field: FieldSchema) => void;
  removeField: (id: string) => void;
  updateField: (id: string, patch: Partial<FieldSchema>) => void;
  reorderFields: (fromIndex: number, toIndex: number) => void;
  selectField: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
};

const pushHistory = (state: BuilderState, nextFields: FieldSchema[]) => {
  const past = [...state.past, state.fields].slice(-MAX_HISTORY);
  return { fields: nextFields, past, future: [] as FieldSchema[][] };
};

export const useBuilderStore = create<BuilderState>((set, get) => ({
  fields: [],
  selectedFieldId: null,
  past: [],
  future: [],
  setFields: (fields) => set({ fields, past: [], future: [] }),
  addField: (field) =>
    set((s) => pushHistory(s, [...s.fields, field])),
  removeField: (id) =>
    set((s) => ({
      ...pushHistory(
        s,
        s.fields.filter((f) => f.id !== id)
      ),
      selectedFieldId: s.selectedFieldId === id ? null : s.selectedFieldId
    })),
  updateField: (id, patch) =>
    set((s) =>
      pushHistory(
        s,
        s.fields.map((f) => (f.id === id ? { ...f, ...patch } : f))
      )
    ),
  reorderFields: (fromIndex, toIndex) =>
    set((s) => {
      const next = [...s.fields];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return s;
      next.splice(toIndex, 0, moved);
      return pushHistory(s, next);
    }),
  selectField: (id) => set({ selectedFieldId: id }),
  undo: () => {
    const { past, fields, future } = get();
    if (!past.length) return;
    const previous = past[past.length - 1]!;
    set({
      fields: previous,
      past: past.slice(0, -1),
      future: [fields, ...future].slice(0, MAX_HISTORY)
    });
  },
  redo: () => {
    const { past, fields, future } = get();
    if (!future.length) return;
    const next = future[0]!;
    set({
      fields: next,
      past: [...past, fields].slice(-MAX_HISTORY),
      future: future.slice(1)
    });
  }
}));
