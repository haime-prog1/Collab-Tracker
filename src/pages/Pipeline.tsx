import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { Columns3, Plus, Rows3, SearchX, Sparkles } from 'lucide-react';
import { useFilteredCollabs } from '@/hooks/useFilteredCollabs';
import { useCollabs, useSettings } from '@/hooks/useStore';
import { updateSettings } from '@/db/store';
import { loadSampleData } from '@/db/seed';
import { ui } from '@/state/ui';
import type { ViewMode } from '@/types/models';
import { PageHeader } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterBar } from '@/components/pipeline/FilterBar';
import { KanbanBoard } from '@/components/pipeline/KanbanBoard';
import { CollabTable } from '@/components/pipeline/CollabTable';

export default function Pipeline() {
  const all = useCollabs();
  const collabs = useFilteredCollabs();
  const { view } = useSettings();
  const [params, setParams] = useSearchParams();

  // Manifest shortcut: /pipeline?new=1
  useEffect(() => {
    if (params.get('new')) {
      ui.openEditor();
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle={`${all.length} collab${all.length === 1 ? '' : 's'} · drag cards or tap → to advance`}
        actions={
          <>
            <Segmented<ViewMode>
              value={view}
              onChange={(v) => void updateSettings({ view: v })}
              options={[
                { value: 'kanban', label: <Columns3 className="h-4 w-4" />, title: 'Board view' },
                { value: 'table', label: <Rows3 className="h-4 w-4" />, title: 'List view' },
              ]}
            />
            <Button variant="primary" className="hidden md:inline-flex" onClick={() => ui.openEditor()}>
              <Plus className="h-4 w-4" /> New
            </Button>
          </>
        }
      />
      {all.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Your pipeline is empty"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" onClick={() => ui.openEditor()}>
                <Plus className="h-4 w-4" /> Add your first collab
              </Button>
              <Button onClick={() => void loadSampleData()}>Load sample data</Button>
            </div>
          }
        >
          Track every pitch, negotiation and sponsored post from inbox to paid.
        </EmptyState>
      ) : (
        <>
          <FilterBar resultCount={collabs.length} />
          {collabs.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No matches"
              action={
                <Button
                  onClick={() => {
                    ui.resetFilters();
                    ui.setQuery('');
                  }}
                >
                  Clear search & filters
                </Button>
              }
            >
              Try a different brand, platform or stage.
            </EmptyState>
          ) : view === 'kanban' ? (
            <KanbanBoard collabs={collabs} />
          ) : (
            <CollabTable collabs={collabs} />
          )}
        </>
      )}
    </div>
  );
}
