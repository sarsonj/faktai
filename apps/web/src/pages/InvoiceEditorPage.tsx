import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Save, Send, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { createInvoice, getInvoice, issueInvoice, reserveInvoiceNumber, updateInvoice } from '../invoice-api';
import { getSubject } from '../subject-api';
import { formatMoney } from '../lib/format';
import { REVERSE_CHARGE_CODES, TAX_CLASSIFICATION_LABELS } from '../vat-regime';
import type { InvoiceDetail, TaxClassification } from '../types';
import { CustomerSection } from '../features/invoice-editor/CustomerSection';
import { Field } from '../features/invoice-editor/Field';
import { ItemsSection } from '../features/invoice-editor/ItemsSection';
import {
  calculateTotals,
  chargesVat,
  createDefaultState,
  createEmptyItem,
  createStateFromCopySource,
  fromInvoice,
  toPayload,
  type EditorItemState,
  type EditorState,
} from '../features/invoice-editor/editor-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type InvoiceEditorPageProps = {
  mode: 'create' | 'edit';
};

const TAX_CLASSIFICATIONS = Object.entries(TAX_CLASSIFICATION_LABELS) as Array<[TaxClassification, string]>;

export function InvoiceEditorPage({ mode }: InvoiceEditorPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const [isVatPayer, setIsVatPayer] = useState(true);
  const reserveRequestIdRef = useRef(0);
  // ID konceptu vytvořeného v tomto editoru (create mode). Když vytvoření projde,
  // ale vystavení selže, další pokus koncept jen aktualizuje místo založení nového.
  const createdInvoiceIdRef = useRef<string | null>(null);
  const customInvoiceNumberModeRef = useRef(useCustomInvoiceNumber);

  useEffect(() => {
    customInvoiceNumberModeRef.current = useCustomInvoiceNumber;
  }, [useCustomInvoiceNumber]);

  const reserveNumberForDate = useCallback(
    async (issueDate: string, force = false) => {
      if (mode !== 'create') return;
      if (customInvoiceNumberModeRef.current && !force) return;

      const requestId = reserveRequestIdRef.current + 1;
      reserveRequestIdRef.current = requestId;
      setReservingNumber(true);

      try {
        const { invoiceNumber } = await reserveInvoiceNumber(issueDate);
        setState((current) => {
          if (requestId !== reserveRequestIdRef.current) return current;
          if (customInvoiceNumberModeRef.current && !force) return current;
          const syncVs = current.variableSymbol === '' || current.variableSymbol === current.invoiceNumber;
          return { ...current, invoiceNumber, variableSymbol: syncVs ? invoiceNumber : current.variableSymbol };
        });
      } catch (err) {
        if (requestId === reserveRequestIdRef.current) {
          setError(err instanceof Error ? err.message : 'Přidělení čísla faktury selhalo');
        }
      } finally {
        if (requestId === reserveRequestIdRef.current) setReservingNumber(false);
      }
    },
    [mode],
  );

  useEffect(() => {
    let ignore = false;
    getSubject()
      .then((subject) => {
        if (!ignore) setIsVatPayer(subject.isVatPayer);
      })
      .catch(() => {
        // Bez subjektu necháváme výchozí zobrazení plátce; API pravidla vynutí samo.
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (mode !== 'create') return;
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
        await reserveNumberForDate(createDefaultState().issueDate);
      }
    };
    void run();
  }, [copyFromInvoiceId, mode, reserveNumberForDate]);

  useEffect(() => {
    if (mode !== 'edit' || !invoiceId) return;
    let ignore = false;
    const run = async () => {
      try {
        const payload = await getInvoice(invoiceId);
        if (ignore) return;
        setInvoice(payload);
        setState(fromInvoice(payload));
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : 'Načtení faktury selhalo');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    void run();
    return () => {
      ignore = true;
    };
  }, [mode, invoiceId]);

  const queryForList = new URLSearchParams(searchParams);
  queryForList.delete('advanced');
  queryForList.delete('copyFrom');
  const listQuery = queryForList.toString();
  const withContext = (path: string) => `${path}${listQuery ? `?${listQuery}` : ''}`;
  const backHref = withContext('/invoices');
  const advancedEdit = searchParams.get('advanced') === '1';

  const vatCharged = chargesVat(isVatPayer, state.taxClassification);
  const totals = useMemo(() => calculateTotals(state.items, vatCharged), [state.items, vatCharged]);
  const readOnly = mode === 'edit' && invoice?.status === 'paid' && !advancedEdit;
  const busy = saving || reservingNumber;

  const patch = (next: Partial<EditorState>) => setState((current) => ({ ...current, ...next }));

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
    setState((current) => {
      const syncVs = current.variableSymbol === '' || current.variableSymbol === current.invoiceNumber;
      const usableAsVs = /^\d{1,10}$/.test(value);
      return {
        ...current,
        invoiceNumber: value,
        variableSymbol: syncVs && usableAsVs ? value : current.variableSymbol,
      };
    });
  };

  const onIssueDateChange = (nextIssueDate: string) => {
    const yearChanged = state.issueDate.slice(0, 4) !== nextIssueDate.slice(0, 4);
    patch({ issueDate: nextIssueDate });
    if (mode === 'create' && !useCustomInvoiceNumber && yearChanged) {
      void reserveNumberForDate(nextIssueDate);
    }
  };

  const updateItem = (index: number, itemPatch: Partial<EditorItemState>) =>
    setState((current) => ({
      ...current,
      items: current.items.map((item, i) => (i === index ? { ...item, ...itemPatch } : item)),
    }));

  const syncCaches = (saved: InvoiceDetail) => {
    queryClient.setQueryData(['invoice', saved.id], saved);
    void queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };

  const persistDraft = async (): Promise<InvoiceDetail> => {
    if (mode === 'create' && useCustomInvoiceNumber && state.invoiceNumber.trim().length === 0) {
      throw new Error('Pro vlastní číslo dokladu vyplňte číslo faktury.');
    }

    const payload = toPayload(state);
    const isNewDraft = mode === 'create' && !createdInvoiceIdRef.current;
    if (isNewDraft && !useCustomInvoiceNumber) {
      const currentInvoiceNumber = state.invoiceNumber.replace(/\s+/g, '');
      const currentVariableSymbol = state.variableSymbol.replace(/\s+/g, '');
      payload.invoiceNumber = undefined;
      if (currentVariableSymbol.length === 0 || currentVariableSymbol === currentInvoiceNumber) {
        payload.variableSymbol = undefined;
      }
    }

    if (isNewDraft) {
      const created = await createInvoice(payload);
      createdInvoiceIdRef.current = created.id;
      setInvoice(created);
      setState(fromInvoice(created));
      syncCaches(created);
      return created;
    }

    const targetInvoiceId = mode === 'create' ? createdInvoiceIdRef.current : invoiceId;
    if (!targetInvoiceId) throw new Error('Chybí identifikátor faktury');

    const updated = await updateInvoice(targetInvoiceId, payload);
    setInvoice(updated);
    setState(fromInvoice(updated));
    syncCaches(updated);
    return updated;
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await persistDraft();
      toast.success(mode === 'create' ? 'Koncept byl uložen.' : 'Faktura byla uložena.');
      navigate(withContext(`/invoices/${saved.id}`), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uložení faktury selhalo');
    } finally {
      setSaving(false);
    }
  };

  const onIssue = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await persistDraft();
      const issued = await issueInvoice(saved.id);
      syncCaches(issued);
      toast.success(`Faktura ${issued.invoiceNumber ?? ''} byla vystavena.`);
      navigate(withContext(`/invoices/${saved.id}`), { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Vystavení faktury selhalo';
      setError(
        mode === 'create' && createdInvoiceIdRef.current
          ? `${message} Koncept byl uložen, po opravě ho můžete vystavit znovu.`
          : message,
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Načítám fakturu…</p>;
  }

  const canIssue = mode === 'create' || invoice?.status === 'draft';
  const title =
    mode === 'create'
      ? `Nová faktura${state.invoiceNumber ? ` ${state.invoiceNumber}` : ''}`
      : `Úprava faktury ${invoice?.invoiceNumber ?? ''}`;

  return (
    <div data-ui className="flex flex-col gap-6">
      <nav aria-label="Drobečková navigace" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to={backHref} className="text-muted-foreground no-underline hover:text-foreground">
          Vydané faktury
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-foreground">{mode === 'create' ? 'Nová faktura' : (invoice?.invoiceNumber ?? 'Úprava')}</span>
      </nav>

      <div className="flex flex-col gap-1">
        <h1 className="m-0 flex items-center gap-3 text-2xl font-bold tracking-tight">
          {title}
          {mode === 'create' && reservingNumber && <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Přiděluji číslo" />}
        </h1>
        {mode === 'edit' && advancedEdit && invoice?.status === 'paid' ? (
          <p className="m-0 flex items-center gap-2 text-sm text-amber-700">
            <TriangleAlert className="size-4" aria-hidden="true" />
            Pokročilý režim: upravujete uhrazenou fakturu.
          </p>
        ) : (
          readOnly && <p className="m-0 text-sm text-muted-foreground">Uhrazenou fakturu nelze běžně upravovat.</p>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Doklad</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="issue-date" label="Datum vystavení">
                <Input
                  id="issue-date"
                  type="date"
                  disabled={readOnly}
                  value={state.issueDate}
                  onChange={(event) => onIssueDateChange(event.target.value)}
                />
              </Field>
              <Field id="due-date" label="Datum splatnosti">
                <Input
                  id="due-date"
                  type="date"
                  disabled={readOnly}
                  value={state.dueDate}
                  onChange={(event) => patch({ dueDate: event.target.value })}
                />
              </Field>
              <Field id="supply-date" label="Datum zdanitelného plnění (DUZP)">
                <Input
                  id="supply-date"
                  type="date"
                  disabled={readOnly}
                  value={state.taxableSupplyDate}
                  onChange={(event) => patch({ taxableSupplyDate: event.target.value })}
                />
              </Field>
              <Field id="variable-symbol" label="Variabilní symbol">
                <Input
                  id="variable-symbol"
                  inputMode="numeric"
                  disabled={readOnly}
                  value={state.variableSymbol}
                  onChange={(event) => patch({ variableSymbol: event.target.value.replace(/\s+/g, '') })}
                />
              </Field>

              {isVatPayer ? (
                <Field id="tax-regime" label="Daňový režim" className="sm:col-span-2">
                  <Select
                    disabled={readOnly}
                    value={state.taxClassification}
                    onValueChange={(value) => patch({ taxClassification: value as TaxClassification })}
                  >
                    <SelectTrigger id="tax-regime" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent data-ui>
                      {TAX_CLASSIFICATIONS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : (
                <p className="m-0 text-sm text-muted-foreground sm:col-span-2">
                  Nejste plátce DPH – faktura se vystaví bez DPH.
                </p>
              )}

              {isVatPayer && state.taxClassification === 'domestic_reverse_charge' && (
                <Field
                  id="reverse-charge-code"
                  label="Kód předmětu plnění"
                  hint="Uvádí se v kontrolním hlášení (oddíl A.1)."
                  className="sm:col-span-2"
                >
                  <Select
                    disabled={readOnly}
                    value={state.reverseChargeCode || undefined}
                    onValueChange={(value) => patch({ reverseChargeCode: value })}
                  >
                    <SelectTrigger id="reverse-charge-code" className="w-full">
                      <SelectValue placeholder="Vyberte kód…" />
                    </SelectTrigger>
                    <SelectContent data-ui>
                      {REVERSE_CHARGE_CODES.map((item) => (
                        <SelectItem key={item.code} value={item.code}>
                          {item.code} – {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {mode === 'create' && (
                <div className="flex flex-col gap-3 border-t pt-4 sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="custom-number"
                      checked={useCustomInvoiceNumber}
                      onCheckedChange={(checked) => onToggleCustomInvoiceNumber(checked === true)}
                    />
                    <Label htmlFor="custom-number" className="font-normal">
                      Použít vlastní číslo dokladu
                    </Label>
                  </div>
                  {useCustomInvoiceNumber && (
                    <Field
                      id="custom-number-value"
                      label="Vlastní číslo dokladu"
                      hint="Kontroluje se jen neprázdnost a jedinečnost v řadě."
                    >
                      <Input
                        id="custom-number-value"
                        placeholder="Např. FV/2026-001"
                        value={state.invoiceNumber}
                        onChange={(event) => onCustomInvoiceNumberChange(event.target.value)}
                      />
                    </Field>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <CustomerSection value={state} readOnly={readOnly} onChange={patch} />

          <ItemsSection
            items={state.items}
            readOnly={readOnly}
            vatCharged={vatCharged}
            onChange={updateItem}
            onAdd={() => setState((current) => ({ ...current, items: [...current.items, createEmptyItem()] }))}
            onRemove={(index) =>
              setState((current) => ({ ...current, items: current.items.filter((_, i) => i !== index) }))
            }
          />

          <Card>
            <CardHeader>
              <CardTitle>
                <Label htmlFor="note" className="text-base">
                  Poznámka
                </Label>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="note"
                rows={3}
                disabled={readOnly}
                placeholder="Zobrazí se na faktuře"
                value={state.note}
                onChange={(event) => patch({ note: event.target.value })}
              />
            </CardContent>
          </Card>
        </div>

        <Card className="lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle>Souhrn</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="m-0 flex flex-col gap-2 text-sm">
              {vatCharged && (
                <>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Základ daně</dt>
                    <dd className="m-0 tabular-nums">{formatMoney(totals.withoutVat)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">DPH</dt>
                    <dd className="m-0 tabular-nums">{formatMoney(totals.vat)}</dd>
                  </div>
                </>
              )}
              <div className="flex items-baseline justify-between gap-4 border-t pt-3">
                <dt className="font-semibold">Celkem k úhradě</dt>
                <dd className="m-0 text-lg font-bold whitespace-nowrap tabular-nums">{formatMoney(totals.withVat)}</dd>
              </div>
            </dl>

            {error && (
              <p role="alert" className="m-0 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-2">
              {canIssue && (
                <Button disabled={busy || readOnly} onClick={() => void onIssue()}>
                  {saving ? <Loader2 className="animate-spin" /> : <Send />}
                  Vystavit fakturu
                </Button>
              )}
              <Button variant={canIssue ? 'outline' : 'default'} disabled={busy || readOnly} onClick={() => void onSave()}>
                <Save />
                {mode === 'create' || invoice?.status === 'draft' ? 'Uložit koncept' : 'Uložit změny'}
              </Button>
              <Button variant="ghost" disabled={saving} onClick={() => navigate(backHref)}>
                Zrušit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
