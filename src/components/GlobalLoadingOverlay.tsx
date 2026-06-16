import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useGlobalLoading } from "@/contexts/LoadingContext";

const SHOW_DELAY_MS = 500;

export function GlobalLoadingOverlay() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const { pending } = useGlobalLoading();

  const blockingActive = mutating + pending > 0;
  const passiveActive = fetching > 0 && !blockingActive;

  const [showBlocking, setShowBlocking] = useState(false);
  const [showPassive, setShowPassive] = useState(false);

  useEffect(() => {
    if (!blockingActive) {
      setShowBlocking(false);
      return;
    }
    const t = setTimeout(() => setShowBlocking(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [blockingActive]);

  useEffect(() => {
    if (!passiveActive) {
      setShowPassive(false);
      return;
    }
    const t = setTimeout(() => setShowPassive(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [passiveActive]);

  return (
    <>
      {/* Barra de progresso fina no topo (fetches passivos) */}
      {showPassive && (
        <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 overflow-hidden pointer-events-none">
          <div className="h-full w-1/3 bg-primary animate-[loading-slide_1.2s_ease-in-out_infinite]" />
        </div>
      )}

      {/* Overlay bloqueante centralizado (mutações / ações explícitas) */}
      {showBlocking && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-background/70 backdrop-blur-sm animate-fade-in"
          role="status"
          aria-busy="true"
          aria-live="polite"
          tabIndex={-1}
          onKeyDown={(e) => e.preventDefault()}
        >
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-8 py-6 shadow-2xl">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">Carregando...</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes loading-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </>
  );
}
