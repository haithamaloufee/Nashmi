"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

type ToastType = "success" | "error" | "info";
type Toast = { id: string; message: string; type: ToastType };
type ToastContextValue = { showToast: (message: string, type?: ToastType) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((items) => items.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = crypto.randomUUID();
    setToasts((items) => [...items.slice(-3), { id, message, type }]);
    window.setTimeout(() => dismiss(id), 3600);
  }, [dismiss]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex w-[min(360px,calc(100vw-32px))] flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = toast.type === "success" ? CheckCircle2 : toast.type === "error" ? XCircle : Info;
          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 rounded border bg-white/95 p-3 text-sm shadow-soft backdrop-blur ${
                toast.type === "success" ? "border-civic/25 text-civic" : toast.type === "error" ? "border-red-200 text-red-700" : "border-line text-ink"
              }`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="min-w-0 flex-1 leading-6">{toast.message}</p>
              <button type="button" onClick={() => dismiss(toast.id)} className="rounded p-1 text-ink/45 transition hover:bg-ink/5 hover:text-ink" aria-label="إغلاق التنبيه">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { showToast: () => undefined };
  }
  return context;
}
