import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  createInvoice,
  downloadInvoicePdf,
  getInvoice,
  issueInvoice,
  markInvoicePaid,
  updateInvoice,
  deleteInvoice,
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

function createDefaultState(defaultDueDays = 14, variableSymbol = ''): EditorState {
  const issueDate = new Date();
  issueDate.setHours(0, 0, 0, 0);

  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + defaultDueDays);

  return {
    variableSymbol,
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

function toPayload(state: EditorState): InvoiceUpsertInput {
  return {
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

  const [state, setState] = useState<EditorState>(() => createDefaultState());
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [customerLookupQuery, setCustomerLookupQuery] = useState('');
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [customerLookupError, setCustomerLookupError] = useState<string | null>(null);
  const [customerLookupResults, setCustomerLookupResults] = useState<RegistryCompanyResult[]>([]);

  useEffect(() => {
    if (mode !== 'create') {
      return;
    }

    const run = async () => {
      try {
        const subject = await getSubject();
        const defaultVs =
          subject.defaultVariableSymbolType === 'ico' ? subject.ico : (subject.defaultVariableSymbolValue ?? '');

        setState((current) => {
          if (current.customerCountryCode !== 'CZ' || current.items.length !== 1 || current.customerName) {
            return current;
          }
          return createDefaultState(subject.defaultDueDays, defaultVs);
        });
      } catch {
        // Defaults stay client-side if subject fetch fails.
      }
    };

    void run();
  }, [mode]);

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

  const listQuery = searchParams.toString();
  const backHref = `/invoices${listQuery ? `?${listQuery}` : ''}`;

  const totals = useMemo(() => calculateTotals(state.items), [state.items]);
  const readOnly = mode === 'edit' && invoice?.status === 'paid';

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
    const payload = toPayload(state);

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

  const onSaveDraft = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const saved = await persistDraft();
      setSuccess('Koncept byl uložen.');

      if (mode === 'create') {
        navigate(`/invoices/${saved.id}/edit${listQuery ? `?${listQuery}` : ''}`, { replace: true });
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

  const onMarkPaid = async () => {
    if (!invoice) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const paid = await markInvoicePaid(invoice.id);
      setInvoice(paid);
      setState(fromInvoice(paid));
      setSuccess('Faktura byla označena jako uhrazená.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Označení úhrady selhalo');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!invoice) {
      return;
    }

    if (!window.confirm('Smazat koncept faktury? Tato akce je nevratná.')) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await deleteInvoice(invoice.id);
      navigate(backHref, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Smazání faktury selhalo');
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
    return (
      <main className="app-shell">
        <section className="card card-wide">Načítám fakturu...</section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="card card-wide">
        <h1>{mode === 'create' ? 'Nová faktura' : `Editace faktury ${invoice?.invoiceNumber ?? ''}`}</h1>
        <div className="toolbar-row">
          <Link to={backHref}>Zpět na seznam</Link>
          {mode === 'edit' && invoice && <Link to={`/invoices/${invoice.id}${listQuery ? `?${listQuery}` : ''}`}>Detail faktury</Link>}
          {mode === 'edit' && invoice && (
            <button
              type="button"
              className="secondary"
              disabled={invoice.status === 'draft' || invoice.status === 'cancelled'}
              onClick={() => {
                void downloadInvoicePdf(invoice.id).catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : 'Export PDF selhal');
                });
              }}
            >
              PDF
            </button>
          )}
        </div>

        {error && <p className="error">{error}</p>}
        {success && <p>{success}</p>}
        {invoice && <p>Aktuální PDF verze: {invoice.pdfVersion}</p>}

        <div className="form-grid invoice-form-grid">
          <label>
            Variabilní symbol
            <input
              disabled={readOnly}
              value={state.variableSymbol}
              onChange={(event) => setState((current) => ({ ...current, variableSymbol: event.target.value }))}
            />
          </label>
          <label>
            Datum vystavení
            <input
              disabled={readOnly}
              type="date"
              value={state.issueDate}
              onChange={(event) => setState((current) => ({ ...current, issueDate: event.target.value }))}
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

        <h2>Položky</h2>
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
              {!readOnly && state.items.length > 1 && (
                <button type="button" className="danger" onClick={() => removeItem(index)}>
                  Odebrat
                </button>
              )}
            </div>
          ))}
        </div>

        {!readOnly && (
          <div className="toolbar-row">
            <button type="button" className="secondary" onClick={addItem}>
              Přidat položku
            </button>
          </div>
        )}

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
          <p>Bez DPH: {formatMoney(totals.withoutVat)}</p>
          <p>DPH: {formatMoney(totals.vat)}</p>
          <p>
            <strong>Celkem: {formatMoney(totals.withVat)}</strong>
          </p>
        </div>

        <div className="button-row wrap">
          {!readOnly && (
            <>
              <button disabled={saving} type="button" onClick={onSaveDraft}>
                {saving ? 'Ukládám...' : 'Uložit koncept'}
              </button>
              <button disabled={saving} type="button" onClick={onIssue}>
                Vystavit fakturu
              </button>
            </>
          )}
          {mode === 'edit' && invoice?.status === 'draft' && (
            <button disabled={saving} type="button" className="danger" onClick={onDelete}>
              Smazat koncept
            </button>
          )}
          {mode === 'edit' && invoice && (invoice.status === 'issued' || invoice.status === 'overdue') && (
            <button disabled={saving} type="button" className="secondary" onClick={onMarkPaid}>
              Označit jako uhrazené
            </button>
          )}
          <button disabled={saving} type="button" className="secondary" onClick={() => navigate(backHref)}>
            Zrušit
          </button>
        </div>
      </section>
    </main>
  );
}
