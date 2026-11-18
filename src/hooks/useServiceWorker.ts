import { useRegisterSW } from 'virtual:pwa-register/react';

/** Registers the service worker and exposes update / offline-ready state. */
export function useServiceWorker() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, reg) {
      // Check for a new version every hour while the app stays open.
      if (reg) setInterval(() => void reg.update().catch(() => undefined), 60 * 60 * 1000);
    },
  });
  return {
    needRefresh,
    offlineReady,
    update: () => updateServiceWorker(true),
    dismiss: () => {
      setNeedRefresh(false);
      setOfflineReady(false);
    },
  };
}
