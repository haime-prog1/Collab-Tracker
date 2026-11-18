import { useState } from 'react';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface Bar {
  key: string;
  label: string;
  value: number;
}

/**
 * Single-series column chart (no legend: the card title names the series).
 * Thin bars with 4px rounded data-ends on a recessive grid, a hover/focus tooltip,
 * and selective direct labels (peak + latest month only). Pair it with a table view.
 */
export function BarChart({ bars, currency, height = 180 }: { bars: Bar[]; currency: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...bars.map((b) => b.value), 0);
  const niceMax = max <= 0 ? 1 : niceCeil(max);
  const ticks = [niceMax, niceMax / 2, 0];
  const peak = bars.findIndex((b) => b.value === max && max > 0);
  const last = bars.length - 1;

  return (
    <div className="relative">
      <div className="flex">
        {/* y-axis */}
        <div className="flex w-12 shrink-0 flex-col justify-between pr-2 text-right text-[10px] text-subtle tabular-nums" style={{ height }}>
          {ticks.map((t) => <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">{formatMoney(t, currency, true)}</span>)}
        </div>
        <div className="relative flex-1" style={{ height }}>
          {/* recessive gridlines */}
          {ticks.map((t, i) => (
            <div key={t} className="absolute inset-x-0 border-t border-line/70" style={{ top: `${(i / (ticks.length - 1)) * 100}%` }} aria-hidden />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]" role="list" aria-label="Earned per month">
            {bars.map((b, i) => {
              const h = (b.value / niceMax) * 100;
              const showLabel = b.value > 0 && (i === peak || i === last);
              return (
                <div
                  key={b.key}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${b.label}: ${formatMoney(b.value, currency)}`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  // Hit target is the whole column, wider and taller than the mark.
                  className="group relative flex h-full flex-1 cursor-default items-end justify-center outline-none"
                >
                  {showLabel && (
                    <span className="absolute z-[1] -translate-y-full whitespace-nowrap pb-1 text-[10px] font-semibold text-fg tabular-nums" style={{ bottom: `${h}%` }}>
                      {formatMoney(b.value, currency, true)}
                    </span>
                  )}
                  <div
                    className={cn(
                      'w-full max-w-7 rounded-t-[4px] bg-[#059669] transition-[height,opacity] duration-500',
                      hover !== null && hover !== i && 'opacity-50',
                      b.value === 0 && 'bg-line',
                    )}
                    style={{ height: b.value > 0 ? `max(${h}%, 3px)` : '2px' }}
                  />
                  {hover === i && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-surface px-2.5 py-1.5 text-xs shadow-xl ring-1 ring-line print:hidden" style={{ bottom: `${h}%` }}>
                      <p className="text-muted">{b.label}</p>
                      <p className="font-semibold text-fg tabular-nums">{formatMoney(b.value, currency)}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* x-axis: thin out labels when crowded */}
      <div className="ml-12 mt-1.5 flex gap-[2px] text-[10px] text-subtle">
        {bars.map((b, i) => (
          <span key={b.key} className="flex-1 truncate text-center">
            {bars.length <= 12 || i % Math.ceil(bars.length / 12) === 0 ? b.label.split(' ')[0] : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

function niceCeil(v: number) {
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * exp;
}

/** Horizontal single-measure bars for categorical breakdowns (brand / platform). */
export function HBar({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-elevated" aria-hidden>
      <div className="h-full rounded-r-[4px] bg-[#059669] transition-all duration-500" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
    </div>
  );
}
