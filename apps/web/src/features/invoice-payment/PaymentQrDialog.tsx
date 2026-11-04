import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { getInvoicePaymentQr, markInvoicePaid } from '../../invoice-api';
import { formatDateCz, todayDateInputValue } from '../../date-utils';
import { formatMoney } from '../../lib/format';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Props = {
  invoiceId: string;
  invoiceNumber: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function CopyRow({ label, value, display }: { label: string; value: string; display?: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Kopírování se nezdařilo.');
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="m-0 flex min-w-0 items-center gap-1">
        <span className="truncate font-medium tabular-nums">{display ?? value}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={`Kopírovat ${label.toLowerCase()}`}
          onClick={() => void onCopy()}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </dd>
    </div>
  );
}

/** Platební QR kód vystavené faktury (CR-0062) – pro rychlou úhradu z bankovní aplikace. */
export function PaymentQrDialog({ invoiceId, invoiceNumber, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const qrQuery = useQuery({
    queryKey: ['invoice-payment-qr', invoiceId],
    queryFn: () => getInvoicePaymentQr(invoiceId),
    enabled: open,
  });
  const qr = qrQuery.data;

  const markPaid = useMutation({
    mutationFn: () => markInvoicePaid(invoiceId, todayDateInputValue()),
    onSuccess: (updated) => {
      queryClient.setQueryData(['invoice', invoiceId], updated);
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      void queryClient.invalidateQueries({ queryKey: ['invoice-payment-qr', invoiceId] });
      toast.success('Faktura byla označena jako uhrazená.');
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Označení úhrady selhalo');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>QR platba{invoiceNumber ? ` ${invoiceNumber}` : ''}</DialogTitle>
          <DialogDescription>Naskenujte kód v mobilní aplikaci banky.</DialogDescription>
        </DialogHeader>

        {qrQuery.isPending && <p className="m-0 py-10 text-center text-sm text-muted-foreground">Načítám…</p>}
        {qrQuery.isError && (
          <p className="m-0 text-sm text-destructive">
            {qrQuery.error instanceof Error ? qrQuery.error.message : 'QR platbu se nepodařilo načíst.'}
          </p>
        )}

        {qr && (
          <div className="flex flex-col gap-4">
            {qr.paid && (
              <p className="m-0 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                Faktura už je označená jako uhrazená.
              </p>
            )}
            {/* QR kód musí mít světlé pozadí i v tmavém režimu, jinak ho banky nepřečtou. */}
            <div className="mx-auto rounded-lg border bg-white p-2">
              <img
                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.qrSvg)}`}
                alt={`QR platba ${formatMoney(qr.amount)}, VS ${qr.variableSymbol}`}
                className="block size-60"
              />
            </div>
            <dl className="m-0 divide-y">
              <CopyRow label="Částka" value={qr.amount} display={formatMoney(qr.amount)} />
              <CopyRow label="Účet" value={qr.bankAccount} />
              <CopyRow label="IBAN" value={qr.iban} />
              <CopyRow label="Variabilní symbol" value={qr.variableSymbol} />
              <div className="flex items-center justify-between gap-3 py-2 text-sm">
                <dt className="text-muted-foreground">Splatnost</dt>
                <dd className="m-0 font-medium">{formatDateCz(qr.dueDate)}</dd>
              </div>
            </dl>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zavřít
          </Button>
          {qr && !qr.paid && (
            <Button onClick={() => markPaid.mutate()} disabled={markPaid.isPending}>
              <BadgeCheck />
              Zaplaceno dnes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
