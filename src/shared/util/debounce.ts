/** Default wait for remote search / typeahead (ms). */
export const SEARCH_DEBOUNCE_MS = 300;

/** Slightly shorter wait for local-only list filtering. */
export const LOCAL_FILTER_DEBOUNCE_MS = 200;

/**
 * Creates a cancellable debounce scheduler.
 * Later calls replace earlier ones; only the last scheduled run executes.
 */
export function createDebouncedTask(waitMs: number = SEARCH_DEBOUNCE_MS) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;

  return {
    schedule(task: () => void | Promise<void>): void {
      if (timer !== null) {
        clearTimeout(timer);
      }
      const gen = ++generation;
      timer = setTimeout(() => {
        timer = null;
        if (gen !== generation) {
          return;
        }
        void Promise.resolve(task());
      }, waitMs);
    },
    cancel(): void {
      generation += 1;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    }
  };
}
