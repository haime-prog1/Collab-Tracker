import type { PaymentStatus } from '@/types/models';
import { toISODate } from '@/lib/format';
import { saveCollab, store } from './store';

/** Set one compensation item's payment status, stamping invoiced / paid dates. */
export async function setPaymentStatus(collabId: string, itemId: string, status: PaymentStatus) {
  const collab = store.getSnapshot().collabs.find((c) => c.id === collabId);
  if (!collab) return;
  const today = toISODate(new Date());
  await saveCollab({
    ...collab,
    compensation: collab.compensation.map((i) =>
      i.id === itemId
        ? {
            ...i,
            status,
            invoicedAt: status !== 'unpaid' ? (i.invoicedAt ?? today) : undefined,
            paidAt: status === 'paid' ? (i.paidAt ?? today) : undefined,
          }
        : i,
    ),
  });
}
