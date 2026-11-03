import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** Popisek + ovládací prvek + volitelná nápověda. */
export function Field({
  id,
  label,
  hint,
  className,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="m-0 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
