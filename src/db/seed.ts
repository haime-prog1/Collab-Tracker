import { addDays, subDays } from 'date-fns';
import type { Brand, Collab } from '@/types/models';
import { toISODate } from '@/lib/format';
import { uid } from '@/lib/id';
import { newBrand, newCollab } from './factories';
import { writeDataset } from './store';

/** Demo data so first-time users can explore every feature. */
export function sampleData(now = new Date()) {
  const d = (n: number) => toISODate(addDays(now, n));
  const ago = (n: number) => subDays(now, n).toISOString();

  const nova = newBrand({
    name: 'Nova Audio',
    kind: 'brand',
    website: 'https://example.com/nova',
    nicheTags: ['tech', 'audio'],
    contacts: [{ id: uid(), name: 'Priya Shah', role: 'Partnerships Lead', email: 'priya@example.com' }],
    socials: { instagram: '@novaaudio', youtube: '@novaaudio' },
  });
  const brew = newBrand({
    name: 'Brewline Coffee',
    kind: 'brand',
    nicheTags: ['lifestyle', 'food'],
    contacts: [{ id: uid(), name: 'Marco Diaz', role: 'Brand Manager', email: 'marco@example.com' }],
    socials: { tiktok: '@brewline' },
  });
  const pixel = newBrand({
    name: 'Pixel Forge Agency',
    kind: 'agency',
    nicheTags: ['gaming'],
    contacts: [{ id: uid(), name: 'Sam Lee', role: 'Talent Manager', email: 'sam@example.com' }],
  });
  const kai = newBrand({ name: 'Kai Creates', kind: 'creator', nicheTags: ['gaming', 'comedy'], socials: { twitch: 'kaicreates' } });
  const brands: Brand[] = [nova, brew, pixel, kai];

  const money = (amount: number, status: 'unpaid' | 'invoiced' | 'paid', type: 'flat_fee' | 'usage_rights' = 'flat_fee', paidAt?: string) => ({
    id: uid(),
    type,
    amount,
    currency: 'PHP',
    status,
    paidAt,
    invoicedAt: status !== 'unpaid' ? d(-10) : undefined,
    dueDate: status === 'invoiced' ? d(14) : undefined,
  });

  const collabs: Collab[] = [
    newCollab({
      title: 'Earbuds launch integration',
      brandId: nova.id,
      partnerName: nova.name,
      platforms: ['youtube', 'instagram'],
      stage: 'production',
      priority: 'high',
      deadline: d(5),
      deliverables: [
        { id: uid(), title: 'Draft script', dueDate: d(1), done: true, link: 'https://docs.example.com/script' },
        { id: uid(), title: 'Video integration (60–90s)', platform: 'youtube', dueDate: d(5), done: false },
        { id: uid(), title: 'Instagram Reel', platform: 'instagram', dueDate: d(7), done: false },
      ],
      compensation: [money(150000, 'unpaid'), money(40000, 'unpaid', 'usage_rights')],
      perks: [{ id: uid(), description: 'Nova Pro earbuds', estimatedValue: 12000, received: true, receivedAt: d(-3) }],
      tags: ['launch'],
    }),
    newCollab({
      title: 'Morning routine TikTok series',
      brandId: brew.id,
      partnerName: brew.name,
      platforms: ['tiktok'],
      stage: 'negotiating',
      priority: 'medium',
      deadline: d(21),
      compensation: [money(90000, 'unpaid')],
      deliverables: [{ id: uid(), title: 'TikTok video ×3', platform: 'tiktok', dueDate: d(21), done: false }],
    }),
    newCollab({
      title: 'Indie game showcase stream',
      brandId: pixel.id,
      partnerName: pixel.name,
      platforms: ['twitch'],
      stage: 'inbox',
      priority: 'low',
      compensation: [money(60000, 'unpaid')],
    }),
    newCollab({
      title: 'Co-op challenge video',
      kind: 'peer_collab',
      brandId: kai.id,
      partnerName: kai.name,
      platforms: ['youtube', 'twitch'],
      stage: 'confirmed',
      priority: 'medium',
      deadline: d(12),
      deliverables: [{ id: uid(), title: 'Film together', dueDate: d(9), done: false }],
    }),
    newCollab({
      title: 'Holiday gift guide feature',
      brandId: nova.id,
      partnerName: nova.name,
      platforms: ['youtube'],
      stage: 'approval',
      priority: 'urgent',
      deadline: d(-1),
      deliverables: [{ id: uid(), title: 'Final cut sent for approval', done: true, link: 'https://drive.example.com/cut' }],
      compensation: [money(110000, 'invoiced')],
    }),
    newCollab({
      title: 'Cold brew summer Reel',
      brandId: brew.id,
      partnerName: brew.name,
      platforms: ['instagram'],
      stage: 'published',
      priority: 'medium',
      publishedAt: ago(4),
      deliverables: [{ id: uid(), title: 'Instagram Reel', platform: 'instagram', done: true, link: 'https://instagram.com/p/example' }],
      compensation: [money(45000, 'paid', 'flat_fee', d(-2))],
      perks: [{ id: uid(), description: 'Coffee subscription (3 mo)', estimatedValue: 4500, received: true, receivedAt: d(-20) }],
    }),
    newCollab({
      title: 'Speaker review (spring)',
      brandId: nova.id,
      partnerName: nova.name,
      platforms: ['youtube'],
      stage: 'archived',
      priority: 'low',
      compensation: [money(140000, 'paid', 'flat_fee', d(-60))],
    }),
  ].map((c, i) => ({ ...c, stageOrder: (i + 1) * 1024 }));

  return { brands, collabs };
}

export async function loadSampleData() {
  await writeDataset(sampleData(), 'merge');
}
