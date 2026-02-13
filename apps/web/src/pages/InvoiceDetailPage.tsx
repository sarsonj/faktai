import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { downloadInvoicePdf, getInvoice, issueInvoice, markInvoicePaid } from '../invoice-api';
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
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);

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

  const onMarkPaid = async () => {
    if (!invoice) {
      return;
    }

    try {
      const paid = await markInvoicePaid(invoice.id);
      setInvoice(paid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Označení úhrady selhalo');
    }
  };

  const onIssue = async () => {
    if (!invoice) {
      return;
    }

    try {
      const issued = await issueInvoice(invoice.id);
      setInvoice(issued);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vystavení faktury selhalo');
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
          <p className="page-subtitle">Přehled stavu, metadat a položek dokladu.</p>
        </div>
        <div className="page-actions">
          <Link className="action-link" to={backHref}>
            Zpět na seznam
          </Link>
          <Link className="action-link secondary-link" to={`/invoices/${invoice.id}/edit${listQuery ? `?${listQuery}` : ''}`}>
            Upravit
          </Link>
        </div>
      </header>

      <section className="ui-section">
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
        <div className="button-row wrap">
          <Link className="action-link secondary-link" to={`/invoices/${invoice.id}/copy${listQuery ? `?${listQuery}` : ''}`}>
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
        </div>
      </section>

      <section className="ui-section">
        <h2>Metadata faktury</h2>
        <div className="summary-grid">
          <p>
            <strong>Stav:</strong> <span className={statusClassName(invoice.status)}>{statusLabel(invoice.status)}</span>
          </p>
          <p>
            <strong>Variabilní symbol:</strong> {invoice.variableSymbol}
          </p>
          <p>
            <strong>Vystaveno:</strong> {formatDate(invoice.issueDate)}
          </p>
          <p>
            <strong>Splatnost:</strong> {formatDate(invoice.dueDate)}
          </p>
          <p>
            <strong>DUZP:</strong> {formatDate(invoice.taxableSupplyDate)}
          </p>
          <p>
            <strong>Uhrazena dne:</strong> {invoice.paidAt ? formatDate(invoice.paidAt) : '-'}
          </p>
          <p>
            <strong>PDF verze:</strong> {invoice.pdfVersion}
          </p>
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
                <th>Množství</th>
                <th>Jednotka</th>
                <th>Jedn. cena</th>
                <th>DPH</th>
                <th>Bez DPH</th>
                <th>S DPH</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.position}</td>
                  <td>{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unit}</td>
                  <td>{formatMoney(item.unitPrice)}</td>
                  <td>{item.vatRate} %</td>
                  <td>{formatMoney(item.lineTotalWithoutVat)}</td>
                  <td>{formatMoney(item.lineTotalWithVat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="totals-box">
          <p>Bez DPH: {formatMoney(invoice.totalWithoutVat)}</p>
          <p>DPH: {formatMoney(invoice.totalVat)}</p>
          <p>
            <strong>Celkem: {formatMoney(invoice.totalWithVat)}</strong>
          </p>
        </div>
      </section>
    </section>
  );
}
