import { createContext, useContext, useState, ReactNode } from 'react';
import { startOfMonth } from 'date-fns';

interface MonthCtx {
  month: Date;
  setMonth: (d: Date) => void;
}

const Ctx = createContext<MonthCtx | null>(null);

export function MonthProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  return <Ctx.Provider value={{ month, setMonth }}>{children}</Ctx.Provider>;
}

export function useMonth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMonth must be used within MonthProvider');
  return ctx;
}
