import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const SHOW_DELAY_MS = 500;

export function GlobalLoadingOverlay() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const active = fetching + mutating > 0;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [active]);

  if (!visible) return null;

  return (
    <>
      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 overflow-hidden pointer-events-none">
        <div className="h-full w-1/3 bg-primary animate-[loading-slide_1.2s_ease-in-out_infinite]" />
      </div>
      {/* Floating badge */}
      <div className="fixed bottom-4 right-4 z-[100] pointer-events-none animate-fade-in">
        <div className="flex items-center gap-2 rounded-full bg-card border border-border px-3 py-1.5 shadow-lg">
          <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
          <span className="text-xs text-muted-foreground">Carregando...</span>
        </div>
      </div>
      <style>{`
        @keyframes loading-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </>
  );
}
