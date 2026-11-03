import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Drobečková navigace / nadpis nad titulkem. */
  eyebrow?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow && <div className="text-sm text-muted-foreground">{eyebrow}</div>}
        <h1 className="m-0 text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="m-0 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
