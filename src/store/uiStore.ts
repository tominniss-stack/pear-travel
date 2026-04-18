// UI-only ephemeral state. Import only in Client Components. If state affects trip data, it belongs in tripStore.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ── Types ─────────────────────────────────────────────────────────────────────

interface UIState {
  /** The currently open modal. Ledger and Edit are handled via callbacks/routing. */
  activeModal: 'calendar' | 'docs' | null;
}

interface UIActions {
  openModal: (modal: 'calendar' | 'docs') => void;
  closeModal: () => void;
}

type UIStore = UIState & UIActions;

// ── Store ─────────────────────────────────────────────────────────────────────

export const useUIStore = create<UIStore>()(
  devtools(
    (set) => ({
      // ── State ───────────────────────────────────────────────────────────────
      activeModal: null,

      // ── Actions ─────────────────────────────────────────────────────────────
      openModal: (modal) =>
        set({ activeModal: modal }, false, `openModal/${modal}`),

      closeModal: () =>
        set({ activeModal: null }, false, 'closeModal'),
    }),
    { name: 'UIStore' },
  ),
);
