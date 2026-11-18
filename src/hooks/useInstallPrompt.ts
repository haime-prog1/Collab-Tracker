import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Capture the event as early as possible (it can fire before React mounts).
let deferred: BeforeInstallPromptEvent | null = null;
const subs = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    subs.forEach((s) => s());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    subs.forEach((s) => s());
  });
}

export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);

export const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/**
 * - `canPrompt`: Chromium browsers fired `beforeinstallprompt` → call `install()`.
 * - `iosManual`: iOS Safari never fires it → show "Share → Add to Home Screen" instructions.
 */
export function useInstallPrompt() {
  const [, force] = useState(0);
  useEffect(() => {
    const s = () => force((n) => n + 1);
    subs.add(s);
    return () => {
      subs.delete(s);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return 'unavailable' as const;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    subs.forEach((s) => s());
    return outcome;
  }, []);

  const installed = isStandalone();
  return {
    installed,
    canPrompt: !installed && !!deferred,
    iosManual: !installed && isIOS(),
    install,
  };
}
