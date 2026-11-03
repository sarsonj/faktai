import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  Copy,
  Download,
  Hash,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Send,
  Undo2,
  Unlock,
  CalendarCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  changeInvoiceNumber,
  downloadInvoicePdf,
  getInvoice,
  issueInvoice,
  markInvoicePaid,
  markInvoiceUnpaid,
  refreshSupplierSnapshot,
} from '../invoice-api';
import { formatDateCz, toLocalDateInputValue } from '../date-utils';
import { formatMoney } from '../lib/format';
import { REVERSE_CHARGE_CODES, TAX_CLASSIFICATION_LABELS } from '../vat-regime';
import { useConfirm } from '../components/app/confirm-context';
import { StatusBadge } from '../components/app/StatusBadge';
import type { InvoiceDetail } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function formatSupplierBankAccount(invoice: InvoiceDetail): string {
  return invoice.supplierBankAccountPrefix
    ? `${invoice.supplierBankAccountPrefix}-${invoice.supplierBankAccountNumber}/${invoice.supplierBankCode}`
    : `${invoice.supplierBankAccountNumber}/${invoice.supplierBankCode}`;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="m-0 text-right font-medium">{children}</dd>
    </div>
  );
}

export function InvoiceDetailPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [searchParams] = useSearchParams();

  const [paidDialogOpen, setPaidDialogOpen] = useState(false);
  const [paidAtInput, setPaidAtInput] = useState('');
  const [numberDialogOpen, setNumberDialogOpen] = useState(false);
  const [numberInput, setNumberInput] = useState('');
  const [syncVariableSymbol, setSyncVariableSymbol] = useState(true);

  const invoiceQuery = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => getInvoice(invoiceId!),
    enabled: Boolean(invoiceId),
  });
  const invoice = invoiceQuery.data;

  const listQuery = searchParams.toString();
  const withContext = (path: string, extra?: string) => {
    const query = [listQuery, extra].filter(Boolean).join('&');
    return `${path}${query ? `?${query}` : ''}`;
  };
  const backHref = withContext('/invoices');

  /** Akce nad dokladem: uloží výsledek do cache, obnoví seznam, ukáže toast. */
  const action = useMutation({
    mutationFn: async (run: () => Promise<InvoiceDetail>) => run(),
    onSuccess: (updated) => {
      queryClient.setQueryData(['invoice', invoiceId], updated);
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
  const busy = action.isPending;

  const runAction = (run: () => Promise<InvoiceDetail>, success: string, failure: string) =>
    action.mutateAsync(run).then(
      () => {
        toast.success(success);
        return true;
      },
      (err: unknown) => {
        toast.error(errorMessage(err, failure));
        return false;
      },
    );

  if (invoiceQuery.isPending) {
    return <p className="text-muted-foreground">Načítám detail faktury…</p>;
  }

  if (!invoice) {
    return (
      <div data-ui className="flex flex-col items-start gap-4">
        <p className="m-0 text-destructive">
          {errorMessage(invoiceQuery.error, 'Faktura nebyla nalezena.')}
        </p>
        <Button variant="outline" onClick={() => navigate(backHref)}>
          <ArrowLeft />
          Zpět na seznam
        </Button>
      </div>
    );
  }

  const isDraft = invoice.status === 'draft';
  const isOpen = invoice.status === 'issued' || invoice.status === 'overdue';
  const isPaid = invoice.status === 'paid';
  const canPdf = !isDraft && invoice.status !== 'cancelled';
  const showVat = invoice.supplierIsVatPayer;
  const reverseChargeLabel = invoice.reverseChargeCode
    ? REVERSE_CHARGE_CODES.find((item) => item.code === invoice.reverseChargeCode)?.label
    : null;

  const openPaidDialog = () => {
    setPaidAtInput(invoice.paidAt ? invoice.paidAt.slice(0, 10) : toLocalDateInputValue(new Date()));
    setPaidDialogOpen(true);
  };

  const openNumberDialog = () => {
    setNumberInput(invoice.invoiceNumber ?? '');
    setSyncVariableSymbol(true);
    setNumberDialogOpen(true);
  };

  const onIssue = async () => {
    if (
      !(await confirm({
        title: 'Vystavit fakturu?',
        description: 'Faktura dostane konečnou podobu a půjde stáhnout jako PDF.',
        confirmLabel: 'Vystavit',
      }))
    ) {
      return;
    }
    await runAction(() => issueInvoice(invoice.id), 'Faktura byla vystavena.', 'Vystavení faktury selhalo');
  };

  const onSubmitPaid = async () => {
    if (!paidAtInput) {
      toast.error('Vyberte datum úhrady.');
      return;
    }
    const ok = await runAction(
      () => markInvoicePaid(invoice.id, paidAtInput),
      isPaid ? 'Datum úhrady bylo upraveno.' : 'Faktura byla označena jako uhrazená.',
      'Označení úhrady selhalo',
    );
    if (ok) setPaidDialogOpen(false);
  };

  const onSubmitNumber = async () => {
    const next = numberInput.replace(/\s+/g, '');
    if (!next) {
      toast.error('Zadejte číslo faktury.');
      return;
    }
    const ok = await runAction(
      () => changeInvoiceNumber(invoice.id, next, syncVariableSymbol),
      'Číslo faktury bylo změněno.',
      'Změna čísla faktury selhala',
    );
    if (ok) setNumberDialogOpen(false);
  };

  const onMarkUnpaid = async () => {
    if (
      !(await confirm({
        title: 'Označit jako neuhrazenou?',
        description: 'Datum úhrady se odstraní.',
        confirmLabel: 'Označit jako neuhrazenou',
      }))
    ) {
      return;
    }
    await runAction(() => markInvoiceUnpaid(invoice.id), 'Faktura byla označena jako neuhrazená.', 'Změna stavu selhala');
  };

  const onRefreshSupplier = async () => {
    if (
      !(await confirm({
        title: 'Aktualizovat údaje dodavatele?',
        description: 'Na faktuře se přepíší údaje dodavatele aktuálními údaji z nastavení subjektu.',
        confirmLabel: 'Aktualizovat',
      }))
    ) {
      return;
    }
    await runAction(
      () => refreshSupplierSnapshot(invoice.id),
      'Údaje dodavatele byly aktualizovány.',
      'Aktualizace údajů dodavatele selhala',
    );
  };

  const onDownload = () => {
    downloadInvoicePdf(invoice.id).catch((err: unknown) => toast.error(errorMessage(err, 'Export PDF selhal')));
  };

  return (
    <div data-ui className="flex flex-col gap-6">
      <nav aria-label="Drobečková navigace" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to={backHref} className="text-muted-foreground no-underline hover:text-foreground">
          Vydané faktury
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-foreground">{invoice.invoiceNumber ?? 'Koncept'}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-2xl font-bold tracking-tight">
              Faktura {invoice.invoiceNumber ?? '(koncept)'}
            </h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="m-0 text-muted-foreground">
            {invoice.customerName} · splatnost {formatDateCz(invoice.dueDate)}
            {isPaid && invoice.paidAt && ` · uhrazeno ${formatDateCz(invoice.paidAt)}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isDraft && (
            <Button onClick={() => void onIssue()} disabled={busy}>
              <Send />
              Vystavit fakturu
            </Button>
          )}
          {isOpen && (
            <Button onClick={openPaidDialog} disabled={busy}>
              <BadgeCheck />
              Označit jako uhrazenou
            </Button>
          )}
          {canPdf && (
            <Button variant="outline" onClick={onDownload}>
              <Download />
              PDF
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to={withContext(`/invoices/${invoice.id}/edit`)} className="no-underline">
              <Pencil />
              Upravit
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Další akce" disabled={busy}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent data-ui align="end" className="w-64">
              <DropdownMenuItem onSelect={() => navigate(withContext(`/invoices/${invoice.id}/copy`))}>
                <Copy />
                Vytvořit kopii
              </DropdownMenuItem>
              {isPaid && (
                <>
                  <DropdownMenuItem onSelect={openPaidDialog}>
                    <CalendarCheck />
                    Změnit datum úhrady
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void onMarkUnpaid()}>
                    <Undo2 />
                    Označit jako neuhrazenou
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Pokročilé</DropdownMenuLabel>
              <DropdownMenuItem onSelect={openNumberDialog}>
                <Hash />
                Změnit číslo dokladu
              </DropdownMenuItem>
              {canPdf && (
                <DropdownMenuItem onSelect={() => void onRefreshSupplier()}>
                  <RefreshCw />
                  Aktualizovat údaje dodavatele
                </DropdownMenuItem>
              )}
              {isPaid && (
                <DropdownMenuItem onSelect={() => navigate(withContext(`/invoices/${invoice.id}/edit`, 'advanced=1'))}>
                  <Unlock />
                  Odemknout editaci uhrazené
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="gap-0 self-start overflow-hidden py-0 lg:col-span-2">
          <CardHeader className="border-b py-4">
            <CardTitle>Položky</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Popis</TableHead>
                  <TableHead className="text-right">Množství</TableHead>
                  <TableHead className="text-right">Cena/j.</TableHead>
                  {showVat && <TableHead className="text-right">DPH</TableHead>}
                  <TableHead className="pr-6 text-right">{showVat ? 'Bez DPH' : 'Celkem'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-transparent">
                    <TableCell className="pl-6 whitespace-normal">{item.description}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(item.quantity).toLocaleString('cs-CZ')} {item.unit}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(item.unitPrice)}</TableCell>
                    {showVat && <TableCell className="text-right tabular-nums">{item.vatRate} %</TableCell>}
                    <TableCell className="pr-6 text-right tabular-nums">{formatMoney(item.lineTotalWithoutVat)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end border-t bg-muted/30 px-6 py-4">
            <dl className="m-0 w-full max-w-xs">
              {showVat && (
                <>
                  <DetailRow label="Základ daně">{formatMoney(invoice.totalWithoutVat)}</DetailRow>
                  <DetailRow label="DPH">{formatMoney(invoice.totalVat)}</DetailRow>
                </>
              )}
              <div className="mt-1 flex items-baseline justify-between gap-4 border-t pt-2.5">
                <dt className="font-semibold">Celkem k úhradě</dt>
                <dd className="m-0 text-lg font-bold tabular-nums">{formatMoney(invoice.totalWithVat)}</dd>
              </div>
            </dl>
          </div>
          {invoice.note && (
            <div className="border-t px-6 py-4 text-sm">
              <span className="text-muted-foreground">Poznámka: </span>
              {invoice.note}
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="gap-3">
            <CardHeader>
              <CardTitle>Odběratel</CardTitle>
            </CardHeader>
            <CardContent>
              <address className="flex flex-col gap-0.5 text-sm not-italic">
                <span className="font-semibold">{invoice.customerName}</span>
                <span>{invoice.customerStreet}</span>
                <span>
                  {invoice.customerPostalCode} {invoice.customerCity}
                </span>
                {invoice.customerCountryCode !== 'CZ' && <span>{invoice.customerCountryCode}</span>}
                {(invoice.customerIco || invoice.customerDic) && (
                  <span className="mt-2 text-muted-foreground">
                    {invoice.customerIco && `IČO ${invoice.customerIco}`}
                    {invoice.customerIco && invoice.customerDic && ' · '}
                    {invoice.customerDic && `DIČ ${invoice.customerDic}`}
                  </span>
                )}
              </address>
            </CardContent>
          </Card>

          <Card className="gap-3">
            <CardHeader>
              <CardTitle>Doklad</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="m-0 divide-y">
                <DetailRow label="Vystaveno">{formatDateCz(invoice.issueDate)}</DetailRow>
                <DetailRow label="DUZP">{formatDateCz(invoice.taxableSupplyDate)}</DetailRow>
                <DetailRow label="Splatnost">{formatDateCz(invoice.dueDate)}</DetailRow>
                {invoice.paidAt && <DetailRow label="Uhrazeno">{formatDateCz(invoice.paidAt)}</DetailRow>}
                <DetailRow label="Variabilní symbol">{invoice.variableSymbol}</DetailRow>
                <DetailRow label="Účet">{formatSupplierBankAccount(invoice)}</DetailRow>
                {showVat && invoice.taxClassification && (
                  <DetailRow label="Daňový režim">
                    {TAX_CLASSIFICATION_LABELS[invoice.taxClassification]}
                    {reverseChargeLabel && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        kód {invoice.reverseChargeCode} – {reverseChargeLabel}
                      </span>
                    )}
                  </DetailRow>
                )}
                {!showVat && <DetailRow label="DPH">neplátce</DetailRow>}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={paidDialogOpen} onOpenChange={setPaidDialogOpen}>
        <DialogContent data-ui className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{isPaid ? 'Změnit datum úhrady' : 'Označit jako uhrazenou'}</DialogTitle>
            <DialogDescription>Faktura {invoice.invoiceNumber} · {formatMoney(invoice.totalWithVat)}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="paid-at">Datum úhrady</Label>
            <Input id="paid-at" type="date" value={paidAtInput} onChange={(event) => setPaidAtInput(event.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaidDialogOpen(false)} disabled={busy}>
              Zrušit
            </Button>
            <Button onClick={() => void onSubmitPaid()} disabled={busy}>
              {busy ? 'Ukládám…' : 'Uložit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={numberDialogOpen} onOpenChange={setNumberDialogOpen}>
        <DialogContent data-ui className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Změnit číslo dokladu</DialogTitle>
            <DialogDescription>Použijte jen ve výjimečných situacích – číslo musí být v řadě jedinečné.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="invoice-number">Číslo dokladu</Label>
              <Input id="invoice-number" value={numberInput} onChange={(event) => setNumberInput(event.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="sync-vs"
                checked={syncVariableSymbol}
                onCheckedChange={(checked) => setSyncVariableSymbol(checked === true)}
              />
              <Label htmlFor="sync-vs" className="font-normal">
                Změnit i variabilní symbol
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNumberDialogOpen(false)} disabled={busy}>
              Zrušit
            </Button>
            <Button onClick={() => void onSubmitNumber()} disabled={busy}>
              {busy ? 'Ukládám…' : 'Uložit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
