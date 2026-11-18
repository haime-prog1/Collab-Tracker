import { Link } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import { useSnapshot } from '@/hooks/useStore';

const REMIND_AFTER_DAYS = 14;

/** Nudges users to export a JSON backup — browser storage can be cleared, especially on iOS. */
export function BackupReminder() {
  const { collabs, settings } = useSnapshot();
  if (collabs.length < 3) return null;
  const last = settings.lastBackupAt ? new Date(settings.lastBackupAt).getTime() : 0;
  const days = Math.floor((Date.now() - last) / 864e5);
  if (days < REMIND_AFTER_DAYS) return null;
  return (
    <Link
      to="/settings#backup"
      className="flex items-center gap-3 rounded-2xl bg-amber-500/10 p-3 text-sm ring-1 ring-amber-500/30 transition hover:bg-amber-500/15"
    >
      <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <span className="flex-1">
        {last ? `Last backup was ${days} days ago.` : "You haven't backed up yet."} Export a JSON backup to keep your deals safe.
      </span>
      <span className="font-semibold text-amber-600 dark:text-amber-400">Back up</span>
    </Link>
  );
}
