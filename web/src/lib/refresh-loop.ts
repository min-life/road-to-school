/** A small per-screen loop: one request batch, invalidation and coalesced refresh. */
export type RefreshContext = { isCurrent: () => boolean; immediate: boolean };
export function createRefreshLoop(
  task: (context: RefreshContext) => Promise<boolean | void>,
  intervalMs: number,
  timers = { set: (fn: () => void, ms: number) => setTimeout(fn, ms), clear: (id: ReturnType<typeof setTimeout>) => clearTimeout(id) },
) {
  let active = false, paused = false, running = false, pending = false;
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancelTimer = () => { if (timer !== undefined) timers.clear(timer); timer = undefined; };
  const current = (version: number) => active && !paused && version === generation;
  async function execute(immediate: boolean) {
    if (!active || paused) return;
    cancelTimer();
    if (running) { pending = true; return; }
    running = true;
    pending = false;
    const version = generation;
    let poll = true;
    try { poll = (await task({ isCurrent: () => current(version), immediate })) !== false; }
    catch { /* The next tick retries; screens own their error state. */ }
    finally {
      running = false;
      if (active && !paused) {
        if (pending) { pending = false; void execute(true); }
        else if (poll) timer = timers.set(() => { void execute(false); }, intervalMs);
      }
    }
  }
  return {
    setActive(value: boolean) {
      if (active === value) return;
      active = value; generation++; cancelTimer();
      if (active) void execute(true);
    },
    refresh() { generation++; void execute(true); },
    pause() { paused = true; generation++; cancelTimer(); },
    resume() { paused = false; generation++; void execute(true); },
    stop() { active = false; generation++; pending = false; cancelTimer(); },
  };
}
