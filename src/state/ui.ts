/** Ephemeral UI state shared across pages: global search, filters, and the collab editor sheet. */
import { useSyncExternalStore } from 'react';
import { EMPTY_FILTERS, type CollabFilters } from '@/lib/search';
import type { StageId } from '@/types/models';

export interface EditorState {
  open: boolean;
  collabId?: string;
  defaults?: { stage?: StageId; brandId?: string };
}

interface UIState {
  filters: CollabFilters;
  editor: EditorState;
}

let state: UIState = { filters: EMPTY_FILTERS, editor: { open: false } };
const listeners = new Set<() => void>();
const set = (patch: Partial<UIState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useUI<T>(selector: (s: UIState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

export const ui = {
  setQuery: (query: string) => set({ filters: { ...state.filters, query } }),
  setFilters: (patch: Partial<CollabFilters>) => set({ filters: { ...state.filters, ...patch } }),
  resetFilters: () => set({ filters: { ...EMPTY_FILTERS, query: state.filters.query } }),
  openEditor: (collabId?: string, defaults?: EditorState['defaults']) =>
    set({ editor: { open: true, collabId, defaults } }),
  closeEditor: () => set({ editor: { ...state.editor, open: false } }),
};
