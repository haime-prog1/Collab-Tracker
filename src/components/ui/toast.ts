import { useSyncExternalStore } from 'react';

export type ToastTone = 'default' | 'success' | 'error' | 'celebrate';
export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
}

let toasts: Toast[] = [];
let seq = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());

export function toast(message: string, opts: { tone?: ToastTone; action?: Toast['action']; duration?: number } = {}) {
  const t: Toast = { id: ++seq, message, tone: opts.tone ?? 'default', action: opts.action };
  toasts = [...toasts.slice(-2), t];
  emit();
  setTimeout(() => dismissToast(t.id), opts.duration ?? (opts.action ? 6000 : 3500));
  return t.id;
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToasts() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => toasts,
    () => toasts,
  );
}
