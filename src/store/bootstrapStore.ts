import { create } from 'zustand';

import { initDatabase } from '../db/database';

export type BootStatus = 'loading' | 'ready' | 'error';

interface BootstrapState {
  status: BootStatus;
  error: string | null;
  /** Starts database initialization. A no-op while an attempt is already in flight. */
  initialize: () => Promise<void>;
  /** Returns to `loading` and initializes again, so a failure is recoverable without a restart. */
  retry: () => Promise<void>;
}

/**
 * Tracks the one-time app boot. Kept in a store rather than in `App` state so the
 * retry and in-flight rules are unit testable without rendering the component tree.
 */
export const useBootstrapStore = create<BootstrapState>((set, get) => {
  let inFlight: Promise<void> | null = null;

  async function run(): Promise<void> {
    try {
      await initDatabase();
      set({ status: 'ready', error: null });
    } catch (err) {
      console.error('Failed to initialize database', err);
      set({ status: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  }

  function start(): Promise<void> {
    if (!inFlight) {
      inFlight = run().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  }

  return {
    status: 'loading',
    error: null,
    initialize: start,
    retry: async () => {
      if (get().status !== 'loading') {
        set({ status: 'loading', error: null });
      }
      await start();
    },
  };
});
