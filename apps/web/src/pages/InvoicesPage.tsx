import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Copy, Download, Eye, FilePlus2, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteInvoice, downloadInvoicePdf, listInvoices } from '../invoice-api';
import { formatDateCz } from '../date-utils';
import { formatMoney } from '../lib/format';
import { useConfirm } from '../components/app/confirm-context';
import { PageHeader } from '../components/app/PageHeader';
import { StatusBadge } from '../components/app/StatusBadge';
import type { InvoiceListFilter, InvoiceListItem } from '../types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const FILTERS: Array<{ value: InvoiceListFilter; label: string }> = [
  { value: 'all', label: 'Všechny' },
  { value: 'draft', label: 'Koncepty' },
  { value: 'unpaid', label: 'Neuhrazené' },
  { value: 'overdue', label: 'Po splatnosti' },
  { value: 'paid', label: 'Uhrazené' },
];
const PAGE_SIZES = [10, 20, 50] as const;
type PageSize = (typeof PAGE_SIZES)[number];

function canExportPdf(item: InvoiceListItem): boolean {
  return item.status !== 'draft' && item.status !== 'cancelled';
}

export function InvoicesPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentYear = new Date().getFullYear();

  const queryClient = useQueryClient();

  const rawStatus = searchParams.get('status');
  const status = (FILTERS.some((f) => f.value === rawStatus) ? rawStatus : 'all') as InvoiceListFilter;
  const q = searchParams.get('q') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const rawPageSize = Number(searchParams.get('pageSize') ?? '10');
  const pageSize: PageSize = (PAGE_SIZES as readonly number[]).includes(rawPageSize) ? (rawPageSize as PageSize) : 10;
  const rawYear = Number(searchParams.get('year') ?? String(currentYear));
  const year = Number.isInteger(rawYear) && rawYear >= 2000 && rawYear <= 2100 ? rawYear : currentYear;

  // Vyhledávání: lokální text, do URL se propíše se zpožděním.
  const [searchText, setSearchText] = useState(q);

  const setQuery = (
    patch: Partial<{ status: InvoiceListFilter; page: number; pageSize: PageSize; year: number; q: string }>,
  ) => {
    const next = new URLSearchParams(searchParams);
    if (patch.status !== undefined) next.set('status', patch.status);
    if (patch.page !== undefined) next.set('page', String(patch.page));
    if (patch.pageSize !== undefined) next.set('pageSize', String(patch.pageSize));
    if (patch.year !== undefined) next.set('year', String(patch.year));
    if (patch.q !== undefined) {
      if (patch.q) next.set('q', patch.q);
      else next.delete('q');
    }
    setSearchParams(next);
  };

  useEffect(() => {
    const trimmed = searchText.trim();
    if (trimmed === q) return;
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (trimmed) next.set('q', trimmed);
      else next.delete('q');
      next.set('page', '1');
      setSearchParams(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchText, q, searchParams, setSearchParams]);

  const listQuery = useQuery({
    queryKey: ['invoices', { status, q, page, pageSize, year }],
    queryFn: () => listInvoices({ status, q, page, pageSize, year }),
    placeholderData: keepPreviousData,
  });
  const data = listQuery.data;
  const loading = listQuery.isFetching;
  const error = listQuery.error instanceof Error ? listQuery.error.message : null;

  const totalPages = data && data.total > 0 ? Math.ceil(data.total / data.pageSize) : 1;
  const yearOptions = useMemo(
    () => Array.from(new Set<number>([year, currentYear, ...(data?.availableYears ?? [])])).sort((a, b) => b - a),
    [data?.availableYears, year, currentYear],
  );

  const listContext = searchParams.toString();
  const withContext = (path: string) => `${path}${listContext ? `?${listContext}` : ''}`;

  const onDelete = async (item: InvoiceListItem) => {
    const ok = await confirm({
      title: `Smazat fakturu ${item.invoiceNumber ?? ''}?`.replace(' ?', '?'),
      description: 'Tato akce je nevratná.',
      confirmLabel: 'Smazat',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteInvoice(item.id);
      toast.success('Faktura byla smazána.');
      if (data && data.items.length === 1 && page > 1) {
        setQuery({ page: page - 1 });
      } else {
        void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Smazání faktury selhalo');
    }
  };

  const onDownload = (item: InvoiceListItem) => {
    downloadInvoicePdf(item.id).catch((err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Export PDF selhal');
    });
  };

  const from = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <div data-ui className="flex flex-col gap-5">
      <PageHeader
        title="Vydané faktury"
        description="Přehled vystavených dokladů a jejich úhrad."
        actions={
          <Button asChild>
            <Link to={withContext('/invoices/new')} className="no-underline">
              <Plus />
              Nová faktura
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={status} onValueChange={(value) => setQuery({ status: value as InvoiceListFilter, page: 1 })}>
          <TabsList className="h-auto flex-wrap">
            {FILTERS.map((filter) => (
              <TabsTrigger key={filter.value} value={filter.value} className="gap-1.5">
                {filter.label}
                <span className="text-muted-foreground tabular-nums">{data?.statusCounts?.[filter.value] ?? '–'}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Hledat"
              placeholder="Hledat odběratele nebo číslo…"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="w-64 max-w-full bg-card pl-9"
            />
          </div>
          <Select value={String(year)} onValueChange={(value) => setQuery({ year: Number(value), page: 1 })}>
            <SelectTrigger aria-label="Rok" className="w-24 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent data-ui>
              {yearOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="m-0 text-sm text-destructive">{error}</p>}

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-4">Doklad</TableHead>
              <TableHead>Odběratel</TableHead>
              <TableHead>Vystaveno</TableHead>
              <TableHead>Splatnost</TableHead>
              <TableHead className="text-right">Částka</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead className="w-24 pr-4">
                <span className="sr-only">Akce</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQuery.isPending && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Načítám faktury…
                </TableCell>
              </TableRow>
            )}
            {data && data.items.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-12">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <FilePlus2 className="size-8 text-muted-foreground" aria-hidden="true" />
                    <p className="m-0 text-muted-foreground">
                      {q || status !== 'all' ? 'Pro zadaný filtr nebyly nalezeny žádné doklady.' : 'Zatím nemáte žádné faktury.'}
                    </p>
                    <Button asChild variant="outline" size="sm">
                      <Link to={withContext('/invoices/new')} className="no-underline">
                        Vystavit fakturu
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {data?.items.map((item) => (
              <TableRow key={item.id} className={loading ? 'opacity-60' : undefined}>
                <TableCell className="pl-4 align-top">
                  <Link
                    to={withContext(`/invoices/${item.id}`)}
                    className="font-semibold text-primary tabular-nums no-underline hover:underline"
                  >
                    {item.invoiceNumber ?? 'Koncept'}
                  </Link>
                </TableCell>
                <TableCell className="w-full max-w-0 align-top">
                  <div className="truncate font-medium" title={item.customerName}>{item.customerName}</div>
                  {item.description && (
                    <div className="mt-0.5 truncate text-[13px] text-muted-foreground" title={item.description}>
                      {item.description}
                    </div>
                  )}
                </TableCell>
                <TableCell className="align-top text-muted-foreground">{formatDateCz(item.issueDate)}</TableCell>
                <TableCell className="align-top text-muted-foreground">{formatDateCz(item.dueDate)}</TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  <div className="font-semibold">{formatMoney(item.totalWithVat)}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">bez DPH {formatMoney(item.totalWithoutVat)}</div>
                </TableCell>
                <TableCell className="align-top">
                  <StatusBadge status={item.status} />
                  {item.status === 'paid' && item.paidAt && (
                    <div className="mt-1 text-xs text-muted-foreground">uhrazeno {formatDateCz(item.paidAt)}</div>
                  )}
                </TableCell>
                <TableCell className="pr-3 text-right align-top">
                  <div className="flex justify-end gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={canExportPdf(item) ? -1 : 0}>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Stáhnout PDF"
                            disabled={!canExportPdf(item)}
                            onClick={() => onDownload(item)}
                          >
                            <Download />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent data-ui>
                        {canExportPdf(item) ? 'Stáhnout PDF' : 'PDF jen pro vystavené faktury'}
                      </TooltipContent>
                    </Tooltip>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Další akce">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent data-ui align="end" className="w-48">
                        <DropdownMenuItem onSelect={() => navigate(withContext(`/invoices/${item.id}`))}>
                          <Eye />
                          Otevřít
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => navigate(withContext(`/invoices/${item.id}/edit`))}>
                          <Pencil />
                          Upravit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => navigate(withContext(`/invoices/${item.id}/copy`))}>
                          <Copy />
                          Kopírovat
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => void onDelete(item)}>
                          <Trash2 />
                          Smazat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {data && data.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
            <span>
              Zobrazeno {from}–{to} z {data.total} dokladů
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span>Na stránku</span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => setQuery({ pageSize: Number(value) as PageSize, page: 1 })}
              >
                <SelectTrigger aria-label="Počet položek na stránku" size="sm" className="w-18">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent data-ui>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => setQuery({ page: data.page - 1 })}>
                <ChevronLeft />
                Předchozí
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={data.page >= totalPages}
                onClick={() => setQuery({ page: data.page + 1 })}
              >
                Další
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
