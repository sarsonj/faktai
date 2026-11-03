import { useState } from 'react';
import { Building2, Loader2, Search } from 'lucide-react';
import { searchRegistryCompanies } from '../../registry-api';
import type { RegistryCompanyResult } from '../../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { EditorState } from './editor-state';
import { Field } from '../../components/app/Field';

type CustomerFields = Pick<
  EditorState,
  | 'customerName'
  | 'customerIco'
  | 'customerDic'
  | 'customerStreet'
  | 'customerCity'
  | 'customerPostalCode'
  | 'customerCountryCode'
>;

export function CustomerSection({
  value,
  readOnly,
  onChange,
}: {
  value: CustomerFields;
  readOnly: boolean;
  onChange: (patch: Partial<CustomerFields>) => void;
}) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<RegistryCompanyResult[]>([]);

  const onLookup = async () => {
    const term = query.trim() || value.customerIco || value.customerName;
    if (!term) {
      setMessage('Zadejte IČO nebo název odběratele.');
      return;
    }
    setLoading(true);
    setMessage(null);
    setResults([]);
    try {
      const items = await searchRegistryCompanies(term);
      setResults(items);
      if (items.length === 0) setMessage('Žádný záznam nebyl nalezen.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Vyhledání odběratele selhalo.');
    } finally {
      setLoading(false);
    }
  };

  const apply = (item: RegistryCompanyResult) => {
    onChange({
      customerName: item.name || value.customerName,
      customerIco: item.ico || value.customerIco,
      customerDic: item.dic ?? '',
      customerStreet: item.street || value.customerStreet,
      customerCity: item.city || value.customerCity,
      customerPostalCode: item.postalCode || value.customerPostalCode,
      customerCountryCode: item.countryCode || value.customerCountryCode,
    });
    setResults([]);
    setMessage(null);
    setQuery('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Odběratel</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {!readOnly && (
          <div className="flex flex-col gap-2">
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void onLookup();
              }}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  aria-label="Vyhledat odběratele v ARES"
                  placeholder="Vyhledat v ARES podle IČO nebo názvu"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit" variant="secondary" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : null}
                Vyhledat
              </Button>
            </form>
            {message && <p className="m-0 text-sm text-muted-foreground">{message}</p>}
            {results.length > 0 && (
              <ul className="m-0 flex list-none flex-col divide-y rounded-lg border p-0">
                {results.map((item) => (
                  <li key={`${item.ico}-${item.name}`}>
                    <button
                      type="button"
                      onClick={() => apply(item)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent"
                    >
                      <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.name}</span>
                        <span className="block truncate text-muted-foreground">
                          IČO {item.ico}
                          {item.city ? ` · ${item.city}` : ''}
                        </span>
                      </span>
                      <span className="text-primary">Použít</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <Field id="customer-name" label="Název / jméno" className="sm:col-span-6">
            <Input
              id="customer-name"
              required
              disabled={readOnly}
              value={value.customerName}
              onChange={(event) => onChange({ customerName: event.target.value })}
            />
          </Field>
          <Field id="customer-ico" label="IČO" className="sm:col-span-3">
            <Input
              id="customer-ico"
              disabled={readOnly}
              inputMode="numeric"
              value={value.customerIco}
              onChange={(event) => onChange({ customerIco: event.target.value.replace(/\s+/g, '') })}
            />
          </Field>
          <Field id="customer-dic" label="DIČ" className="sm:col-span-3">
            <Input
              id="customer-dic"
              disabled={readOnly}
              value={value.customerDic}
              onChange={(event) => onChange({ customerDic: event.target.value })}
            />
          </Field>
          <Field id="customer-street" label="Ulice a číslo" className="sm:col-span-6">
            <Input
              id="customer-street"
              required
              disabled={readOnly}
              value={value.customerStreet}
              onChange={(event) => onChange({ customerStreet: event.target.value })}
            />
          </Field>
          <Field id="customer-city" label="Město" className="sm:col-span-3">
            <Input
              id="customer-city"
              required
              disabled={readOnly}
              value={value.customerCity}
              onChange={(event) => onChange({ customerCity: event.target.value })}
            />
          </Field>
          <Field id="customer-zip" label="PSČ" className="sm:col-span-2">
            <Input
              id="customer-zip"
              required
              disabled={readOnly}
              inputMode="numeric"
              value={value.customerPostalCode}
              onChange={(event) => onChange({ customerPostalCode: event.target.value.replace(/\s+/g, '') })}
            />
          </Field>
          <Field id="customer-country" label="Země" className="sm:col-span-1">
            <Input
              id="customer-country"
              required
              disabled={readOnly}
              maxLength={2}
              value={value.customerCountryCode}
              onChange={(event) =>
                onChange({ customerCountryCode: event.target.value.replace(/\s+/g, '').toUpperCase() })
              }
            />
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}
