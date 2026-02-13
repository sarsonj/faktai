import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { deleteInvoice, downloadInvoicePdf, listInvoices } from '../invoice-api';
import { useAuth } from '../auth/AuthContext';
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

export function InvoicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { me, logout } = useAuth();
  const navigate = useNavigate();

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

  const onLogout = async () => {
    await logout();
    navigate('/auth/login', { replace: true });
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
    <main className="app-shell">
      <section className="card card-wide">
        <h1>Vydané faktury</h1>
        <p>Přihlášený uživatel: {me?.email}</p>

        <div className="toolbar-row">
          <Link to={`/invoices/new${listContext ? `?${listContext}` : ''}`}>Nová faktura</Link>
          <Link to="/tax-reports">DPH podklady</Link>
          <Link to="/settings/subject">Nastavení subjektu</Link>
          <button onClick={onLogout} type="button">
            Odhlásit
          </button>
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
                    <td>{item.invoiceNumber ?? '-'}</td>
                    <td>{statusLabel(item.status)}</td>
                    <td>{item.description || '-'}</td>
                    <td>{item.customerName}</td>
                    <td>{formatDate(item.issueDate)}</td>
                    <td>{formatDate(item.dueDate)}</td>
                    <td>{formatMoney(item.totalWithoutVat)}</td>
                    <td>{formatMoney(item.totalWithVat)}</td>
                    <td>{item.paidAt ? formatDate(item.paidAt) : '-'}</td>
                    <td>
                      <div className="table-actions">
                        <Link to={`/invoices/${item.id}${listContext ? `?${listContext}` : ''}`}>Zobrazit</Link>
                        <Link to={`/invoices/${item.id}/edit${listContext ? `?${listContext}` : ''}`}>Upravit</Link>
                        <Link to={`/invoices/${item.id}/copy${listContext ? `?${listContext}` : ''}`}>Kopie</Link>
                        <button
                          disabled={item.status === 'draft' || item.status === 'cancelled'}
                          onClick={() => {
                            void downloadInvoicePdf(item.id).catch((err: unknown) => {
                              setError(err instanceof Error ? err.message : 'Export PDF selhal');
                            });
                          }}
                          type="button"
                          className="secondary"
                        >
                          PDF
                        </button>
                        <button
                          disabled={item.status !== 'draft'}
                          onClick={() => {
                            void onDelete(item.id);
                          }}
                          type="button"
                          className="danger"
                        >
                          Smazat
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
    </main>
  );
}
