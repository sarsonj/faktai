import type { InvoiceListStatus } from '../../types';
import { cn } from '@/lib/utils';

const STATUS: Record<InvoiceListStatus, { label: string; tone: string }> = {
  draft: { label: 'Koncept', tone: 'draft' },
  issued: { label: 'Neuhrazená', tone: 'unpaid' },
  overdue: { label: 'Po splatnosti', tone: 'overdue' },
  paid: { label: 'Uhrazená', tone: 'paid' },
  cancelled: { label: 'Storno', tone: 'draft' },
};

/** Štítek stavu dokladu – barevná tečka + text (varianta A). */
export function StatusBadge({ status, className }: { status: InvoiceListStatus; className?: string }) {
  const { label, tone } = STATUS[status] ?? { label: status, tone: 'draft' };
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap',
        className,
      )}
      style={{ background: `var(--status-${tone}-bg)`, color: `var(--status-${tone}-fg)` }}
    >
      <span className="size-1.5 rounded-full" style={{ background: `var(--status-${tone}-dot)` }} aria-hidden="true" />
      {label}
    </span>
  );
}
