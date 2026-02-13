import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { copyInvoice } from '../invoice-api';

export function InvoiceCopyPage() {
  const navigate = useNavigate();
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) {
      return;
    }

    const run = async () => {
      try {
        const copied = await copyInvoice(invoiceId);
        const query = searchParams.toString();
        navigate(`/invoices/${copied.id}/edit${query ? `?${query}` : ''}`, { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Vytvoření kopie selhalo');
      }
    };

    void run();
  }, [invoiceId, navigate, searchParams]);

  return (
    <section className="card">
      {error ? <p className="error">{error}</p> : <p>Vytvářím kopii faktury...</p>}
    </section>
  );
}
