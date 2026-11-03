import { useState, type ReactNode } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Vyhledání v registru (ARES / adresy) s výběrem výsledku. */
export function RegistryLookup<T>({
  label,
  placeholder,
  minLength = 1,
  emptyMessage,
  fallbackQuery,
  search,
  renderResult,
  resultKey,
  onSelect,
}: {
  label: string;
  placeholder: string;
  minLength?: number;
  emptyMessage: string;
  fallbackQuery?: string;
  search: (query: string) => Promise<T[]>;
  renderResult: (item: T) => ReactNode;
  resultKey: (item: T) => string;
  onSelect: (item: T) => void;
}) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<T[]>([]);

  const run = async () => {
    const term = (query.trim() || fallbackQuery || '').trim();
    if (term.length < minLength) {
      setMessage(minLength > 1 ? `Zadejte alespoň ${minLength} znaky.` : 'Zadejte hledaný výraz.');
      return;
    }
    setLoading(true);
    setMessage(null);
    setResults([]);
    try {
      const items = await search(term);
      setResults(items);
      if (items.length === 0) setMessage(emptyMessage);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Vyhledání selhalo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label={label}
            placeholder={placeholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void run();
              }
            }}
            className="pl-9"
          />
        </div>
        <Button type="button" variant="secondary" disabled={loading} onClick={() => void run()}>
          {loading && <Loader2 className="animate-spin" />}
          Vyhledat
        </Button>
      </div>
      {message && <p className="m-0 text-sm text-muted-foreground">{message}</p>}
      {results.length > 0 && (
        <ul className="m-0 flex list-none flex-col divide-y rounded-lg border p-0">
          {results.map((item) => (
            <li key={resultKey(item)}>
              <button
                type="button"
                onClick={() => {
                  onSelect(item);
                  setResults([]);
                  setMessage(null);
                  setQuery('');
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent"
              >
                <span className="min-w-0 flex-1">{renderResult(item)}</span>
                <span className="text-primary">Použít</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
