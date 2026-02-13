import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { deleteInvoice, downloadInvoicePdf, listInvoices } from '../invoice-api';
import type { InvoiceListItem, InvoiceListResponse } from '../types';

const STATUS_OPTIONS = ['all', 'paid', 'unpaid', 'overdue'] as const;

type UiStatus = (typeof STATUS_OPTIONS)[number];

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
      <path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8.5 16h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InvoiceListResponse | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const status = (STATUS_OPTIONS.includes(searchParams.get('status') as UiStatus)
    ? searchParams.get('status')
    : 'all') as UiStatus;
  const q = searchParams.get('q') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const pageSize = (Number(searchParams.get('pageSize') ?? '10') || 10) as 10 | 20 | 50;

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
        });
        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Načtení faktur selhalo');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [status, q, page, pageSize, refreshToken]);

  const totalPages = useMemo(() => {
    if (!data || data.total === 0) {
      return 1;
    }
    return Math.ceil(data.total / data.pageSize);
  }, [data]);

  const setQuery = (patch: Partial<{ status: UiStatus; q: string; page: number; pageSize: 10 | 20 | 50 }>) => {
    const next = new URLSearchParams(searchParams);

    if (patch.status !== undefined) {
      next.set('status', patch.status);
    }
    if (patch.q !== undefined) {
      next.set('q', patch.q);
    }
    if (patch.page !== undefined) {
      next.set('page', String(patch.page));
    }
    if (patch.pageSize !== undefined) {
      next.set('pageSize', String(patch.pageSize));
    }

    if (!next.get('q')) {
      next.delete('q');
    }
    if (!next.get('status')) {
      next.set('status', 'all');
    }
    if (!next.get('page')) {
      next.set('page', '1');
    }
    if (!next.get('pageSize')) {
      next.set('pageSize', '10');
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
      <h1>Vydané faktury</h1>

      <div className="toolbar-row">
        <Link to={`/invoices/new${listContext ? `?${listContext}` : ''}`}>Nová faktura</Link>
      </div>

      <div className="toolbar-row">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option}
            className={option === status ? 'active-chip' : 'chip'}
            onClick={() => setQuery({ status: option, page: 1 })}
            type="button"
          >
            {option === 'all'
              ? 'Všechny'
              : option === 'paid'
                ? 'Uhrazené'
                : option === 'unpaid'
                  ? 'Neuhrazené'
                  : 'Po splatnosti'}
          </button>
        ))}
      </div>

      <div className="toolbar-row">
        <input
          aria-label="Vyhledávání"
          placeholder="Zadejte hledaný výraz"
          value={q}
          onChange={(event) => setQuery({ q: event.target.value, page: 1 })}
        />
        <select
          aria-label="Počet položek"
          value={String(pageSize)}
          onChange={(event) => setQuery({ pageSize: Number(event.target.value) as 10 | 20 | 50, page: 1 })}
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
      </div>

      {loading && <p>Načítám faktury...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && data && data.items.length === 0 && (
        <div>
          <p>Pro zadaný filtr nebyly nalezeny výsledky.</p>
          <Link to={`/invoices/new${listContext ? `?${listContext}` : ''}`}>Vystavit první fakturu</Link>
        </div>
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <>
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Číslo dokladu</th>
                <th>Stav</th>
                <th>Popis</th>
                <th>Odběratel</th>
                <th>Vystaveno</th>
                <th>Splatnost</th>
                <th>Cena bez DPH</th>
                <th>Cena s DPH</th>
                <th>Uhrazena dne</th>
                <th>Akce</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link className="invoice-number-link" to={`/invoices/${item.id}${listContext ? `?${listContext}` : ''}`}>
                      {item.invoiceNumber ?? 'Koncept'}
                    </Link>
                  </td>
                  <td>
                    <span className={statusClassName(item.status)}>{statusLabel(item.status)}</span>
                  </td>
                  <td>{item.description || '-'}</td>
                  <td>{item.customerName}</td>
                  <td>{formatDate(item.issueDate)}</td>
                  <td>{formatDate(item.dueDate)}</td>
                  <td>{formatMoney(item.totalWithoutVat)}</td>
                  <td>{formatMoney(item.totalWithVat)}</td>
                  <td>{item.paidAt ? formatDate(item.paidAt) : '-'}</td>
                  <td>
                    <div className="table-actions">
                      <Link
                        className="icon-link"
                        to={`/invoices/${item.id}/edit${listContext ? `?${listContext}` : ''}`}
                        aria-label="Upravit fakturu"
                        title="Upravit"
                      >
                        <EditIcon />
                      </Link>
                      <Link
                        className="icon-link"
                        to={`/invoices/${item.id}/copy${listContext ? `?${listContext}` : ''}`}
                        aria-label="Vytvořit kopii faktury"
                        title="Kopie"
                      >
                        <CopyIcon />
                      </Link>
                      <button
                        disabled={item.status === 'draft' || item.status === 'cancelled'}
                        onClick={() => {
                          void downloadInvoicePdf(item.id).catch((err: unknown) => {
                            setError(err instanceof Error ? err.message : 'Export PDF selhal');
                          });
                        }}
                        type="button"
                        className="icon-button secondary"
                        aria-label="Stáhnout PDF"
                        title="PDF"
                      >
                        <PdfIcon />
                      </button>
                      <button
                        disabled={item.status !== 'draft'}
                        onClick={() => {
                          void onDelete(item.id);
                        }}
                        type="button"
                        className="icon-button danger"
                        aria-label="Smazat koncept faktury"
                        title="Smazat"
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="toolbar-row">
            <span>
              Strana {data.page} z {totalPages} (celkem {data.total} položek)
            </span>
            <button disabled={data.page <= 1} onClick={() => setQuery({ page: data.page - 1 })} type="button">
              Předchozí
            </button>
            <button
              disabled={data.page >= totalPages}
              onClick={() => setQuery({ page: data.page + 1 })}
              type="button"
            >
              Další
            </button>
          </div>
        </>
      )}
    </section>
  );
}
