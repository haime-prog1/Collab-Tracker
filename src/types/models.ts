export const STAGE_IDS = [
  'inbox',
  'negotiating',
  'confirmed',
  'production',
  'approval',
  'published',
  'archived',
] as const;
export type StageId = (typeof STAGE_IDS)[number];

export const PLATFORM_IDS = ['youtube', 'tiktok', 'instagram', 'twitch', 'other'] as const;
export type Platform = (typeof PLATFORM_IDS)[number];

export const PRIORITY_IDS = ['low', 'medium', 'high', 'urgent'] as const;
export type Priority = (typeof PRIORITY_IDS)[number];

export const PAYMENT_STATUS_IDS = ['unpaid', 'invoiced', 'paid'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS_IDS)[number];

export const COLLAB_KIND_IDS = ['sponsorship', 'brand_deal', 'peer_collab'] as const;
export type CollabKind = (typeof COLLAB_KIND_IDS)[number];

export const COMPENSATION_TYPE_IDS = ['flat_fee', 'usage_rights', 'bonus', 'affiliate', 'other'] as const;
export type CompensationType = (typeof COMPENSATION_TYPE_IDS)[number];

export const BRAND_KIND_IDS = ['brand', 'agency', 'creator'] as const;
export type BrandKind = (typeof BRAND_KIND_IDS)[number];

export const SOCIAL_KEYS = ['youtube', 'tiktok', 'instagram', 'twitch', 'x', 'website'] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

/** ISO date (yyyy-MM-dd) for due dates, ISO datetime for timestamps. */
export type ISODate = string;
export type ISODateTime = string;

export interface Deliverable {
  id: string;
  title: string;
  platform?: Platform;
  dueDate?: ISODate;
  done: boolean;
  link?: string;
  notes?: string;
}

export interface CompensationItem {
  id: string;
  type: CompensationType;
  label?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  dueDate?: ISODate;
  invoicedAt?: ISODate;
  paidAt?: ISODate;
}

export interface Perk {
  id: string;
  description: string;
  estimatedValue?: number;
  received: boolean;
  receivedAt?: ISODate;
}

export interface StageEvent {
  stage: StageId;
  at: ISODateTime;
}

export interface Collab {
  id: string;
  title: string;
  kind: CollabKind;
  brandId?: string;
  /** Denormalized brand/creator name so search & display never need a join. */
  partnerName: string;
  platforms: Platform[];
  stage: StageId;
  /** Sort order within a stage column. */
  stageOrder: number;
  priority: Priority;
  deadline?: ISODate;
  deliverables: Deliverable[];
  compensation: CompensationItem[];
  perks: Perk[];
  notes?: string;
  tags: string[];
  stageHistory: StageEvent[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  publishedAt?: ISODateTime;
}

export interface Contact {
  id: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
}

export interface Brand {
  id: string;
  name: string;
  kind: BrandKind;
  website?: string;
  contacts: Contact[];
  socials: Partial<Record<SocialKey, string>>;
  nicheTags: string[];
  notes?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface StageOverride {
  label?: string;
  hidden?: boolean;
}

export type ThemePref = 'dark' | 'light' | 'system';
export type ViewMode = 'kanban' | 'table';

export interface Settings {
  id: 'app';
  currency: string;
  theme: ThemePref;
  view: ViewMode;
  stageOverrides: Partial<Record<StageId, StageOverride>>;
  lastBackupAt?: ISODateTime;
  installDismissedAt?: ISODateTime;
  onboarded: boolean;
  updatedAt: ISODateTime;
}
