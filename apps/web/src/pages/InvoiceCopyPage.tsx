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
    <p data-ui className="text-muted-foreground">
      Připravuji kopii faktury…
    </p>
  );
}
