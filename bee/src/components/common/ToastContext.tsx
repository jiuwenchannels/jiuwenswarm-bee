/* eslint-disable react-refresh/only-export-components -- context module exports the provider and its hook together */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import './Toasts.css';

export type ToastVariant = 'info' | 'success' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  variant?: ToastVariant;
  action?: ToastAction;
  durationMs?: number;
}

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
}

interface ToastContextValue {
  notify: (message: string, options?: ToastVariant | ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({ notify: () => {} });

const DEFAULT_DISMISS_MS = 3200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, options?: ToastVariant | ToastOptions) => {
      const resolved: ToastOptions = typeof options === 'string' ? { variant: options } : options ?? {};
      counter.current += 1;
      const id = counter.current;
      setToasts((previous) => [
        ...previous,
        { id, message, variant: resolved.variant ?? 'info', action: resolved.action },
      ]);
      setTimeout(() => remove(id), resolved.durationMs ?? DEFAULT_DISMISS_MS);
    },
    [remove],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite" data-testid="bee-toasts">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast" data-variant={toast.variant}>
            <span>{toast.message}</span>
            {toast.action ? (
              <button
                className="toast__action"
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  remove(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
