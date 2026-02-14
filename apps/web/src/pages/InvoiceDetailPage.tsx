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

function toLocalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultPaidAtInputValue(paidAt?: string | null): string {
  if (paidAt) {
    return paidAt.slice(0, 10);
  }
  return toLocalDateInputValue(new Date());
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
  const [markPaidBusy, setMarkPaidBusy] = useState(false);
  const [showMarkPaidEditor, setShowMarkPaidEditor] = useState(false);
  const [paidAtInput, setPaidAtInput] = useState(defaultPaidAtInputValue());

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
        setPaidAtInput(defaultPaidAtInputValue(payload.paidAt));
        setShowMarkPaidEditor(false);
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

  const onOpenMarkPaidEditor = () => {
    if (!invoice) {
      return;
    }
    setPaidAtInput(defaultPaidAtInputValue(invoice.paidAt));
    setShowMarkPaidEditor(true);
    setError(null);
    setSuccess(null);
  };

  const onSubmitMarkPaid = async () => {
    if (!invoice) {
      return;
    }
    if (!paidAtInput) {
      setError('Vyberte datum úhrady.');
      return;
    }

    try {
      setMarkPaidBusy(true);
      setError(null);
      setSuccess(null);
      const paid = await markInvoicePaid(invoice.id, paidAtInput);
      setInvoice(paid);
      setPaidAtInput(defaultPaidAtInputValue(paid.paidAt));
      setShowMarkPaidEditor(false);
      setSuccess(
        invoice.status === 'paid'
          ? 'Datum úhrady bylo upraveno.'
          : 'Faktura byla označena jako uhrazená.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Označení úhrady selhalo');
    } finally {
      setMarkPaidBusy(false);
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
      setPaidAtInput(defaultPaidAtInputValue(unpaid.paidAt));
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
            <div className="invoice-quick-actions">
              <Link
                className="icon-link"
                to={`/invoices/${invoice.id}/edit${listQuery ? `?${listQuery}` : ''}`}
                aria-label="Upravit fakturu"
                title="Upravit"
                data-tooltip="Upravit"
              >
                <EditIcon />
              </Link>
              <Link
                className="icon-link"
                to={`/invoices/${invoice.id}/copy${listQuery ? `?${listQuery}` : ''}`}
                aria-label="Vytvořit kopii faktury"
                title="Kopie"
                data-tooltip="Kopie"
              >
                <CopyIcon />
              </Link>
              <button
                type="button"
                className={`icon-button secondary${invoice.status === 'draft' || invoice.status === 'cancelled' ? ' muted' : ''}`}
                aria-label="Stáhnout PDF"
                title="PDF"
                data-tooltip={
                  invoice.status === 'draft' || invoice.status === 'cancelled'
                    ? 'PDF jen pro vystavené/uhrazené'
                    : 'Export PDF'
                }
                onClick={() => {
                  if (invoice.status === 'draft' || invoice.status === 'cancelled') {
                    setError('PDF lze exportovat jen u vystavené nebo uhrazené faktury.');
                    return;
                  }
                  void downloadInvoicePdf(invoice.id).catch((err: unknown) => {
                    setError(err instanceof Error ? err.message : 'Export PDF selhal');
                  });
                }}
              >
                <PdfIcon />
              </button>
            </div>

            {invoice.status === 'draft' && (
              <button type="button" className="invoice-primary-action" onClick={onIssue}>
                Vystavit fakturu
              </button>
            )}
            {(invoice.status === 'issued' || invoice.status === 'overdue') && (
              <button
                type="button"
                className="invoice-primary-action secondary"
                onClick={onOpenMarkPaidEditor}
              >
                Označit jako uhrazené
              </button>
            )}
          </div>
        </div>

        {(invoice.status === 'issued' || invoice.status === 'overdue') &&
          showMarkPaidEditor && (
            <div className="paid-at-editor">
              <label>
                Datum úhrady
                <input
                  type="date"
                  value={paidAtInput}
                  onChange={(event) => setPaidAtInput(event.target.value)}
                  disabled={markPaidBusy}
                />
              </label>
              <div className="button-row wrap">
                <button type="button" onClick={onSubmitMarkPaid} disabled={markPaidBusy}>
                  {markPaidBusy ? 'Ukládám...' : 'Potvrdit úhradu'}
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={markPaidBusy}
                  onClick={() => {
                    setShowMarkPaidEditor(false);
                    setPaidAtInput(defaultPaidAtInputValue(invoice.paidAt));
                  }}
                >
                  Zrušit
                </button>
              </div>
            </div>
          )}

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
        <address className="invoice-address">
          <strong className="invoice-address-name">{invoice.customerName}</strong>
          <span>{invoice.customerStreet}</span>
          <span>{invoice.customerPostalCode} {invoice.customerCity}</span>
          <span>{invoice.customerCountryCode}</span>
        </address>
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

      <section className="ui-section invoice-advanced-section">
        <details className="advanced-tools">
          <summary className="advanced-tools-summary">Další možnosti (pokročilé)</summary>
          <p className="helper-text">
            Tyto akce použijte jen ve výjimečných situacích.
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
                <label>
                  Datum uhrazení
                  <input
                    type="date"
                    value={paidAtInput}
                    onChange={(event) => setPaidAtInput(event.target.value)}
                    disabled={advancedBusy || markPaidBusy}
                  />
                </label>
                <button
                  type="button"
                  className="secondary"
                  onClick={onSubmitMarkPaid}
                  disabled={advancedBusy || markPaidBusy}
                >
                  {markPaidBusy ? 'Ukládám...' : 'Uložit datum úhrady'}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={onMarkUnpaid}
                  disabled={advancedBusy || markPaidBusy}
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
      </section>
    </section>
  );
}
