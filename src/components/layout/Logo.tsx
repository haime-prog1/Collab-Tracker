export function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/icons/favicon.svg" alt="" className="h-8 w-8" width={32} height={32} />
      {!compact && (
        <span className="text-lg font-bold tracking-tight">
          Collab<span className="bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">Tracker</span>
        </span>
      )}
    </div>
  );
}
