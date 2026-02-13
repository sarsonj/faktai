import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { searchRegistryAddresses, searchRegistryCompanies } from '../registry-api';
import type {
  RegistryAddressResult,
  RegistryCompanyResult,
  SubjectInput,
  SubjectProfile,
} from '../types';

type SubjectFormProps = {
  initial?: SubjectProfile;
  submitLabel: string;
  loading?: boolean;
  onSubmit: (payload: SubjectInput) => Promise<void>;
};

type FormState = {
  firstName: string;
  lastName: string;
  businessName: string;
  ico: string;
  dic: string;
  isVatPayer: boolean;
  vatRegistrationDate: string;
  street: string;
  city: string;
  postalCode: string;
  countryCode: string;
  bankAccountPrefix: string;
  bankAccountNumber: string;
  bankCode: string;
  defaultVariableSymbolType: 'ico' | 'custom';
  defaultVariableSymbolValue: string;
  defaultDueDays: string;
};

function normalizeIco(value: string): string {
  return value.replace(/\s+/g, '');
}

function normalizePostalCode(value: string): string {
  return value.replace(/\s+/g, '');
}

function normalizeCountryCode(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

function toInitialState(initial?: SubjectProfile): FormState {
  return {
    firstName: initial?.firstName ?? '',
    lastName: initial?.lastName ?? '',
    businessName: initial?.businessName ?? '',
    ico: initial?.ico ?? '',
    dic: initial?.dic ?? '',
    isVatPayer: initial?.isVatPayer ?? false,
    vatRegistrationDate: initial?.vatRegistrationDate?.slice(0, 10) ?? '',
    street: initial?.street ?? '',
    city: initial?.city ?? '',
    postalCode: initial?.postalCode ?? '',
    countryCode: initial?.countryCode ?? 'CZ',
    bankAccountPrefix: initial?.bankAccountPrefix ?? '',
    bankAccountNumber: initial?.bankAccountNumber ?? '',
    bankCode: initial?.bankCode ?? '',
    defaultVariableSymbolType: initial?.defaultVariableSymbolType ?? 'ico',
    defaultVariableSymbolValue: initial?.defaultVariableSymbolValue ?? '',
    defaultDueDays: String(initial?.defaultDueDays ?? 14),
  };
}

function formatCompanyResult(item: RegistryCompanyResult): string {
  const location = [item.city, item.postalCode].filter(Boolean).join(', ');
  return [item.name, `IČO ${item.ico}`, location].filter(Boolean).join(' | ');
}

function formatAddressResult(item: RegistryAddressResult): string {
  const basic = [item.street, item.city, item.postalCode].filter(Boolean).join(', ');
  return basic || item.displayName;
}

export function SubjectForm({ initial, submitLabel, loading = false, onSubmit }: SubjectFormProps) {
  const [state, setState] = useState<FormState>(toInitialState(initial));
  const [error, setError] = useState<string | null>(null);

  const [companyQuery, setCompanyQuery] = useState('');
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companyResults, setCompanyResults] = useState<RegistryCompanyResult[]>([]);

  const [addressQuery, setAddressQuery] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressResults, setAddressResults] = useState<RegistryAddressResult[]>([]);

  useEffect(() => {
    setState(toInitialState(initial));
  }, [initial]);

  const isCustomVs = state.defaultVariableSymbolType === 'custom';

  const payload = useMemo<SubjectInput>(() => {
    return {
      firstName: state.firstName,
      lastName: state.lastName,
      businessName: state.businessName || undefined,
      ico: state.ico,
      dic: state.dic || undefined,
      isVatPayer: state.isVatPayer,
      vatRegistrationDate: state.vatRegistrationDate || undefined,
      street: state.street,
      city: state.city,
      postalCode: state.postalCode,
      countryCode: state.countryCode,
      bankAccountPrefix: state.bankAccountPrefix || undefined,
      bankAccountNumber: state.bankAccountNumber,
      bankCode: state.bankCode,
      defaultVariableSymbolType: state.defaultVariableSymbolType,
      defaultVariableSymbolValue: state.defaultVariableSymbolValue || undefined,
      defaultDueDays: Number(state.defaultDueDays),
    };
  }, [state]);

  const applyCompanyResult = (item: RegistryCompanyResult) => {
    setState((current) => ({
      ...current,
      businessName: item.name || current.businessName,
      ico: item.ico || current.ico,
      dic: item.dic ?? '',
      street: item.street || current.street,
      city: item.city || current.city,
      postalCode: item.postalCode || current.postalCode,
      countryCode: item.countryCode || current.countryCode,
    }));
    setCompanyResults([]);
    setCompanyError(null);
  };

  const applyAddressResult = (item: RegistryAddressResult) => {
    setState((current) => ({
      ...current,
      street: item.street || current.street,
      city: item.city || current.city,
      postalCode: item.postalCode || current.postalCode,
      countryCode: item.countryCode || current.countryCode,
    }));
    setAddressResults([]);
    setAddressError(null);
  };

  const handleCompanySearch = async () => {
    const query = companyQuery.trim() || state.ico;
    if (!query) {
      setCompanyError('Zadejte IČO nebo název firmy.');
      return;
    }

    setCompanyLoading(true);
    setCompanyError(null);
    setCompanyResults([]);

    try {
      const items = await searchRegistryCompanies(query);
      setCompanyResults(items);
      if (items.length === 0) {
        setCompanyError('Žádný záznam v registru nebyl nalezen.');
      }
    } catch (err) {
      setCompanyError(err instanceof Error ? err.message : 'Vyhledání v registru selhalo.');
    } finally {
      setCompanyLoading(false);
    }
  };

  const handleAddressSearch = async () => {
    const query = addressQuery.trim() || [state.street, state.city].filter(Boolean).join(' ');
    if (query.trim().length < 3) {
      setAddressError('Zadejte alespoň 3 znaky pro vyhledání adresy.');
      return;
    }

    setAddressLoading(true);
    setAddressError(null);
    setAddressResults([]);

    try {
      const items = await searchRegistryAddresses(query);
      setAddressResults(items);
      if (items.length === 0) {
        setAddressError('Adresa nebyla nalezena.');
      }
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : 'Vyhledání adresy selhalo.');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uložení selhalo.');
    }
  };

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <section className="lookup-box">
        <h3>Načíst firmu z ARES</h3>
        <div className="lookup-controls">
          <input
            placeholder="IČO nebo název firmy"
            value={companyQuery}
            onChange={(event) => setCompanyQuery(event.target.value)}
          />
          <button type="button" className="secondary" disabled={companyLoading || loading} onClick={handleCompanySearch}>
            {companyLoading ? 'Načítám...' : 'Vyhledat'}
          </button>
        </div>
        {companyError && <p className="error">{companyError}</p>}
        {companyResults.length > 0 && (
          <ul className="lookup-results">
            {companyResults.map((item) => (
              <li key={`${item.ico}-${item.name}`}>
                <button type="button" className="secondary" onClick={() => applyCompanyResult(item)}>
                  Použít
                </button>
                <span>{formatCompanyResult(item)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="lookup-box">
        <h3>Načíst adresu</h3>
        <div className="lookup-controls">
          <input
            placeholder="Ulice a číslo"
            value={addressQuery}
            onChange={(event) => setAddressQuery(event.target.value)}
          />
          <button type="button" className="secondary" disabled={addressLoading || loading} onClick={handleAddressSearch}>
            {addressLoading ? 'Načítám...' : 'Vyhledat adresu'}
          </button>
        </div>
        {addressError && <p className="error">{addressError}</p>}
        {addressResults.length > 0 && (
          <ul className="lookup-results">
            {addressResults.map((item) => (
              <li key={item.id}>
                <button type="button" className="secondary" onClick={() => applyAddressResult(item)}>
                  Použít
                </button>
                <span>{formatAddressResult(item)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <label>
        Jméno
        <input
          value={state.firstName}
          onChange={(event) => setState((current) => ({ ...current, firstName: event.target.value }))}
          required
        />
      </label>
      <label>
        Příjmení
        <input
          value={state.lastName}
          onChange={(event) => setState((current) => ({ ...current, lastName: event.target.value }))}
          required
        />
      </label>
      <label>
        Obchodní název
        <input
          value={state.businessName}
          onChange={(event) => setState((current) => ({ ...current, businessName: event.target.value }))}
        />
      </label>
      <label>
        IČO
        <input
          value={state.ico}
          onChange={(event) =>
            setState((current) => ({ ...current, ico: normalizeIco(event.target.value) }))
          }
          required
        />
      </label>
      <label>
        Plátce DPH
        <input
          checked={state.isVatPayer}
          onChange={(event) => setState((current) => ({ ...current, isVatPayer: event.target.checked }))}
          type="checkbox"
        />
      </label>
      <label>
        DIČ
        <input
          disabled={!state.isVatPayer}
          value={state.dic}
          onChange={(event) => setState((current) => ({ ...current, dic: event.target.value }))}
        />
      </label>
      <label>
        Datum registrace DPH
        <input
          disabled={!state.isVatPayer}
          value={state.vatRegistrationDate}
          onChange={(event) =>
            setState((current) => ({ ...current, vatRegistrationDate: event.target.value }))
          }
          type="date"
        />
      </label>
      <label>
        Ulice
        <input
          value={state.street}
          onChange={(event) => setState((current) => ({ ...current, street: event.target.value }))}
          required
        />
      </label>
      <label>
        Město
        <input
          value={state.city}
          onChange={(event) => setState((current) => ({ ...current, city: event.target.value }))}
          required
        />
      </label>
      <label>
        PSČ
        <input
          value={state.postalCode}
          onChange={(event) =>
            setState((current) => ({ ...current, postalCode: normalizePostalCode(event.target.value) }))
          }
          required
        />
      </label>
      <label>
        Země
        <input
          value={state.countryCode}
          onChange={(event) =>
            setState((current) => ({ ...current, countryCode: normalizeCountryCode(event.target.value) }))
          }
          required
        />
      </label>
      <label>
        Prefix účtu
        <input
          value={state.bankAccountPrefix}
          onChange={(event) =>
            setState((current) => ({ ...current, bankAccountPrefix: event.target.value }))
          }
        />
      </label>
      <label>
        Číslo účtu
        <input
          value={state.bankAccountNumber}
          onChange={(event) =>
            setState((current) => ({ ...current, bankAccountNumber: event.target.value }))
          }
          required
        />
      </label>
      <label>
        Kód banky
        <input
          value={state.bankCode}
          onChange={(event) => setState((current) => ({ ...current, bankCode: event.target.value }))}
          required
        />
      </label>
      <label>
        Strategie VS
        <select
          value={state.defaultVariableSymbolType}
          onChange={(event) =>
            setState((current) => ({
              ...current,
              defaultVariableSymbolType: event.target.value as 'ico' | 'custom',
            }))
          }
        >
          <option value="ico">Použít IČO</option>
          <option value="custom">Vlastní</option>
        </select>
      </label>
      <label>
        Výchozí VS
        <input
          disabled={!isCustomVs}
          value={state.defaultVariableSymbolValue}
          onChange={(event) =>
            setState((current) => ({ ...current, defaultVariableSymbolValue: event.target.value }))
          }
          required={isCustomVs}
        />
      </label>
      <label>
        Splatnost (dny)
        <input
          value={state.defaultDueDays}
          onChange={(event) => setState((current) => ({ ...current, defaultDueDays: event.target.value }))}
          required
          type="number"
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button disabled={loading} type="submit">
        {loading ? 'Ukládám...' : submitLabel}
      </button>
    </form>
  );
}
