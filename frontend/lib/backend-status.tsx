"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AEGIS_API_BASE, pingBackend } from "./api";

export type BackendMode = "checking" | "live" | "demo";

interface BackendStatus {
  mode: BackendMode;
  base: string;
  lastChecked: number | null;
  refresh: () => Promise<void>;
}

const Ctx = createContext<BackendStatus | null>(null);

export function BackendStatusProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<BackendMode>("checking");
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    const ok = await pingBackend();
    setMode(ok ? "live" : "demo");
    setLastChecked(Date.now());
  }, []);

  useEffect(() => {
    void refresh();
    intervalRef.current = window.setInterval(() => {
      void refresh();
    }, 15_000);
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    };
  }, [refresh]);

  const value = useMemo<BackendStatus>(
    () => ({ mode, base: AEGIS_API_BASE, lastChecked, refresh }),
    [mode, lastChecked, refresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBackendStatus(): BackendStatus {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      mode: "demo",
      base: AEGIS_API_BASE,
      lastChecked: null,
      refresh: async () => {},
    };
  }
  return ctx;
}
