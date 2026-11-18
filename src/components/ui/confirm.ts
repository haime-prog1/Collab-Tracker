import { useSyncExternalStore } from 'react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}
interface ConfirmReq extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

let current: ConfirmReq | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());

/** Promise-based confirm: `if (await confirm({...})) ...` — rendered by <ConfirmHost />. */
export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    current?.resolve(false);
    current = { ...opts, resolve };
    emit();
  });
}

export function closeConfirm(ok: boolean) {
  current?.resolve(ok);
  current = null;
  emit();
}

export function useConfirmRequest() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => current,
    () => current,
  );
}
