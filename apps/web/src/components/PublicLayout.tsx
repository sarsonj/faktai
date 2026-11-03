import type { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';
import { cn } from '@/lib/utils';

/** Rámec veřejných stránek: hlavička + centrovaný obsah. */
export function PublicLayout({
  children,
  showGuestActions = true,
  width = 'default',
}: {
  children: ReactNode;
  showGuestActions?: boolean;
  width?: 'default' | 'narrow' | 'wide';
}) {
  return (
    <div className="min-h-screen bg-background">
      <div
        className={cn(
          'mx-auto w-full px-4 pb-16 sm:px-6',
          width === 'narrow' ? 'max-w-2xl' : width === 'wide' ? 'max-w-6xl' : 'max-w-4xl',
        )}
      >
        <SiteHeader showGuestActions={showGuestActions} />
        <main className="pt-4 sm:pt-8">{children}</main>
      </div>
    </div>
  );
}
