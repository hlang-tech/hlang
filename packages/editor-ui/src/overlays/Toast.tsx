/**
 * `ToastProvider` / `useToast` — lightweight transient notifications in the
 * black/silver glass language. A host wraps the app once; any component calls
 * `useToast().show('Copied 3 nodes')` for a brief confirmation. Presentation
 * only: it holds a small queue that auto-dismisses.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import './Toast.css';

interface ToastItem {
  readonly id: number;
  readonly message: string;
}

export interface ToastApi {
  show(message: string): void;
}

const ToastCtx = createContext<ToastApi>({ show: () => undefined });

export interface ToastProviderProps {
  readonly children: ReactNode;
  /** Auto-dismiss delay in ms (default 2200). */
  readonly duration?: number;
}

export function ToastProvider({ children, duration = 2200 }: ToastProviderProps): ReactElement {
  const [items, setItems] = useState<readonly ToastItem[]>([]);
  const seq = useRef(0);

  const show = useCallback(
    (message: string): void => {
      seq.current += 1;
      const id = seq.current;
      setItems(prev => [...prev, { id, message }]);
      // Timers are a UI concern; Date/setTimeout are fine in the browser layer.
      setTimeout(() => {
        setItems(prev => prev.filter(t => t.id !== id));
      }, duration);
    },
    [duration],
  );

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="hl-toast-stack" aria-live="polite">
        {items.map(t => (
          <div key={t.id} className="hl-toast">
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastApi {
  return useContext(ToastCtx);
}
