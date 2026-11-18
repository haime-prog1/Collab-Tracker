import {
  Archive,
  CheckCircle2,
  Clapperboard,
  Handshake,
  Hourglass,
  Inbox,
  Rocket,
  type LucideIcon,
} from 'lucide-react';
import type {
  BrandKind,
  CollabKind,
  CompensationType,
  PaymentStatus,
  Platform,
  Priority,
  StageId,
} from '@/types/models';

export interface StageMeta {
  id: StageId;
  label: string;
  short: string;
  icon: LucideIcon;
  /** Tailwind classes for dot / accent. Full class names so Tailwind can see them. */
  dot: string;
  text: string;
  ring: string;
}

export const STAGES: StageMeta[] = [
  { id: 'inbox', label: 'Inbox / Pitch', short: 'Inbox', icon: Inbox, dot: 'bg-sky-400', text: 'text-sky-400', ring: 'ring-sky-400/40' },
  { id: 'negotiating', label: 'Negotiating', short: 'Negotiating', icon: Handshake, dot: 'bg-amber-400', text: 'text-amber-400', ring: 'ring-amber-400/40' },
  { id: 'confirmed', label: 'Confirmed', short: 'Confirmed', icon: CheckCircle2, dot: 'bg-violet-400', text: 'text-violet-400', ring: 'ring-violet-400/40' },
  { id: 'production', label: 'In Production', short: 'Production', icon: Clapperboard, dot: 'bg-fuchsia-400', text: 'text-fuchsia-400', ring: 'ring-fuchsia-400/40' },
  { id: 'approval', label: 'Pending Approval', short: 'Approval', icon: Hourglass, dot: 'bg-orange-400', text: 'text-orange-400', ring: 'ring-orange-400/40' },
  { id: 'published', label: 'Published', short: 'Published', icon: Rocket, dot: 'bg-emerald-400', text: 'text-emerald-400', ring: 'ring-emerald-400/40' },
  { id: 'archived', label: 'Archived / Completed', short: 'Archived', icon: Archive, dot: 'bg-zinc-500', text: 'text-zinc-400', ring: 'ring-zinc-500/40' },
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<StageId, StageMeta>;

/** Stages that count as "active" work (not closed). */
export const ACTIVE_STAGES: StageId[] = ['inbox', 'negotiating', 'confirmed', 'production', 'approval'];

export const PLATFORMS: Record<Platform, { label: string; color: string }> = {
  youtube: { label: 'YouTube', color: 'bg-red-500/15 text-red-400 ring-red-500/30' },
  tiktok: { label: 'TikTok', color: 'bg-cyan-500/15 text-cyan-300 ring-cyan-500/30' },
  instagram: { label: 'Instagram', color: 'bg-pink-500/15 text-pink-400 ring-pink-500/30' },
  twitch: { label: 'Twitch', color: 'bg-purple-500/15 text-purple-300 ring-purple-500/30' },
  other: { label: 'Other', color: 'bg-zinc-500/15 text-zinc-300 ring-zinc-500/30' },
};

export const PRIORITIES: Record<Priority, { label: string; color: string; weight: number }> = {
  low: { label: 'Low', color: 'text-zinc-400', weight: 0 },
  medium: { label: 'Medium', color: 'text-sky-400', weight: 1 },
  high: { label: 'High', color: 'text-amber-400', weight: 2 },
  urgent: { label: 'Urgent', color: 'text-rose-400', weight: 3 },
};

export const PAYMENT_STATUSES: Record<PaymentStatus, { label: string; color: string }> = {
  unpaid: { label: 'Unpaid', color: 'bg-rose-500/15 text-rose-400 ring-rose-500/30' },
  invoiced: { label: 'Invoiced', color: 'bg-amber-500/15 text-amber-300 ring-amber-500/30' },
  paid: { label: 'Paid', color: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30' },
};

export const COLLAB_KINDS: Record<CollabKind, string> = {
  sponsorship: 'Sponsorship',
  brand_deal: 'Brand deal',
  peer_collab: 'Creator collab',
};

export const COMPENSATION_TYPES: Record<CompensationType, string> = {
  flat_fee: 'Flat fee',
  usage_rights: 'Usage rights',
  bonus: 'Performance bonus',
  affiliate: 'Affiliate / rev share',
  other: 'Other',
};

export const BRAND_KINDS: Record<BrandKind, string> = {
  brand: 'Brand',
  agency: 'Agency',
  creator: 'Creator',
};

export const CURRENCIES = ['PHP', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'SGD', 'BRL', 'MXN'];

export const DELIVERABLE_PRESETS = [
  'Draft script',
  'Video integration',
  'Dedicated video',
  'Instagram Reel',
  'Instagram Story',
  'TikTok video',
  'Community post',
  'Livestream segment',
  'Raw footage to brand',
  'Analytics report',
];
