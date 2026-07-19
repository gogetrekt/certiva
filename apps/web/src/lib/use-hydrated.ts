import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * false during SSR and the first client render, true after hydration.
 * Drop-in replacement for the `setMounted(true)` in-effect flag without the
 * cascading render that trips react-hooks/set-state-in-effect.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
