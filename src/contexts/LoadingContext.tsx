import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";

interface LoadingCtx {
  run: <T>(fn: () => Promise<T>) => Promise<T>;
  isLoading: boolean;
}

const Ctx = createContext<LoadingCtx | null>(null);
const SHOW_DELAY_MS = 500;

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pending > 0) {
      if (timerRef.current) return;
      timerRef.current = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setVisible(false);
    }
    return () => {
      if (timerRef.current && pending === 0) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [pending]);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setPending((p) => p + 1);
    try {
      return await fn();
    } finally {
      setPending((p) => Math.max(0, p - 1));
    }
  }, []);

  return <Ctx.Provider value={{ run, isLoading: visible }}>{children}</Ctx.Provider>;
}

export function useGlobalLoading(): LoadingCtx {
  const c = useContext(Ctx);
  if (!c) return { run: async (fn) => fn(), isLoading: false };
  return c;
}
