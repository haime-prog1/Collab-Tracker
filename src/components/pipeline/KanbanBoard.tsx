import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Announcements,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import type { Collab, StageId } from '@/types/models';
import { moveCollab } from '@/db/store';
import { useSettings, useStages } from '@/hooks/useStore';
import { collabTotal } from '@/lib/finance';
import { formatMoney } from '@/lib/format';
import type { StageMeta } from '@/lib/constants';
import { ui } from '@/state/ui';
import { cn } from '@/lib/cn';
import { CollabCard } from './CollabCard';

type Columns = Record<StageId, string[]>;
const COL_PREFIX = 'col:';

function buildColumns(collabs: Collab[], stages: StageMeta[]): Columns {
  const cols = Object.fromEntries(stages.map((s) => [s.id, [] as string[]])) as Columns;
  for (const c of collabs) cols[c.stage]?.push(c.id);
  return cols;
}

export function KanbanBoard({ collabs }: { collabs: Collab[] }) {
  const { visible, labels } = useStages();
  const byId = useMemo(() => new Map(collabs.map((c) => [c.id, c])), [collabs]);
  const [columns, setColumns] = useState<Columns>(() => buildColumns(collabs, visible));
  const [activeId, setActiveId] = useState<string | null>(null);
  const fromStage = useRef<StageId | null>(null);

  // Sync from store whenever data changes and we're not mid-drag.
  useEffect(() => {
    if (!activeId) setColumns(buildColumns(collabs, visible));
  }, [collabs, visible, activeId]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Long-press to drag on touch so horizontal swiping between columns still scrolls.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findStage = (id: string): StageId | undefined => {
    if (id.startsWith(COL_PREFIX)) return id.slice(COL_PREFIX.length) as StageId;
    return (Object.keys(columns) as StageId[]).find((s) => columns[s].includes(id));
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    fromStage.current = findStage(String(active.id)) ?? null;
    try {
      navigator.vibrate?.(12);
    } catch {
      /* ignore */
    }
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const a = String(active.id);
    const o = String(over.id);
    const from = findStage(a);
    const to = findStage(o);
    if (!from || !to || from === to) return;
    setColumns((cols) => {
      const src = cols[from].filter((x) => x !== a);
      const dst = [...cols[to]];
      const overIdx = o.startsWith(COL_PREFIX) ? dst.length : dst.indexOf(o);
      dst.splice(overIdx < 0 ? dst.length : overIdx, 0, a);
      return { ...cols, [from]: src, [to]: dst };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const a = String(active.id);
    setActiveId(null);
    if (!over) return setColumns(buildColumns(collabs, visible));
    const stage = findStage(a);
    if (!stage) return;
    const col = [...columns[stage]];
    const o = String(over.id);
    // Same-column reorder: apply the final sort position.
    if (!o.startsWith(COL_PREFIX) && col.includes(o) && o !== a) {
      const from = col.indexOf(a);
      const to = col.indexOf(o);
      col.splice(to, 0, ...col.splice(from, 1));
    }
    const beforeId = col[col.indexOf(a) + 1] ?? null;
    setColumns((cols) => ({ ...cols, [stage]: col }));
    const original = byId.get(a);
    if (original && (original.stage !== stage || beforeId !== nextInStore(collabs, original))) {
      void moveCollab(a, stage, beforeId);
    }
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${byId.get(String(active.id))?.title ?? 'collab'}.`,
    onDragOver: ({ over }) => (over ? `Over ${labels[findStage(String(over.id)) ?? 'inbox']}.` : 'Not over a column.'),
    onDragEnd: ({ over }) => (over ? `Dropped in ${labels[findStage(String(over.id)) ?? 'inbox']}.` : 'Drop cancelled.'),
    onDragCancel: () => 'Drag cancelled.',
  };

  const active = activeId ? byId.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setColumns(buildColumns(collabs, visible));
      }}
      accessibility={{ announcements }}
    >
      <StageJumpBar stages={visible} columns={columns} />
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-6 scrollbar-none md:mx-0 md:snap-none md:px-0">
        {visible.map((stage) => (
          <Column key={stage.id} stage={stage} ids={columns[stage.id] ?? []} byId={byId} activeId={activeId} />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
        {active ? <CollabCard collab={active} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function nextInStore(all: Collab[], c: Collab): string | null {
  const col = all.filter((x) => x.stage === c.stage);
  return col[col.findIndex((x) => x.id === c.id) + 1]?.id ?? null;
}

function StageJumpBar({ stages, columns }: { stages: StageMeta[]; columns: Columns }) {
  return (
    <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 scrollbar-none md:hidden">
      {stages.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() =>
            document.getElementById(`col-${s.id}`)?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
          }
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-elevated px-3 text-xs font-medium text-muted ring-1 ring-line active:scale-95"
        >
          <span className={cn('h-2 w-2 rounded-full', s.dot)} />
          {s.short}
          <span className="text-subtle">{columns[s.id]?.length ?? 0}</span>
        </button>
      ))}
    </div>
  );
}

function Column({
  stage,
  ids,
  byId,
  activeId,
}: {
  stage: StageMeta;
  ids: string[];
  byId: Map<string, Collab>;
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: COL_PREFIX + stage.id });
  const { currency } = useSettings();
  const total = ids.reduce((sum, id) => sum + (byId.get(id) ? collabTotal(byId.get(id)!, currency) : 0), 0);
  const Icon = stage.icon;

  return (
    <section
      id={`col-${stage.id}`}
      aria-label={stage.label}
      className={cn(
        'flex w-[85vw] max-w-[340px] shrink-0 snap-start flex-col rounded-3xl bg-elevated/50 p-2 ring-1 ring-line transition md:w-[300px]',
        isOver && 'bg-neon/5 ring-2',
        isOver && stage.ring,
      )}
    >
      <header className="flex items-center gap-2 px-2 pb-2 pt-1.5">
        <Icon className={cn('h-4 w-4', stage.text)} />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{stage.label}</h2>
        <span key={ids.length} className="animate-pop rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted ring-1 ring-line">
          {ids.length}
        </span>
        <button
          type="button"
          aria-label={`Add collab to ${stage.label}`}
          onClick={() => ui.openEditor(undefined, { stage: stage.id })}
          className="grid h-8 w-8 place-items-center rounded-lg text-subtle hover:bg-surface hover:text-fg"
        >
          <Plus className="h-4 w-4" />
        </button>
      </header>
      {total > 0 && <p className="-mt-1 px-2 pb-2 text-xs font-medium text-emerald-400/90">{formatMoney(total, currency)}</p>}
      <SortableContext id={stage.id} items={ids} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-28 flex-1 flex-col gap-2">
          {ids.map((id) => {
            const c = byId.get(id);
            return c ? <SortableCard key={id} collab={c} isActive={activeId === id} /> : null;
          })}
          {ids.length === 0 && (
            <div className="grid flex-1 place-items-center rounded-2xl border border-dashed border-line p-4 text-center text-xs text-subtle">
              Drop deals here
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableCard({ collab, isActive }: { collab: Collab; isActive: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: collab.id });
  return (
    <CollabCard
      ref={setNodeRef}
      collab={collab}
      dragging={isActive}
      style={{ transform: CSS.Transform.toString(transform), transition, touchAction: 'pan-x pan-y' }}
      onClick={() => ui.openEditor(collab.id)}
      {...attributes}
      {...listeners}
      onKeyDown={(e) => {
        if (e.key === 'Enter') return ui.openEditor(collab.id);
        listeners?.onKeyDown?.(e);
      }}
      aria-roledescription="Draggable collab card. Enter to open, space to pick up."
    />
  );
}
