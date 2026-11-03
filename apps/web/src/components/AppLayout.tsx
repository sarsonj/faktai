import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ChartLine,
  ChevronsUpDown,
  FileText,
  Inbox,
  KeyRound,
  LogOut,
  Menu,
  Settings,
  X,
  type LucideIcon,
} from 'lucide-react';
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
import { cn } from '@/lib/utils';

type NavItem = { to: string; label: string; icon: LucideIcon };

const NAV_SECTIONS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Doklady',
    items: [
      { to: '/invoices', label: 'Vydané faktury', icon: FileText },
      { to: '/received', label: 'Přijaté doklady', icon: Inbox },
    ],
  },
  {
    title: 'Daně',
    items: [{ to: '/tax-reports', label: 'DPH podklady', icon: ChartLine }],
  },
];

const SETTINGS_ITEMS: NavItem[] = [
  { to: '/settings/subject', label: 'Nastavení subjektu', icon: Settings },
  { to: '/settings/api', label: 'API klíč', icon: KeyRound },
];

function SidebarLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm no-underline transition-colors',
          isActive
            ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground',
        )
      }
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {item.label}
    </NavLink>
  );
}

function initialsOf(email: string | undefined): string {
  const local = (email ?? '').split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : local.slice(0, 2);
  return (letters || 'U').toUpperCase();
}

export function AppLayout() {
  const { me, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Mobilní menu je otevřené jen na cestě, kde bylo otevřeno – po navigaci se zavře.
  const [mobileOpenPath, setMobileOpenPath] = useState<string | null>(null);
  const mobileOpen = mobileOpenPath === location.pathname;
  const closeMobile = () => setMobileOpenPath(null);

  const onLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground lg:flex-row">
      <aside
       
        className="flex flex-col border-b border-sidebar-border bg-sidebar lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-5 lg:pt-5 lg:pb-4">
          <Link to="/invoices" className="flex items-center gap-2.5 text-foreground no-underline">
            <img src="/branding/faktai-mark.png" alt="" className="size-7" />
            <span className="text-base font-bold tracking-tight">{APP_SHORT_NAME}</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={mobileOpen ? 'Zavřít menu' : 'Otevřít menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpenPath(mobileOpen ? null : location.pathname)}
          >
            {mobileOpen ? <X /> : <Menu />}
          </Button>
        </div>

        <nav
          aria-label="Hlavní menu"
          className={cn('flex-1 flex-col gap-5 px-3 pb-4 lg:flex', mobileOpen ? 'flex' : 'hidden')}
        >
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="flex flex-col gap-0.5">
              <span className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                {section.title}
              </span>
              {section.items.map((item) => (
                <SidebarLink key={item.to} item={item} onNavigate={closeMobile} />
              ))}
            </div>
          ))}

          <div className="mt-auto flex flex-col gap-0.5">
            {SETTINGS_ITEMS.map((item) => (
              <SidebarLink key={item.to} item={item} onNavigate={closeMobile} />
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="mt-2 flex w-full items-center gap-2.5 rounded-lg border-t border-sidebar-border px-2.5 pt-3 pb-1 text-left hover:bg-sidebar-accent/60"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {initialsOf(me?.email)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{me?.email}</span>
                  <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-60">
                <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{me?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void onLogout()}>
                  <LogOut />
                  Odhlásit
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto w-full max-w-[1080px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
