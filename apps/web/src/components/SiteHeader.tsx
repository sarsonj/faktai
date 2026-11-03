import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../auth/auth-context';
import { APP_SHORT_NAME } from '../brand';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type SiteHeaderProps = {
  showGuestActions?: boolean;
};

/** Hlavička veřejných stránek (landing, přihlášení, onboarding). */
export function SiteHeader({ showGuestActions = true }: SiteHeaderProps) {
  const { me, loading, logout } = useAuth();
  const navigate = useNavigate();
  const homeTarget = !me ? '/' : me.hasSubject ? '/invoices' : '/onboarding/subject';

  return (
    <header className="flex items-center justify-between gap-4 py-4">
      <Link to={homeTarget} className="flex items-center gap-2.5 text-foreground no-underline">
        <img src="/branding/faktai-mark.png" alt="" className="size-8" />
        <span className="text-lg font-bold tracking-tight">{APP_SHORT_NAME}</span>
      </Link>

      {!loading && !me && showGuestActions && (
        <div className="flex gap-2">
          <Button variant="ghost" asChild>
            <Link to="/auth/login" className="no-underline">
              Přihlášení
            </Link>
          </Button>
          <Button asChild>
            <Link to="/onboarding/start" className="no-underline">
              Vytvořit účet
            </Link>
          </Button>
        </div>
      )}

      {!loading && me && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="max-w-64">
              <span className="truncate">{me.email}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{me.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                void logout().finally(() => navigate('/', { replace: true }));
              }}
            >
              <LogOut />
              Odhlásit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
