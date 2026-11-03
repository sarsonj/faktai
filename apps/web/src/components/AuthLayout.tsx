import { Check } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { APP_TAGLINE } from '../brand';
import { LANDING_HIGHLIGHTS } from '../landing-copy';
import { PublicLayout } from './PublicLayout';
import { Card, CardContent } from '@/components/ui/card';

export function AuthLayout() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/auth/login';

  return (
    <PublicLayout showGuestActions={false}>
      <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
        <div className="hidden flex-col gap-5 md:flex">
          <h1 className="m-0 text-3xl font-bold tracking-tight">{APP_TAGLINE}</h1>
          <p className="m-0 text-muted-foreground">
            Faktury, PDF s QR platbou a XML podklady pro DPH na jednom místě.
          </p>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {LANDING_HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-3 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                {item.title}
              </li>
            ))}
          </ul>
        </div>
        <Card>
          <CardContent className="flex flex-col gap-6">
            <Outlet />
            <p className="m-0 border-t pt-4 text-center text-sm text-muted-foreground">
              {!isLoginPage && (
                <>
                  <Link to="/auth/login">Přihlášení</Link>
                  {' · '}
                </>
              )}
              Nemáte účet? <Link to="/onboarding/start">Vytvořit účet</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
