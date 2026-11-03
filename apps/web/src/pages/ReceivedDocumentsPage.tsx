import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Inbox, MoreHorizontal, Paperclip, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteReceivedDocument, listReceivedDocuments } from '../received-documents-api';
import { formatDateCz } from '../date-utils';
import { formatMoney } from '../lib/format';
import { RECEIVED_VAT_REGIME_LABELS } from '../vat-regime';
import { useConfirm } from '../components/app/confirm-context';
import { PageHeader } from '../components/app/PageHeader';
import type { ReceivedDocument } from '../types';
import { Badge } from '@/components/ui/badge';
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

const PAGE_SIZE = 20;

export function ReceivedDocumentsPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentYear = new Date().getFullYear();
  const rawYear = Number(searchParams.get('year') ?? currentYear);
  const year = Number.isInteger(rawYear) && rawYear >= 2000 && rawYear <= 2100 ? rawYear : currentYear;
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const q = searchParams.get('q') ?? '';
  const [searchText, setSearchText] = useState(q);

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

  const setQuery = (patch: { year?: number; page?: number }) => {
    const next = new URLSearchParams(searchParams);
    if (patch.year !== undefined) next.set('year', String(patch.year));
    if (patch.page !== undefined) next.set('page', String(patch.page));
    setSearchParams(next);
  };

  const listQuery = useQuery({
    queryKey: ['received-documents', { year, q, page }],
    queryFn: () => listReceivedDocuments({ year, q, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const data = listQuery.data;
  const totalPages = data && data.total > 0 ? Math.ceil(data.total / data.pageSize) : 1;
  const yearOptions = useMemo(
    () => Array.from(new Set([year, currentYear, ...(data?.availableYears ?? [])])).sort((a, b) => b - a),
    [data?.availableYears, year, currentYear],
  );
  const context = searchParams.toString();
  const withContext = (path: string) => `${path}${context ? `?${context}` : ''}`;

  const onDelete = async (item: ReceivedDocument) => {
    const ok = await confirm({
      title: `Smazat doklad ${item.documentNumber}?`,
      description: 'Smažou se i nahrané přílohy. Tato akce je nevratná.',
      confirmLabel: 'Smazat',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteReceivedDocument(item.id);
      toast.success('Doklad byl smazán.');
      void queryClient.invalidateQueries({ queryKey: ['received-documents'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Smazání dokladu selhalo');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Přijaté doklady"
        description="Faktury od dodavatelů pro odpočet DPH a evidenci nákladů."
        actions={
          <Button asChild>
            <Link to={withContext('/received/new')} className="no-underline">
              <Plus />
              Nový doklad
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            aria-label="Hledat"
            placeholder="Hledat dodavatele, číslo, předmět…"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="w-72 max-w-full bg-card pl-9"
          />
        </div>
        <Select value={String(year)} onValueChange={(value) => setQuery({ year: Number(value), page: 1 })}>
          <SelectTrigger aria-label="Rok" className="w-24 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {listQuery.isError && (
        <p className="m-0 text-sm text-destructive">
          {listQuery.error instanceof Error ? listQuery.error.message : 'Načtení dokladů selhalo'}
        </p>
      )}

      {data && data.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center">
          <Inbox className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="m-0 text-muted-foreground">
            {q ? 'Pro zadané hledání nebyly nalezeny žádné doklady.' : `V roce ${year} zatím nemáte žádné přijaté doklady.`}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to={withContext('/received/new')} className="no-underline">
              Zadat první doklad
            </Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Doklad</TableHead>
                <TableHead>Dodavatel</TableHead>
                <TableHead>DUZP</TableHead>
                <TableHead className="text-right">K úhradě</TableHead>
                <TableHead>Režim DPH</TableHead>
                <TableHead className="w-24 pr-4">
                  <span className="sr-only">Akce</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.isPending && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Načítám doklady…
                  </TableCell>
                </TableRow>
              )}
              {data?.items.map((item) => (
                <TableRow key={item.id} className={listQuery.isFetching ? 'opacity-60' : undefined}>
                  <TableCell className="pl-4 align-top">
                    <Link
                      to={withContext(`/received/${item.id}`)}
                      className="font-semibold text-primary no-underline hover:underline"
                    >
                      {item.documentNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="w-full max-w-0 align-top">
                    <div className="truncate font-medium" title={item.supplierName}>
                      {item.supplierName}
                    </div>
                    {item.description && (
                      <div className="mt-0.5 truncate text-[13px] text-muted-foreground" title={item.description}>
                        {item.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">{formatDateCz(item.taxableSupplyDate)}</TableCell>
                  <TableCell className="text-right align-top tabular-nums">
                    <div className="font-semibold">{formatMoney(item.totalPayable)}</div>
                    {Number(item.totalVat) > 0 && (
                      <div className="mt-0.5 text-xs text-muted-foreground">DPH {formatMoney(item.totalVat)}</div>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant="secondary">{RECEIVED_VAT_REGIME_LABELS[item.vatRegime].short}</Badge>
                  </TableCell>
                  <TableCell className="pr-3 text-right align-top">
                    <div className="flex items-center justify-end gap-1">
                      {item.attachments.length > 0 && (
                        <span
                          className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"
                          title={`${item.attachments.length} příloh`}
                        >
                          <Paperclip className="size-3.5" aria-hidden="true" />
                          {item.attachments.length}
                        </span>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Další akce">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onSelect={() => navigate(withContext(`/received/${item.id}`))}>
                            <Pencil />
                            Upravit
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
          {data && data.total > data.pageSize && (
            <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
              <span>
                Strana {data.page} z {totalPages} · {data.total} dokladů
              </span>
              <div className="flex gap-2">
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
      )}
    </div>
  );
}
