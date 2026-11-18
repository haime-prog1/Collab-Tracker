import { describe, expect, it } from 'vitest';
import { newCollab } from '@/db/factories';
import { EMPTY_FILTERS, filterCollabs } from '@/lib/search';

const a = newCollab({ partnerName: 'Nova Audio', title: 'Earbuds launch', platforms: ['youtube'], stage: 'production', priority: 'high' });
const b = newCollab({ partnerName: 'Brewline Café', title: 'Morning routine', platforms: ['tiktok'], stage: 'negotiating', tags: ['coffee'] });

describe('filterCollabs', () => {
  it('matches brand, platform, stage and tags, accent-insensitively', () => {
    expect(filterCollabs([a, b], { ...EMPTY_FILTERS, query: 'nova' })).toEqual([a]);
    expect(filterCollabs([a, b], { ...EMPTY_FILTERS, query: 'tiktok' })).toEqual([b]);
    expect(filterCollabs([a, b], { ...EMPTY_FILTERS, query: 'production' })).toEqual([a]);
    expect(filterCollabs([a, b], { ...EMPTY_FILTERS, query: 'cafe coffee' })).toEqual([b]);
  });

  it('uses custom stage labels', () => {
    expect(filterCollabs([a, b], { ...EMPTY_FILTERS, query: 'filming' }, { production: 'Filming' })).toEqual([a]);
  });

  it('combines facet filters', () => {
    expect(filterCollabs([a, b], { ...EMPTY_FILTERS, platforms: ['youtube', 'tiktok'], priorities: ['high'] })).toEqual([a]);
    expect(filterCollabs([a, b], { ...EMPTY_FILTERS, stages: ['negotiating'] })).toEqual([b]);
  });
});
