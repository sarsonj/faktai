import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { deleteInvoice, downloadInvoicePdf, listInvoices } from '../invoice-api';
import type { InvoiceListItem, InvoiceListResponse } from '../types';

const STATUS_OPTIONS = ['all', 'paid', 'unpaid', 'overdue'] as const;

type UiStatus = (typeof STATUS_OPTIONS)[number];

const STATUS_LABELS: Record<UiStatus, string> = {
  all: 'Všechny',
  paid: 'Uhrazené',
  unpaid: 'Neuhrazené',
  overdue: 'Po splatnosti',
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('cs-CZ');
}

function formatMoney(value: string): string {
  const number = Number(value);
  return `${number.toLocaleString('cs-CZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} Kč`;
}

function statusLabel(status: InvoiceListItem['status']) {
  switch (status) {
    case 'paid':
      return 'Uhrazená';
    case 'overdue':
      return 'Po splatnosti';
    case 'issued':
      return 'Neuhrazená';
    case 'draft':
      return 'Koncept';
    case 'cancelled':
      return 'Storno';
    default:
      return status;
  }
}

function statusClassName(status: InvoiceListItem['status']): string {
  switch (status) {
    case 'draft':
      return 'status-badge status-draft';
    case 'issued':
      return 'status-badge status-issued';
    case 'overdue':
      return 'status-badge status-overdue';
    case 'paid':
      return 'status-badge status-paid';
    case 'cancelled':
      return 'status-badge status-cancelled';
    default:
      return 'status-badge';
  }
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20h4l10-10-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m12.5 7.5 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m8 10 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 7v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 11v5M14 11v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function InvoicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentYear = new Date().getFullYear();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InvoiceListResponse | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const status = (STATUS_OPTIONS.includes(searchParams.get('status') as UiStatus)
    ? searchParams.get('status')
    : 'all') as UiStatus;
  const q = '';
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const pageSize = (Number(searchParams.get('pageSize') ?? '10') || 10) as 10 | 20 | 50;
  const selectedYearRaw = Number(searchParams.get('year') ?? String(currentYear));
  const year =
    Number.isInteger(selectedYearRaw) && selectedYearRaw >= 2000 && selectedYearRaw <= 2100
      ? selectedYearRaw
      : currentYear;

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const payload = await listInvoices({
          status,
          q,
          page,
          pageSize,
          year,
        });
        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Načtení faktur selhalo');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [status, page, pageSize, refreshToken, year]);

  const totalPages = useMemo(() => {
    if (!data || data.total === 0) {
      return 1;
    }
    return Math.ceil(data.total / data.pageSize);
  }, [data]);

  const visibleStatusCounts = useMemo(() => {
    const counts = {
      draft: 0,
      issued: 0,
      overdue: 0,
      paid: 0,
      cancelled: 0,
    };

    for (const row of data?.items ?? []) {
      counts[row.status] += 1;
    }

    return counts;
  }, [data]);

  const yearOptions = useMemo(() => {
    const merged = new Set<number>([year, ...(data?.availableYears ?? [])]);
    return Array.from(merged).sort((a, b) => b - a);
  }, [data?.availableYears, year]);

  const setQuery = (
    patch: Partial<{ status: UiStatus; page: number; pageSize: 10 | 20 | 50; year: number }>,
  ) => {
    const next = new URLSearchParams(searchParams);

    if (patch.status !== undefined) {
      next.set('status', patch.status);
    }
    if (patch.page !== undefined) {
      next.set('page', String(patch.page));
    }
    if (patch.pageSize !== undefined) {
      next.set('pageSize', String(patch.pageSize));
    }
    if (patch.year !== undefined) {
      next.set('year', String(patch.year));
    }

    next.delete('q');
    if (!next.get('status')) {
      next.set('status', 'all');
    }
    if (!next.get('page')) {
      next.set('page', '1');
    }
    if (!next.get('pageSize')) {
      next.set('pageSize', '10');
    }
    if (!next.get('year')) {
      next.set('year', String(currentYear));
    }

    setSearchParams(next);
  };

  const onDelete = async (invoiceId: string) => {
    if (!window.confirm('Smazat fakturu? Tato akce je nevratná.')) {
      return;
    }

    try {
      await deleteInvoice(invoiceId);

      if (data && data.items.length === 1 && page > 1) {
        setQuery({ page: page - 1 });
      } else {
        setRefreshToken((current) => current + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Smazání faktury selhalo');
    }
  };

  const listContext = searchParams.toString();

  return (
    <section className="card card-wide">
      <header className="page-head">
        <div>
          <p className="page-kicker">Fakturace</p>
          <h1 className="page-title">Vydané faktury</h1>
          <p className="page-subtitle">Přehled vystavených dokladů, jejich stavů a navazujících akcí.</p>
        </div>
        <div className="page-actions">
          <Link className="action-link" to={`/invoices/new${listContext ? `?${listContext}` : ''}`}>
            Nová faktura
          </Link>
        </div>
      </header>
      {error && <p className="error">{error}</p>}

      <section className="ui-section">
        <div className="ui-section-head">
          <h2>Seznam dokladů</h2>
          <div className="section-inline-fields">
            <label className="filter-inline">
              Stav
              <select
                aria-label="Stav faktur"
                value={status}
                onChange={(event) => setQuery({ status: event.target.value as UiStatus, page: 1 })}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {STATUS_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-inline">
              Rok
              <select
                aria-label="Rok faktur"
                value={String(year)}
                onChange={(event) => setQuery({ year: Number(event.target.value), page: 1 })}
              >
                {yearOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {loading && <p>Načítám faktury...</p>}

        {!loading && !error && data && (
          <div className="invoice-stats">
            <span className="summary-pill">Celkem: {data.total}</span>
            <span className="summary-pill summary-pill-draft">Koncepty: {visibleStatusCounts.draft}</span>
            <span className="summary-pill summary-pill-issued">Neuhrazené: {visibleStatusCounts.issued}</span>
            <span className="summary-pill summary-pill-overdue">Po splatnosti: {visibleStatusCounts.overdue}</span>
            <span className="summary-pill summary-pill-paid">Uhrazené: {visibleStatusCounts.paid}</span>
          </div>
        )}

        {!loading && !error && data && data.items.length === 0 && (
          <div className="empty-state">
            <p>Pro zadaný filtr nebyly nalezeny výsledky.</p>
            <Link to={`/invoices/new${listContext ? `?${listContext}` : ''}`}>Vystavit první fakturu</Link>
          </div>
        )}

        {!loading && !error && data && data.items.length > 0 && (
          <>
            <div className="data-table-wrap">
              <table className="invoice-table invoice-list-table">
                <thead>
                  <tr>
                    <th className="col-doc">Doklad</th>
                    <th className="col-customer">Odběratel a popis</th>
                    <th className="col-dates">Termíny</th>
                    <th className="col-amounts">Částky</th>
                    <th className="col-status">Stav</th>
                    <th className="col-actions">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id}>
                      <td className="cell-doc">
                        <Link
                          className="invoice-number-link"
                          to={`/invoices/${item.id}${listContext ? `?${listContext}` : ''}`}
                        >
                          {item.invoiceNumber ?? 'Koncept'}
                        </Link>
                      </td>
                      <td className="cell-customer">
                        <div className="invoice-cell-primary" title={item.customerName}>
                          {item.customerName}
                        </div>
                        <div className="invoice-cell-secondary" title={item.description || '-'}>
                          {item.description || '-'}
                        </div>
                      </td>
                      <td className="cell-dates">
                        <div className="invoice-meta-row">
                          <span className="invoice-meta-key">Vystaveno</span>
                          <span className="invoice-meta-value">{formatDate(item.issueDate)}</span>
                        </div>
                        <div className="invoice-meta-row">
                          <span className="invoice-meta-key">Splatnost</span>
                          <span className="invoice-meta-value">{formatDate(item.dueDate)}</span>
                        </div>
                      </td>
                      <td className="cell-amounts">
                        <div className="invoice-meta-row">
                          <span className="invoice-meta-key">Celkem</span>
                          <span className="invoice-meta-value invoice-amount-main">
                            {formatMoney(item.totalWithVat)}
                          </span>
                        </div>
                        <div className="invoice-meta-row">
                          <span className="invoice-meta-key">Bez DPH</span>
                          <span className="invoice-meta-value invoice-amount-sub">
                            {formatMoney(item.totalWithoutVat)}
                          </span>
                        </div>
                      </td>
                      <td className="cell-status">
                        <div className="invoice-cell-primary">
                          <span className={statusClassName(item.status)}>{statusLabel(item.status)}</span>
                        </div>
                        {item.status === 'paid' && item.paidAt && (
                          <div className="invoice-cell-secondary invoice-status-date">
                            {formatDate(item.paidAt)}
                          </div>
                        )}
                      </td>
                      <td className="cell-actions">
                        <div className="table-actions">
                          <Link
                            className="icon-link"
                            to={`/invoices/${item.id}/edit${listContext ? `?${listContext}` : ''}`}
                            aria-label="Upravit fakturu"
                            title="Upravit"
                            data-tooltip="Upravit"
                          >
                            <EditIcon />
                          </Link>
                          <Link
                            className="icon-link"
                            to={`/invoices/${item.id}/copy${listContext ? `?${listContext}` : ''}`}
                            aria-label="Vytvořit kopii faktury"
                            title="Kopie"
                            data-tooltip="Kopie"
                          >
                            <CopyIcon />
                          </Link>
                          <button
                            onClick={() => {
                              if (item.status === 'draft' || item.status === 'cancelled') {
                                setError('PDF lze exportovat jen u vystavené nebo uhrazené faktury.');
                                return;
                              }
                              void downloadInvoicePdf(item.id).catch((err: unknown) => {
                                setError(err instanceof Error ? err.message : 'Export PDF selhal');
                              });
                            }}
                            type="button"
                            className={`icon-button secondary${item.status === 'draft' || item.status === 'cancelled' ? ' muted' : ''}`}
                            aria-label="Stáhnout PDF"
                            title="PDF"
                            data-tooltip={
                              item.status === 'draft' || item.status === 'cancelled'
                                ? 'PDF jen pro vystavené/uhrazené'
                                : 'Export PDF'
                            }
                          >
                            <PdfIcon />
                          </button>
                          <button
                            onClick={() => {
                              void onDelete(item.id);
                            }}
                            type="button"
                            className="icon-button danger destructive"
                            aria-label="Smazat doklad"
                            title="Smazat"
                            data-tooltip="Smazat doklad"
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination-row">
              <span className="pagination-meta">
                Strana {data.page} / {totalPages} | {data.total} položek
              </span>
              <div className="pagination-controls">
                <label className="pagination-size">
                  Na stránku
                  <select
                    aria-label="Počet položek na stránku"
                    value={String(pageSize)}
                    onChange={(event) =>
                      setQuery({ pageSize: Number(event.target.value) as 10 | 20 | 50, page: 1 })
                    }
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                </label>
                <div className="pagination-nav">
                  <button
                    className="secondary"
                    disabled={data.page <= 1}
                    onClick={() => setQuery({ page: data.page - 1 })}
                    type="button"
                  >
                    ←
                  </button>
                  <button
                    className="secondary"
                    disabled={data.page >= totalPages}
                    onClick={() => setQuery({ page: data.page + 1 })}
                    type="button"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </section>
  );
}
