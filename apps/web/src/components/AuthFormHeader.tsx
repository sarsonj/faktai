export function AuthFormHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="m-0 text-xl font-semibold tracking-tight">{title}</h2>
      <p className="m-0 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
