import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  createInvoice,
  getInvoice,
  issueInvoice,
  reserveInvoiceNumber,
  updateInvoice,
} from '../invoice-api';
import { searchRegistryCompanies } from '../registry-api';
import { getSubject } from '../subject-api';
import type {
  InvoiceDetail,
  InvoiceItemInput,
  InvoiceUpsertInput,
  RegistryCompanyResult,
  TaxClassification,
} from '../types';

type InvoiceEditorMode = 'create' | 'edit';

type InvoiceEditorPageProps = {
  mode: InvoiceEditorMode;
};

type EditorItemState = {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  vatRate: number;
};

type EditorState = {
  invoiceNumber: string;
  variableSymbol: string;
  issueDate: string;
  taxableSupplyDate: string;
  dueDate: string;
  taxClassification: TaxClassification;
  customerName: string;
  customerIco: string;
  customerDic: string;
  customerStreet: string;
  customerCity: string;
  customerPostalCode: string;
  customerCountryCode: string;
  note: string;
  items: EditorItemState[];
};

const TAX_CLASSIFICATIONS: Array<{ value: TaxClassification; label: string }> = [
  { value: 'domestic_standard', label: 'Tuzemské zdanitelné plnění' },
  { value: 'domestic_reverse_charge', label: 'Tuzemské reverse charge' },
  { value: 'eu_service', label: 'Služba do EU' },
  { value: 'eu_goods', label: 'Dodání zboží do EU' },
  { value: 'export_third_country', label: 'Export mimo EU' },
  { value: 'exempt_without_credit', label: 'Osvobozené bez nároku' },
];

function toDateInputValue(value: string): string {
  return value.slice(0, 10);
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function createEmptyItem(): EditorItemState {
  return {
    description: '',
    quantity: '1',
    unit: 'ks',
    unitPrice: '0.00',
    vatRate: 21,
  };
}

function normalizeIco(value: string): string {
  return value.replace(/\s+/g, '');
}

function createDefaultState(defaultDueDays = 14): EditorState {
  const issueDate = new Date();
  issueDate.setHours(0, 0, 0, 0);

  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + defaultDueDays);

  return {
    invoiceNumber: '',
    variableSymbol: '',
    issueDate: formatDate(issueDate),
    taxableSupplyDate: formatDate(issueDate),
    dueDate: formatDate(dueDate),
    taxClassification: 'domestic_standard',
    customerName: '',
    customerIco: '',
    customerDic: '',
    customerStreet: '',
    customerCity: '',
    customerPostalCode: '',
    customerCountryCode: 'CZ',
    note: '',
    items: [createEmptyItem()],
  };
}

function fromInvoice(invoice: InvoiceDetail): EditorState {
  return {
    invoiceNumber: invoice.invoiceNumber ?? '',
    variableSymbol: invoice.variableSymbol,
    issueDate: toDateInputValue(invoice.issueDate),
    taxableSupplyDate: toDateInputValue(invoice.taxableSupplyDate),
    dueDate: toDateInputValue(invoice.dueDate),
    taxClassification: invoice.taxClassification ?? 'domestic_standard',
    customerName: invoice.customerName,
    customerIco: invoice.customerIco ?? '',
    customerDic: invoice.customerDic ?? '',
    customerStreet: invoice.customerStreet,
    customerCity: invoice.customerCity,
    customerPostalCode: invoice.customerPostalCode,
    customerCountryCode: invoice.customerCountryCode,
    note: invoice.note ?? '',
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
    })),
  };
}

function createStateFromCopySource(
  source: InvoiceDetail,
  defaultDueDays: number,
): EditorState {
  const base = createDefaultState(defaultDueDays);

  const dueDate = new Date(base.issueDate);
  dueDate.setDate(dueDate.getDate() + defaultDueDays);

  return {
    ...base,
    invoiceNumber: '',
    variableSymbol: '',
    issueDate: base.issueDate,
    taxableSupplyDate: base.issueDate,
    dueDate: formatDate(dueDate),
    taxClassification: source.taxClassification ?? base.taxClassification,
    customerName: source.customerName,
    customerIco: source.customerIco ?? '',
    customerDic: source.customerDic ?? '',
    customerStreet: source.customerStreet,
    customerCity: source.customerCity,
    customerPostalCode: source.customerPostalCode,
    customerCountryCode: source.customerCountryCode,
    note: source.note ?? '',
    items:
      source.items.length > 0
        ? source.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            vatRate: item.vatRate,
          }))
        : [createEmptyItem()],
  };
}

function toPayload(state: EditorState): InvoiceUpsertInput {
  return {
    invoiceNumber: state.invoiceNumber || undefined,
    variableSymbol: state.variableSymbol || undefined,
    issueDate: state.issueDate,
    taxableSupplyDate: state.taxableSupplyDate,
    dueDate: state.dueDate,
    taxClassification: state.taxClassification,
    customerName: state.customerName,
    customerIco: state.customerIco || undefined,
    customerDic: state.customerDic || undefined,
    customerStreet: state.customerStreet,
    customerCity: state.customerCity,
    customerPostalCode: state.customerPostalCode,
    customerCountryCode: state.customerCountryCode,
    note: state.note || undefined,
    items: state.items.map<InvoiceItemInput>((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      vatRate: Number(item.vatRate),
    })),
  };
}

function calculateTotals(items: EditorItemState[]) {
  let withoutVat = 0;
  let vat = 0;

  for (const item of items) {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);
    const lineWithout = quantity * unitPrice;
    const lineVat = lineWithout * (Number(item.vatRate) / 100);

    withoutVat += lineWithout;
    vat += lineVat;
  }

  return {
    withoutVat,
    vat,
    withVat: withoutVat + vat,
  };
}

function calculateItemTotalWithVat(item: EditorItemState): number {
  const quantity = Number(item.quantity || 0);
  const unitPrice = Number(item.unitPrice || 0);
  const vatRate = Number(item.vatRate || 0);
  const lineWithoutVat = quantity * unitPrice;
  const lineVat = lineWithoutVat * (vatRate / 100);
  const total = lineWithoutVat + lineVat;
  return Number.isFinite(total) ? total : 0;
}

function formatMoney(value: number): string {
  return `${value.toLocaleString('cs-CZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} Kč`;
}

export function InvoiceEditorPage({ mode }: InvoiceEditorPageProps) {
  const navigate = useNavigate();
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [searchParams] = useSearchParams();
  const copyFromInvoiceId = mode === 'create' ? searchParams.get('copyFrom') : null;

  const [state, setState] = useState<EditorState>(() => createDefaultState());
  const [reservingNumber, setReservingNumber] = useState(mode === 'create');
  const [useCustomInvoiceNumber, setUseCustomInvoiceNumber] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [customerLookupQuery, setCustomerLookupQuery] = useState('');
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [customerLookupError, setCustomerLookupError] = useState<string | null>(null);
  const [customerLookupResults, setCustomerLookupResults] = useState<RegistryCompanyResult[]>([]);
  const reserveRequestIdRef = useRef(0);
  const customInvoiceNumberModeRef = useRef(useCustomInvoiceNumber);

  useEffect(() => {
    customInvoiceNumberModeRef.current = useCustomInvoiceNumber;
  }, [useCustomInvoiceNumber]);

  const reserveNumberForDate = useCallback(async (issueDate: string, force = false) => {
    if (mode !== 'create') {
      return;
    }
    if (customInvoiceNumberModeRef.current && !force) {
      return;
    }

    const requestId = reserveRequestIdRef.current + 1;
    reserveRequestIdRef.current = requestId;
    setReservingNumber(true);

    try {
      const { invoiceNumber } = await reserveInvoiceNumber(issueDate);
      setState((current) => {
        if (requestId !== reserveRequestIdRef.current) {
          return current;
        }
        if (customInvoiceNumberModeRef.current && !force) {
          return current;
        }

        const shouldSyncVariableSymbol =
          current.variableSymbol === '' || current.variableSymbol === current.invoiceNumber;

        return {
          ...current,
          invoiceNumber,
          variableSymbol: shouldSyncVariableSymbol ? invoiceNumber : current.variableSymbol,
        };
      });
    } catch (err) {
      if (requestId === reserveRequestIdRef.current) {
        setError(err instanceof Error ? err.message : 'Přidělení čísla faktury selhalo');
      }
    } finally {
      if (requestId === reserveRequestIdRef.current) {
        setReservingNumber(false);
      }
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'create') {
      return;
    }

    const run = async () => {
      try {
        const subject = await getSubject();
        let nextState = createDefaultState(subject.defaultDueDays);

        if (copyFromInvoiceId) {
          const source = await getInvoice(copyFromInvoiceId);
          nextState = createStateFromCopySource(source, subject.defaultDueDays);
        }

        setState(nextState);
        await reserveNumberForDate(nextState.issueDate, true);
      } catch {
        // Defaults stay client-side if subject fetch fails.
        await reserveNumberForDate(createDefaultState().issueDate);
      }
    };

    void run();
  }, [copyFromInvoiceId, mode, reserveNumberForDate]);

  useEffect(() => {
    if (mode !== 'edit' || !invoiceId) {
      return;
    }

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const payload = await getInvoice(invoiceId);
        setInvoice(payload);
        setState(fromInvoice(payload));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Načtení faktury selhalo');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [mode, invoiceId]);

  const queryForList = new URLSearchParams(searchParams);
  queryForList.delete('advanced');
  queryForList.delete('copyFrom');
  const listQuery = queryForList.toString();
  const backHref = `/invoices${listQuery ? `?${listQuery}` : ''}`;
  const advancedEdit = searchParams.get('advanced') === '1';

  const totals = useMemo(() => calculateTotals(state.items), [state.items]);
  const readOnly =
    mode === 'edit' && invoice?.status === 'paid' && !advancedEdit;

  const onToggleCustomInvoiceNumber = (enabled: boolean) => {
    setUseCustomInvoiceNumber(enabled);

    if (enabled) {
      reserveRequestIdRef.current += 1;
      setReservingNumber(false);
      return;
    }

    void reserveNumberForDate(state.issueDate, true);
  };

  const onCustomInvoiceNumberChange = (value: string) => {
    const nextInvoiceNumber = value;

    setState((current) => {
      const shouldSyncVariableSymbol =
        current.variableSymbol === '' || current.variableSymbol === current.invoiceNumber;
      const canUseInvoiceAsVariableSymbol = /^\d{1,10}$/.test(nextInvoiceNumber);

      return {
        ...current,
        invoiceNumber: nextInvoiceNumber,
        variableSymbol:
          shouldSyncVariableSymbol && canUseInvoiceAsVariableSymbol
            ? nextInvoiceNumber
            : current.variableSymbol,
      };
    });
  };

  const updateItem = (index: number, patch: Partial<EditorItemState>) => {
    setState((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  };

  const addItem = () => {
    setState((current) => ({
      ...current,
      items: [...current.items, createEmptyItem()],
    }));
  };

  const removeItem = (index: number) => {
    setState((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const persistDraft = async (): Promise<InvoiceDetail> => {
    if (mode === 'create' && useCustomInvoiceNumber && state.invoiceNumber.trim().length === 0) {
      throw new Error('Pro vlastní číslo dokladu vyplňte číslo faktury.');
    }

    const payload = toPayload(state);
    if (mode === 'create' && !useCustomInvoiceNumber) {
      const currentInvoiceNumber = state.invoiceNumber.replace(/\s+/g, '');
      const currentVariableSymbol = state.variableSymbol.replace(/\s+/g, '');

      payload.invoiceNumber = undefined;
      if (
        currentVariableSymbol.length === 0 ||
        currentVariableSymbol === currentInvoiceNumber
      ) {
        payload.variableSymbol = undefined;
      }
    }

    if (mode === 'create') {
      const created = await createInvoice(payload);
      setInvoice(created);
      setState(fromInvoice(created));
      return created;
    }

    if (!invoiceId) {
      throw new Error('Chybí identifikátor faktury');
    }

    const updated = await updateInvoice(invoiceId, payload);
    setInvoice(updated);
    setState(fromInvoice(updated));
    return updated;
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const saved = await persistDraft();
      setSuccess(mode === 'create' ? 'Koncept byl uložen.' : 'Faktura byla uložena.');

      if (mode === 'create') {
        navigate(`/invoices/${saved.id}/edit${listQuery ? `?${listQuery}` : ''}`, { replace: true });
      } else {
        navigate(backHref, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uložení faktury selhalo');
    } finally {
      setSaving(false);
    }
  };

  const onIssue = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const saved = await persistDraft();
      await issueInvoice(saved.id);
      navigate(`/invoices/${saved.id}${listQuery ? `?${listQuery}` : ''}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vystavení faktury selhalo');
    } finally {
      setSaving(false);
    }
  };

  const applyCustomerLookup = (item: RegistryCompanyResult) => {
    setState((current) => ({
      ...current,
      customerName: item.name || current.customerName,
      customerIco: item.ico || current.customerIco,
      customerDic: item.dic ?? '',
      customerStreet: item.street || current.customerStreet,
      customerCity: item.city || current.customerCity,
      customerPostalCode: item.postalCode || current.customerPostalCode,
      customerCountryCode: item.countryCode || current.customerCountryCode,
    }));
    setCustomerLookupResults([]);
    setCustomerLookupError(null);
  };

  const onCustomerLookup = async () => {
    const query = customerLookupQuery.trim() || state.customerIco || state.customerName;
    if (!query) {
      setCustomerLookupError('Zadejte IČO nebo název odběratele.');
      return;
    }

    setCustomerLookupLoading(true);
    setCustomerLookupError(null);
    setCustomerLookupResults([]);

    try {
      const items = await searchRegistryCompanies(query);
      setCustomerLookupResults(items);
      if (items.length === 0) {
        setCustomerLookupError('Žádný záznam nebyl nalezen.');
      }
    } catch (err) {
      setCustomerLookupError(err instanceof Error ? err.message : 'Vyhledání odběratele selhalo.');
    } finally {
      setCustomerLookupLoading(false);
    }
  };

  if (loading) {
    return <section className="card card-wide">Načítám fakturu...</section>;
  }

  return (
    <section className="card card-wide">
      <nav className="breadcrumb" aria-label="Drobečková navigace">
        <Link to={backHref}>Vydané faktury</Link>
        <span className="breadcrumb-sep">/</span>
        <span>{mode === 'create' ? 'Nová faktura' : 'Editace dokladu'}</span>
      </nav>

      <header className="page-head">
        <div>
          <p className="page-kicker">Fakturace</p>
          <h1 className="page-title">
            {mode === 'create'
              ? state.invoiceNumber
                ? `Nová faktura ${state.invoiceNumber}`
                : 'Nová faktura'
              : `Editace faktury ${invoice?.invoiceNumber ?? ''}`}
          </h1>
          <p className="page-subtitle">Vyplňte parametry dokladu, odběratele a položky faktury.</p>
          {mode === 'create' && reservingNumber && (
            <small>Přiděluji číslo dokladu...</small>
          )}
          {mode === 'edit' && advancedEdit && invoice?.status === 'paid' && (
            <small>
              Pokročilý režim: upravujete uhrazenou fakturu.
            </small>
          )}
        </div>
        {mode === 'create' && (
          <div className="page-actions">
            <Link className="action-link" to={backHref}>
              Zpět na seznam
            </Link>
          </div>
        )}
      </header>

      {error && <p className="error">{error}</p>}
      {success && <p>{success}</p>}
      <section className="ui-section">
        <h2>Parametry dokladu</h2>
        <div className="form-grid invoice-form-grid">
          <label>
            Variabilní symbol
            <input
              disabled={readOnly}
              value={state.variableSymbol}
              onChange={(event) => {
                const nextVariableSymbol = event.target.value.replace(/\s+/g, '');
                setState((current) => ({ ...current, variableSymbol: nextVariableSymbol }));
              }}
            />
          </label>
          <label>
            Datum vystavení
            <input
              disabled={readOnly}
              type="date"
              value={state.issueDate}
              onChange={(event) => {
                const nextIssueDate = event.target.value;
                const currentYear = state.issueDate.slice(0, 4);
                const nextYear = nextIssueDate.slice(0, 4);

                setState((current) => ({ ...current, issueDate: nextIssueDate }));

                if (mode === 'create' && !useCustomInvoiceNumber && currentYear !== nextYear) {
                  void reserveNumberForDate(nextIssueDate);
                }
              }}
            />
          </label>
          <label>
            Datum zdanitelného plnění
            <input
              disabled={readOnly}
              type="date"
              value={state.taxableSupplyDate}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  taxableSupplyDate: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Datum splatnosti
            <input
              disabled={readOnly}
              type="date"
              value={state.dueDate}
              onChange={(event) => setState((current) => ({ ...current, dueDate: event.target.value }))}
            />
          </label>
          <label>
            Daňová klasifikace
            <select
              disabled={readOnly}
              value={state.taxClassification}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  taxClassification: event.target.value as TaxClassification,
                }))
              }
            >
              {TAX_CLASSIFICATIONS.map((classification) => (
                <option key={classification.value} value={classification.value}>
                  {classification.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {mode === 'create' && (
        <section className="ui-section invoice-advanced-section">
          <details className="advanced-tools">
            <summary className="advanced-tools-summary">Další možnosti (pokročilé)</summary>
            <div className="invoice-editor-advanced-grid">
              <label className="toggle-row">
                <span>Použít vlastní číslo dokladu</span>
                <input
                  type="checkbox"
                  checked={useCustomInvoiceNumber}
                  onChange={(event) => onToggleCustomInvoiceNumber(event.target.checked)}
                />
              </label>

              {useCustomInvoiceNumber && (
                <label>
                  Vlastní číslo dokladu
                  <input
                    value={state.invoiceNumber}
                    onChange={(event) => onCustomInvoiceNumberChange(event.target.value)}
                    placeholder="Např. FV/2025-001"
                  />
                  <small className="helper-text inline">
                    Vlastní číslo je bez formátové validace, kontroluje se jen neprázdnost a unikátnost.
                  </small>
                </label>
              )}
            </div>
          </details>
        </section>
      )}

      <section className="ui-section">
        <h2>Odběratel</h2>
        <div className="lookup-box">
          <h3>Vyhledat odběratele v ARES</h3>
          <div className="lookup-controls">
            <input
              disabled={readOnly}
              placeholder="IČO nebo název firmy"
              value={customerLookupQuery}
              onChange={(event) => setCustomerLookupQuery(event.target.value)}
            />
            <button
              type="button"
              className="secondary"
              disabled={readOnly || customerLookupLoading}
              onClick={onCustomerLookup}
            >
              {customerLookupLoading ? 'Načítám...' : 'Vyhledat'}
            </button>
          </div>
          {customerLookupError && <p className="error">{customerLookupError}</p>}
          {customerLookupResults.length > 0 && (
            <ul className="lookup-results">
              {customerLookupResults.map((item) => (
                <li key={`${item.ico}-${item.name}`}>
                  <button
                    type="button"
                    className="secondary"
                    disabled={readOnly}
                    onClick={() => applyCustomerLookup(item)}
                  >
                    Použít
                  </button>
                  <span>
                    {[item.name, `IČO ${item.ico}`, item.city, item.postalCode]
                      .filter(Boolean)
                      .join(' | ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="form-grid invoice-form-grid">
          <label>
            Název / jméno
            <input
              disabled={readOnly}
              required
              value={state.customerName}
              onChange={(event) => setState((current) => ({ ...current, customerName: event.target.value }))}
            />
          </label>
          <label>
            IČO
            <input
              disabled={readOnly}
              value={state.customerIco}
              onChange={(event) =>
                setState((current) => ({ ...current, customerIco: normalizeIco(event.target.value) }))
              }
            />
          </label>
          <label>
            DIČ
            <input
              disabled={readOnly}
              value={state.customerDic}
              onChange={(event) => setState((current) => ({ ...current, customerDic: event.target.value }))}
            />
          </label>
          <label>
            Ulice
            <input
              disabled={readOnly}
              required
              value={state.customerStreet}
              onChange={(event) => setState((current) => ({ ...current, customerStreet: event.target.value }))}
            />
          </label>
          <label>
            Město
            <input
              disabled={readOnly}
              required
              value={state.customerCity}
              onChange={(event) => setState((current) => ({ ...current, customerCity: event.target.value }))}
            />
          </label>
          <label>
            PSČ
            <input
              disabled={readOnly}
              required
              value={state.customerPostalCode}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  customerPostalCode: event.target.value.replace(/\s+/g, ''),
                }))
              }
            />
          </label>
          <label>
            Země
            <input
              disabled={readOnly}
              required
              value={state.customerCountryCode}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  customerCountryCode: event.target.value.replace(/\s+/g, '').toUpperCase(),
                }))
              }
            />
          </label>
        </div>
      </section>

      <section className="ui-section">
        <div className="ui-section-head">
          <h2>Položky</h2>
          {!readOnly && (
            <button type="button" className="secondary" onClick={addItem}>
              Přidat položku
            </button>
          )}
        </div>
        <p className="helper-text">Počet položek: {state.items.length}</p>
        <div className="invoice-items-list">
          {state.items.map((item, index) => (
            <div className="invoice-item-row" key={index}>
              <input
                aria-label={`Popis položky ${index + 1}`}
                disabled={readOnly}
                placeholder="Popis"
                value={item.description}
                onChange={(event) => updateItem(index, { description: event.target.value })}
              />
              <input
                aria-label={`Množství položky ${index + 1}`}
                disabled={readOnly}
                placeholder="Množství"
                value={item.quantity}
                onChange={(event) => updateItem(index, { quantity: event.target.value })}
              />
              <input
                aria-label={`Jednotka položky ${index + 1}`}
                disabled={readOnly}
                placeholder="Jednotka"
                value={item.unit}
                onChange={(event) => updateItem(index, { unit: event.target.value })}
              />
              <input
                aria-label={`Cena položky ${index + 1}`}
                disabled={readOnly}
                placeholder="Cena"
                value={item.unitPrice}
                onChange={(event) => updateItem(index, { unitPrice: event.target.value })}
              />
              <select
                aria-label={`DPH položky ${index + 1}`}
                disabled={readOnly}
                value={String(item.vatRate)}
                onChange={(event) => updateItem(index, { vatRate: Number(event.target.value) })}
              >
                <option value="0">0 %</option>
                <option value="12">12 %</option>
                <option value="21">21 %</option>
              </select>
              <div className="invoice-item-total">Celkem: {formatMoney(calculateItemTotalWithVat(item))}</div>
              {!readOnly && state.items.length > 1 && (
                <button type="button" className="danger" onClick={() => removeItem(index)}>
                  Odebrat
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="ui-section">
        <label>
          Poznámka
          <textarea
            disabled={readOnly}
            value={state.note}
            onChange={(event) => setState((current) => ({ ...current, note: event.target.value }))}
            rows={4}
          />
        </label>

        <div className="totals-box">
          <div className="totals-row">
            <span>Bez DPH</span>
            <strong>{formatMoney(totals.withoutVat)}</strong>
          </div>
          <div className="totals-row">
            <span>DPH</span>
            <strong>{formatMoney(totals.vat)}</strong>
          </div>
          <div className="totals-row totals-row-final">
            <span>Celkem</span>
            <strong>{formatMoney(totals.withVat)}</strong>
          </div>
        </div>
      </section>

      <section className="editor-action-bar">
        <div className="button-row wrap">
          {mode === 'create' && (
            <>
              <button disabled={saving || reservingNumber} type="button" onClick={onIssue}>
                {saving ? 'Vystavuji...' : 'Vystavit fakturu'}
              </button>
              <button
                disabled={saving || reservingNumber}
                type="button"
                className="secondary"
                onClick={onSave}
              >
                {saving ? 'Ukládám...' : 'Uložit koncept'}
              </button>
            </>
          )}
          {mode === 'edit' && (
            <>
              {invoice?.status === 'draft' && (
                <button disabled={saving || readOnly} type="button" onClick={onIssue}>
                  {saving ? 'Vystavuji...' : 'Vystavit fakturu'}
                </button>
              )}
              <button disabled={saving || readOnly} type="button" onClick={onSave}>
                {saving ? 'Ukládám...' : 'Uložit'}
              </button>
              <button
                disabled={saving || reservingNumber}
                type="button"
                className="secondary"
                onClick={() => navigate(backHref)}
              >
                Zrušit
              </button>
            </>
          )}
          {mode === 'create' && (
            <button
              disabled={saving || reservingNumber}
              type="button"
              className="secondary"
              onClick={() => navigate(backHref)}
            >
              Zrušit
            </button>
          )}
        </div>
      </section>
    </section>
  );
}
