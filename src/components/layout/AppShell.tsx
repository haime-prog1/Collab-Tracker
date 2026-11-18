import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { moveCollab, store } from '@/db/store';
import { useSettings, useSnapshot, useStages } from '@/hooks/useStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { celebrate } from '@/lib/celebrate';
import { Toaster } from '@/components/ui/Toaster';
import { toast } from '@/components/ui/toast';
import { ConfirmHost } from '@/components/ui/ConfirmDialog';
import { CollabEditorHost } from '@/components/collab/CollabEditor';
import { UpdatePrompt } from '@/components/pwa/UpdatePrompt';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { Logo } from './Logo';

export function AppShell() {
  const { ready } = useSnapshot();
  const { pathname } = useLocation();
  useThemeSync();
  useGlobalEffects();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  if (!ready) {
    return (
      <div className="grid h-dvh place-items-center">
        <div className="animate-pulse">
          <Logo />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:px-6 md:pb-10">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <CollabEditorHost />
      <ConfirmHost />
      <UpdatePrompt />
      <Toaster />
    </div>
  );
}

function useThemeSync() {
  const { theme } = useSettings();
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  useEffect(() => {
    const dark = theme === 'dark' || (theme === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#09090b' : '#f7f7fb');
  }, [theme, prefersDark]);
}

function useGlobalEffects() {
  const { labels } = useStages();
  useEffect(() => {
    const offErr = store.onError((err) => {
      console.error(err);
      const quota = (err as Error)?.name === 'QuotaExceededError';
      toast(quota ? 'Storage is full — export a backup and free up space.' : 'Could not save. Your last change was undone.', { tone: 'error' });
    });
    const offStage = store.onStageChange((c, from) => {
      if (c.stage === 'published') {
        void celebrate();
        toast(`🎉 “${c.title}” is live! Nice work.`, { tone: 'celebrate', duration: 4500 });
      } else {
        toast(`Moved to ${labels[c.stage]}`, {
          action: { label: 'Undo', onClick: () => void moveCollab(c.id, from) },
        });
      }
    });
    return () => {
      offErr();
      offStage();
    };
  }, [labels]);
}
