import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

export function InvoiceCopyPage() {
  const navigate = useNavigate();
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!invoiceId) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.set('copyFrom', invoiceId);
    navigate(`/invoices/new?${next.toString()}`, { replace: true });
  }, [invoiceId, navigate, searchParams]);

  return (
    <section className="card">
      <p>Připravuji kopii faktury...</p>
    </section>
  );
}
