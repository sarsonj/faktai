import { Link } from 'react-router-dom';
import { PublicLayout } from '../components/PublicLayout';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <PublicLayout width="narrow">
      <div className="flex flex-col items-start gap-3 py-12">
        <p className="m-0 text-sm font-semibold text-primary">404</p>
        <h1 className="m-0 text-3xl font-bold tracking-tight">Stránka nebyla nalezena</h1>
        <p className="m-0 text-muted-foreground">Odkaz je neplatný nebo stránka už neexistuje.</p>
        <Button asChild className="mt-2">
          <Link to="/invoices" className="no-underline">
            Zpět na faktury
          </Link>
        </Button>
      </div>
    </PublicLayout>
  );
}
