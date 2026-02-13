import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getInvoice, markInvoicePaid } from '../invoice-api';
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

  if (loading) {
    return (
      <main className="app-shell">
        <section className="card card-wide">Načítám detail faktury...</section>
      </main>
    );
  }

  if (error || !invoice) {
    return (
      <main className="app-shell">
        <section className="card card-wide">
          <p className="error">{error ?? 'Faktura nebyla nalezena.'}</p>
          <button type="button" onClick={() => navigate(backHref)}>
            Zpět na seznam
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="card card-wide">
        <h1>Detail faktury {invoice.invoiceNumber ?? '(koncept)'}</h1>

        <div className="toolbar-row">
          <Link to={backHref}>Zpět na seznam</Link>
          <Link to={`/invoices/${invoice.id}/edit${listQuery ? `?${listQuery}` : ''}`}>Upravit</Link>
          <Link to={`/invoices/${invoice.id}/copy${listQuery ? `?${listQuery}` : ''}`}>Kopie</Link>
          {(invoice.status === 'issued' || invoice.status === 'overdue') && (
            <button type="button" className="secondary" onClick={onMarkPaid}>
              Označit jako uhrazené
            </button>
          )}
        </div>

        <div className="summary-grid">
          <p>
            <strong>Stav:</strong> {statusLabel(invoice.status)}
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
        </div>

        <h2>Odběratel</h2>
        <p>{invoice.customerName}</p>
        <p>{invoice.customerStreet}</p>
        <p>
          {invoice.customerPostalCode} {invoice.customerCity}, {invoice.customerCountryCode}
        </p>

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

        <div className="totals-box">
          <p>Bez DPH: {formatMoney(invoice.totalWithoutVat)}</p>
          <p>DPH: {formatMoney(invoice.totalVat)}</p>
          <p>
            <strong>Celkem: {formatMoney(invoice.totalWithVat)}</strong>
          </p>
        </div>
      </section>
    </main>
  );
}
