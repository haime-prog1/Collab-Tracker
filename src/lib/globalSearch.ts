import type { Brand, Collab, Contact } from '@/types/models';
import { matchesQuery, normalize } from './search';

export interface SearchResults {
  collabs: Collab[];
  brands: Brand[];
  contacts: { contact: Contact; brand: Brand }[];
  totalCollabs: number;
}

/** Searches collabs (brand, title, platform, stage, tags), brands (name, niche, handles) and contacts (name, email, role). */
export function globalSearch(
  query: string,
  collabs: Collab[],
  brands: Brand[],
  stageLabels?: Parameters<typeof matchesQuery>[2],
  limit = 5,
): SearchResults {
  const q = normalize(query);
  if (!q) return { collabs: [], brands: [], contacts: [], totalCollabs: 0 };
  const terms = q.split(/\s+/);
  const hit = (text: string) => {
    const h = normalize(text);
    return terms.every((t) => h.includes(t));
  };
  const matchedCollabs = collabs.filter((c) => matchesQuery(c, query, stageLabels));
  const matchedBrands = brands.filter((b) => hit([b.name, b.kind, ...b.nicheTags, ...Object.values(b.socials)].join(' ')));
  const contacts = brands.flatMap((brand) =>
    brand.contacts.filter((c) => hit([c.name, c.email ?? '', c.role ?? '', c.phone ?? ''].join(' '))).map((contact) => ({ contact, brand })),
  );
  return {
    collabs: matchedCollabs.slice(0, limit),
    brands: matchedBrands.slice(0, limit),
    contacts: contacts.slice(0, limit),
    totalCollabs: matchedCollabs.length,
  };
}
