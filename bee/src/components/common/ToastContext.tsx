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

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  notify: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({ notify: () => {} });

const DISMISS_MS = 2600;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const notify = useCallback((message: string, variant: ToastVariant = 'info') => {
    counter.current += 1;
    const id = counter.current;
    setToasts((previous) => [...previous, { id, message, variant }]);
    setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
    }, DISMISS_MS);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite" data-testid="bee-toasts">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast" data-variant={toast.variant}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
