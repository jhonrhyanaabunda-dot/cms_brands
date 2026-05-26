"use client";

import { useEffect, useRef, useState } from "react";

export type AutosaveState =
  | { status: "idle"; lastSavedAt: Date | null }
  | { status: "dirty"; lastSavedAt: Date | null }
  | { status: "saving"; lastSavedAt: Date | null }
  | { status: "saved"; lastSavedAt: Date }
  | { status: "error"; lastSavedAt: Date | null; error: string };

/**
 * Debounced autosave. Watches `value` (any serializable shape) and calls
 * `save(value)` after `delay`ms of stillness. Skips the initial run.
 */
export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  opts: { delay?: number; enabled?: boolean } = {}
): AutosaveState & { saveNow: () => Promise<void> } {
  const { delay = 1500, enabled = true } = opts;
  const firstRun = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef(false);
  const latest = useRef(value);
  latest.current = value;

  const [state, setState] = useState<AutosaveState>({ status: "idle", lastSavedAt: null });

  async function doSave() {
    if (inflight.current) return;
    inflight.current = true;
    setState((s) => ({ status: "saving", lastSavedAt: s.lastSavedAt }));
    try {
      await save(latest.current);
      const now = new Date();
      setState({ status: "saved", lastSavedAt: now });
    } catch (e: any) {
      setState((s) => ({ status: "error", lastSavedAt: s.lastSavedAt, error: e?.message ?? "Save failed" }));
    } finally {
      inflight.current = false;
    }
  }

  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    if (!enabled) return;
    setState((s) => ({ status: "dirty", lastSavedAt: s.lastSavedAt }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(doSave, delay);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value), enabled, delay]);

  return { ...state, saveNow: doSave };
}

/**
 * Warns the user before they navigate / close the tab when `dirty` is true.
 * Handles the native browser dialog only — Next.js client-side route changes
 * use a router event handled separately.
 */
export function useDirtyGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
}
