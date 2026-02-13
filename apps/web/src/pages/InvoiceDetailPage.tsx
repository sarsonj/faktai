import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  changeInvoiceNumber,
  downloadInvoicePdf,
  getInvoice,
  issueInvoice,
  markInvoicePaid,
  markInvoiceUnpaid,
} from '../invoice-api';
import type { InvoiceDetail } from '../types';

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

function statusLabel(status: InvoiceDetail['status']): string {
  switch (status) {
    case 'draft':
      return 'Koncept';
    case 'issued':
      return 'Vystavená';
    case 'paid':
      return 'Uhrazená';
    case 'overdue':
      return 'Po splatnosti';
    case 'cancelled':
      return 'Storno';
    default:
      return status;
  }
}

function statusClassName(status: InvoiceDetail['status']): string {
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

export function InvoiceDetailPage() {
  const navigate = useNavigate();
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [advancedInvoiceNumber, setAdvancedInvoiceNumber] = useState('');
  const [syncVariableSymbol, setSyncVariableSymbol] = useState(true);
  const [advancedBusy, setAdvancedBusy] = useState(false);

  useEffect(() => {
    if (!invoiceId) {
      return;
    }

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const payload = await getInvoice(invoiceId);
        setInvoice(payload);
        setAdvancedInvoiceNumber(payload.invoiceNumber ?? '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Načtení faktury selhalo');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [invoiceId]);

  const listQuery = searchParams.toString();
  const backHref = `/invoices${listQuery ? `?${listQuery}` : ''}`;
  const advancedEditHref = invoice
    ? `/invoices/${invoice.id}/edit${listQuery ? `?${listQuery}&advanced=1` : '?advanced=1'}`
    : '#';

  const onMarkPaid = async () => {
    if (!invoice) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      const paid = await markInvoicePaid(invoice.id);
      setInvoice(paid);
      setSuccess('Faktura byla označena jako uhrazená.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Označení úhrady selhalo');
    }
  };

  const onMarkUnpaid = async () => {
    if (!invoice) {
      return;
    }

    try {
      setAdvancedBusy(true);
      setError(null);
      setSuccess(null);
      const unpaid = await markInvoiceUnpaid(invoice.id);
      setInvoice(unpaid);
      setSuccess('Faktura byla označena jako neuhrazená.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Změna stavu faktury selhala');
    } finally {
      setAdvancedBusy(false);
    }
  };

  const onIssue = async () => {
    if (!invoice) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      const issued = await issueInvoice(invoice.id);
      setInvoice(issued);
      setSuccess('Faktura byla vystavena.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vystavení faktury selhalo');
    }
  };

  const onChangeInvoiceNumber = async () => {
    if (!invoice) {
      return;
    }

    const nextInvoiceNumber = advancedInvoiceNumber.replace(/\s+/g, '');
    if (!nextInvoiceNumber) {
      setError('Zadejte číslo faktury.');
      return;
    }

    try {
      setAdvancedBusy(true);
      setError(null);
      setSuccess(null);
      const changed = await changeInvoiceNumber(
        invoice.id,
        nextInvoiceNumber,
        syncVariableSymbol,
      );
      setInvoice(changed);
      setAdvancedInvoiceNumber(changed.invoiceNumber ?? '');
      setSuccess('Číslo faktury bylo změněno.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Změna čísla faktury selhala');
    } finally {
      setAdvancedBusy(false);
    }
  };

  if (loading) {
    return <section className="card card-wide">Načítám detail faktury...</section>;
  }

  if (error || !invoice) {
    return (
      <section className="card card-wide">
        <p className="error">{error ?? 'Faktura nebyla nalezena.'}</p>
        <button type="button" onClick={() => navigate(backHref)}>
          Zpět na seznam
        </button>
      </section>
    );
  }

  return (
    <section className="card card-wide">
      <nav className="breadcrumb" aria-label="Drobečková navigace">
        <Link to={backHref}>Vydané faktury</Link>
        <span className="breadcrumb-sep">/</span>
        <span>Detail dokladu</span>
      </nav>

      <header className="page-head">
        <div>
          <p className="page-kicker">Fakturace</p>
          <h1 className="page-title">Detail faktury {invoice.invoiceNumber ?? '(koncept)'}</h1>
          <p className="page-subtitle">Přehled dokladu, platebních údajů a položek faktury.</p>
        </div>
        <div className="page-actions">
          <Link className="action-link secondary-link" to={backHref}>
            Zpět na seznam
          </Link>
        </div>
      </header>

      {error && <p className="error">{error}</p>}
      {success && <p>{success}</p>}

      <section className="ui-section invoice-detail-hero">
        <div className="invoice-detail-hero-top">
          <div className="invoice-detail-hero-badges">
            <span className={statusClassName(invoice.status)}>{statusLabel(invoice.status)}</span>
            <span className="summary-pill">Doklad #{invoice.invoiceNumber ?? '-'}</span>
          </div>
          <div className="invoice-detail-hero-actions">
            <Link
              className="action-link"
              to={`/invoices/${invoice.id}/edit${listQuery ? `?${listQuery}` : ''}`}
            >
              Upravit
            </Link>
            <Link
              className="action-link secondary-link"
              to={`/invoices/${invoice.id}/copy${listQuery ? `?${listQuery}` : ''}`}
            >
              Kopie
            </Link>
            <button
              type="button"
              className="secondary"
              disabled={invoice.status === 'draft' || invoice.status === 'cancelled'}
              onClick={() => {
                void downloadInvoicePdf(invoice.id).catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : 'Export PDF selhal');
                });
              }}
            >
              PDF
            </button>

            {invoice.status === 'draft' && (
              <button type="button" onClick={onIssue}>
                Vystavit fakturu
              </button>
            )}
            {(invoice.status === 'issued' || invoice.status === 'overdue') && (
              <button type="button" className="secondary" onClick={onMarkPaid}>
                Označit jako uhrazené
              </button>
            )}

            <details className="advanced-tools advanced-tools-inline">
              <summary className="advanced-tools-summary">Další možnosti</summary>
              <p className="helper-text">
                Pokročilé akce pro výjimečné situace.
              </p>

              <div className="form-grid form-grid-two">
                <label>
                  Změnit číslo dokladu
                  <input
                    value={advancedInvoiceNumber}
                    onChange={(event) => setAdvancedInvoiceNumber(event.target.value)}
                    disabled={advancedBusy}
                  />
                </label>
                <label className="checkbox-row">
                  <span>Synchronizovat i variabilní symbol</span>
                  <input
                    type="checkbox"
                    checked={syncVariableSymbol}
                    onChange={(event) => setSyncVariableSymbol(event.target.checked)}
                    disabled={advancedBusy}
                  />
                </label>
              </div>

              <div className="button-row wrap">
                <button
                  type="button"
                  className="secondary"
                  onClick={onChangeInvoiceNumber}
                  disabled={advancedBusy}
                >
                  Uložit číslo dokladu
                </button>

                {invoice.status === 'paid' && (
                  <>
                    <button
                      type="button"
                      className="secondary"
                      onClick={onMarkUnpaid}
                      disabled={advancedBusy}
                    >
                      Označit jako neuhrazené
                    </button>
                    <Link className="action-link secondary-link" to={advancedEditHref}>
                      Odemknout editaci uhrazené
                    </Link>
                  </>
                )}
              </div>
            </details>
          </div>
        </div>

        <div className="kpi-grid">
          <article className="kpi-card">
            <p>Celkem k úhradě</p>
            <strong>{formatMoney(invoice.totalWithVat)}</strong>
          </article>
          <article className="kpi-card">
            <p>Základ daně</p>
            <strong>{formatMoney(invoice.totalWithoutVat)}</strong>
          </article>
          <article className="kpi-card">
            <p>DPH</p>
            <strong>{formatMoney(invoice.totalVat)}</strong>
          </article>
        </div>
      </section>

      <section className="ui-section">
        <h2>Informace o dokladu</h2>
        <div className="invoice-meta-grid">
          <article className="invoice-meta-card">
            <h3>Doklad a platba</h3>
            <dl className="invoice-meta-list">
              <div>
                <dt>Číslo dokladu</dt>
                <dd>{invoice.invoiceNumber ?? '-'}</dd>
              </div>
              <div>
                <dt>Stav</dt>
                <dd>
                  <span className={statusClassName(invoice.status)}>{statusLabel(invoice.status)}</span>
                </dd>
              </div>
              <div>
                <dt>Variabilní symbol</dt>
                <dd>{invoice.variableSymbol}</dd>
              </div>
            </dl>
          </article>
          <article className="invoice-meta-card">
            <h3>Termíny</h3>
            <dl className="invoice-meta-list">
              <div>
                <dt>Vystaveno</dt>
                <dd>{formatDate(invoice.issueDate)}</dd>
              </div>
              <div>
                <dt>Splatnost</dt>
                <dd>{formatDate(invoice.dueDate)}</dd>
              </div>
              <div>
                <dt>Datum zdanitelného plnění (DUZP)</dt>
                <dd>{formatDate(invoice.taxableSupplyDate)}</dd>
              </div>
              <div>
                <dt>Uhrazena dne</dt>
                <dd>{invoice.paidAt ? formatDate(invoice.paidAt) : '-'}</dd>
              </div>
            </dl>
          </article>
        </div>
      </section>

      <section className="ui-section">
        <h2>Odběratel</h2>
        <p>{invoice.customerName}</p>
        <p>{invoice.customerStreet}</p>
        <p>
          {invoice.customerPostalCode} {invoice.customerCity}, {invoice.customerCountryCode}
        </p>
      </section>

      <section className="ui-section">
        <h2>Položky faktury</h2>
        <div className="data-table-wrap">
          <table className="invoice-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Popis</th>
                <th className="align-right">Množství</th>
                <th>Jednotka</th>
                <th className="align-right">Jedn. cena</th>
                <th className="align-right">DPH</th>
                <th className="align-right">Bez DPH</th>
                <th className="align-right">S DPH</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.position}</td>
                  <td>{item.description}</td>
                  <td className="align-right">{item.quantity}</td>
                  <td>{item.unit}</td>
                  <td className="align-right">{formatMoney(item.unitPrice)}</td>
                  <td className="align-right">{item.vatRate} %</td>
                  <td className="align-right">{formatMoney(item.lineTotalWithoutVat)}</td>
                  <td className="align-right">{formatMoney(item.lineTotalWithVat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="totals-box">
          <div className="totals-row">
            <span>Bez DPH</span>
            <strong>{formatMoney(invoice.totalWithoutVat)}</strong>
          </div>
          <div className="totals-row">
            <span>DPH</span>
            <strong>{formatMoney(invoice.totalVat)}</strong>
          </div>
          <div className="totals-row totals-row-final">
            <span>Celkem</span>
            <strong>{formatMoney(invoice.totalWithVat)}</strong>
          </div>
        </div>
      </section>
    </section>
  );
}
