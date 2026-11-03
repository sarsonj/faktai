import { useRef, useState, type DragEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FileText, Loader2, Paperclip, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  createReceivedDocument,
  deleteReceivedAttachment,
  deleteReceivedDocument,
  getReceivedDocument,
  openReceivedAttachment,
  updateReceivedDocument,
  uploadReceivedAttachment,
} from '../received-documents-api';
import { searchRegistryCompanies } from '../registry-api';
import { getSubject } from '../subject-api';
import { todayDateInputValue } from '../date-utils';
import { formatMoney } from '../lib/format';
import { normalizeDecimalInput, roundMoney } from '../features/invoice-editor/editor-state';
import { RECEIVED_VAT_REGIME_LABELS, REVERSE_CHARGE_CODES, isSelfAssessedRegime } from '../vat-regime';
import { useConfirm } from '../components/app/confirm-context';
import { Field } from '../components/app/Field';
import { RegistryLookup } from '../components/app/RegistryLookup';
import type {
  ReceivedDocument,
  ReceivedDocumentAttachment,
  ReceivedDocumentInput,
  ReceivedVatRegime,
  RegistryCompanyResult,
} from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type LineState = { vatRate: number; base: string; vat: string };

type FormState = {
  documentNumber: string;
  supplierName: string;
  supplierIco: string;
  supplierVatId: string;
  supplierStreet: string;
  supplierCity: string;
  supplierPostalCode: string;
  supplierCountryCode: string;
  description: string;
  issueDate: string;
  taxableSupplyDate: string;
  deductionDate: string;
  dueDate: string;
  vatRegime: ReceivedVatRegime;
  reverseChargeCode: string;
  note: string;
  lines: LineState[];
};

const ACCEPTED_FILES = 'application/pdf,image/png,image/jpeg,image/webp,image/heic';
const REGIMES = Object.entries(RECEIVED_VAT_REGIME_LABELS) as Array<[ReceivedVatRegime, { label: string }]>;

function emptyForm(isVatPayer: boolean): FormState {
  const today = todayDateInputValue();
  return {
    documentNumber: '',
    supplierName: '',
    supplierIco: '',
    supplierVatId: '',
    supplierStreet: '',
    supplierCity: '',
    supplierPostalCode: '',
    supplierCountryCode: 'CZ',
    description: '',
    issueDate: today,
    taxableSupplyDate: today,
    deductionDate: '',
    dueDate: '',
    vatRegime: isVatPayer ? 'domestic_standard' : 'no_deduction',
    reverseChargeCode: '',
    note: '',
    lines: [{ vatRate: 21, base: '', vat: '' }],
  };
}

function fromDocument(doc: ReceivedDocument): FormState {
  const day = (value: string | null) => (value ? value.slice(0, 10) : '');
  return {
    documentNumber: doc.documentNumber,
    supplierName: doc.supplierName,
    supplierIco: doc.supplierIco ?? '',
    supplierVatId: doc.supplierVatId ?? '',
    supplierStreet: doc.supplierStreet ?? '',
    supplierCity: doc.supplierCity ?? '',
    supplierPostalCode: doc.supplierPostalCode ?? '',
    supplierCountryCode: doc.supplierCountryCode,
    description: doc.description ?? '',
    issueDate: day(doc.issueDate),
    taxableSupplyDate: day(doc.taxableSupplyDate),
    deductionDate: day(doc.deductionDate) === day(doc.taxableSupplyDate) ? '' : day(doc.deductionDate),
    dueDate: day(doc.dueDate),
    vatRegime: doc.vatRegime,
    reverseChargeCode: doc.reverseChargeCode ?? '',
    note: doc.note ?? '',
    lines: doc.lines.map((line) => ({ vatRate: line.vatRate, base: line.base, vat: line.vat })),
  };
}

function toPayload(form: FormState): ReceivedDocumentInput {
  const optional = (value: string) => value.trim() || undefined;
  const selfAssessed = isSelfAssessedRegime(form.vatRegime);
  return {
    documentNumber: form.documentNumber.trim(),
    supplierName: form.supplierName.trim(),
    supplierIco: optional(form.supplierIco),
    supplierVatId: optional(form.supplierVatId),
    supplierStreet: optional(form.supplierStreet),
    supplierCity: optional(form.supplierCity),
    supplierPostalCode: optional(form.supplierPostalCode),
    supplierCountryCode: optional(form.supplierCountryCode)?.toUpperCase(),
    description: optional(form.description),
    issueDate: optional(form.issueDate),
    taxableSupplyDate: form.taxableSupplyDate,
    deductionDate: form.vatRegime === 'domestic_standard' ? optional(form.deductionDate) : undefined,
    dueDate: optional(form.dueDate),
    vatRegime: form.vatRegime,
    reverseChargeCode: form.vatRegime === 'domestic_reverse_charge' ? optional(form.reverseChargeCode) : undefined,
    note: optional(form.note),
    lines: form.lines.map((line) => ({
      vatRate: line.vatRate,
      base: normalizeDecimalInput(line.base || '0'),
      vat: selfAssessed || line.vat.trim() === '' ? undefined : normalizeDecimalInput(line.vat),
    })),
  };
}

function parseAmount(value: string): number {
  const parsed = Number(normalizeDecimalInput(value || '0'));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** DPH řádku: zadaná (tuzemsko) nebo dopočtená ze základu – stejně jako API. */
function lineVat(line: LineState, selfAssessed: boolean): number {
  const computed = roundMoney((roundMoney(parseAmount(line.base)) * line.vatRate) / 100);
  return !selfAssessed && line.vat.trim() !== '' ? roundMoney(parseAmount(line.vat)) : computed;
}

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} kB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ReceivedDocumentEditorPage({ mode }: { mode: 'create' | 'edit' }) {
  const { documentId } = useParams<{ documentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const subject = useQuery({ queryKey: ['subject'], queryFn: getSubject });
  const documentQuery = useQuery({
    queryKey: ['received-document', documentId],
    queryFn: () => getReceivedDocument(documentId!),
    enabled: mode === 'edit' && Boolean(documentId),
  });

  const isVatPayer = subject.data?.isVatPayer ?? true;
  const [form, setForm] = useState<FormState | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulář se inicializuje až z načtených dat (subjekt / doklad).
  const loadedDocument = documentQuery.data;
  const ready = mode === 'create' ? !subject.isPending : Boolean(loadedDocument);
  const [initializedFor, setInitializedFor] = useState<string | null>(null);
  const initKey = mode === 'create' ? 'create' : (loadedDocument?.id ?? null);
  if (ready && initKey && initializedFor !== initKey) {
    setInitializedFor(initKey);
    setForm(mode === 'create' ? emptyForm(isVatPayer) : fromDocument(loadedDocument!));
  }

  const context = new URLSearchParams(searchParams).toString();
  const backHref = `/received${context ? `?${context}` : ''}`;

  if (!form) {
    if (mode === 'edit' && documentQuery.isError) {
      return (
        <p className="m-0 text-destructive">
          {documentQuery.error instanceof Error ? documentQuery.error.message : 'Doklad nebyl nalezen.'}
        </p>
      );
    }
    return <p className="m-0 text-muted-foreground">Načítám…</p>;
  }

  const patch = (next: Partial<FormState>) => setForm((current) => (current ? { ...current, ...next } : current));
  const updateLine = (index: number, next: Partial<LineState>) =>
    setForm((current) =>
      current ? { ...current, lines: current.lines.map((line, i) => (i === index ? { ...line, ...next } : line)) } : current,
    );

  const selfAssessed = isSelfAssessedRegime(form.vatRegime);
  const totalBase = roundMoney(form.lines.reduce((sum, line) => sum + roundMoney(parseAmount(line.base)), 0));
  const totalVat = roundMoney(form.lines.reduce((sum, line) => sum + lineVat(line, selfAssessed), 0));
  const totalPayable = roundMoney(totalBase + (selfAssessed ? 0 : totalVat));
  const attachments: ReceivedDocumentAttachment[] = loadedDocument?.attachments ?? [];

  const applyCompany = (item: RegistryCompanyResult) =>
    patch({
      supplierName: item.name || form.supplierName,
      supplierIco: item.ico || form.supplierIco,
      supplierVatId: item.dic ?? form.supplierVatId,
      supplierStreet: item.street || form.supplierStreet,
      supplierCity: item.city || form.supplierCity,
      supplierPostalCode: item.postalCode || form.supplierPostalCode,
      supplierCountryCode: item.countryCode || form.supplierCountryCode,
    });

  const uploadFiles = async (id: string, files: File[]) => {
    let failed = 0;
    for (const file of files) {
      try {
        await uploadReceivedAttachment(id, file);
      } catch (err) {
        failed += 1;
        toast.error(`${file.name}: ${err instanceof Error ? err.message : 'nahrání selhalo'}`);
      }
    }
    return failed;
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(form);
      const saved =
        mode === 'create' ? await createReceivedDocument(payload) : await updateReceivedDocument(documentId!, payload);
      if (pendingFiles.length > 0) {
        await uploadFiles(saved.id, pendingFiles);
        setPendingFiles([]);
      }
      void queryClient.invalidateQueries({ queryKey: ['received-documents'] });
      void queryClient.invalidateQueries({ queryKey: ['received-document', saved.id] });
      toast.success(mode === 'create' ? 'Doklad byl uložen.' : 'Změny byly uloženy.');
      navigate(backHref, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uložení dokladu selhalo');
    } finally {
      setSaving(false);
    }
  };

  const onAddFiles = async (files: File[]) => {
    if (files.length === 0) return;
    if (mode === 'create') {
      setPendingFiles((current) => [...current, ...files]);
      return;
    }
    setUploading(true);
    const failed = await uploadFiles(documentId!, files);
    setUploading(false);
    if (failed < files.length) toast.success('Přílohy byly nahrány.');
    void queryClient.invalidateQueries({ queryKey: ['received-document', documentId] });
    void queryClient.invalidateQueries({ queryKey: ['received-documents'] });
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    void onAddFiles(Array.from(event.dataTransfer.files));
  };

  const onDeleteAttachment = async (attachment: ReceivedDocumentAttachment) => {
    if (!(await confirm({ title: `Smazat přílohu ${attachment.fileName}?`, confirmLabel: 'Smazat', destructive: true }))) {
      return;
    }
    try {
      await deleteReceivedAttachment(documentId!, attachment.id);
      void queryClient.invalidateQueries({ queryKey: ['received-document', documentId] });
      void queryClient.invalidateQueries({ queryKey: ['received-documents'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Smazání přílohy selhalo');
    }
  };

  const onDeleteDocument = async () => {
    if (
      !(await confirm({
        title: `Smazat doklad ${form.documentNumber}?`,
        description: 'Smažou se i nahrané přílohy. Tato akce je nevratná.',
        confirmLabel: 'Smazat',
        destructive: true,
      }))
    ) {
      return;
    }
    try {
      await deleteReceivedDocument(documentId!);
      void queryClient.invalidateQueries({ queryKey: ['received-documents'] });
      toast.success('Doklad byl smazán.');
      navigate(backHref, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Smazání dokladu selhalo');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Drobečková navigace" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to={backHref} className="text-muted-foreground no-underline hover:text-foreground">
          Přijaté doklady
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-foreground">{mode === 'create' ? 'Nový doklad' : form.documentNumber}</span>
      </nav>
      <h1 className="m-0 text-2xl font-bold tracking-tight">
        {mode === 'create' ? 'Nový přijatý doklad' : `Doklad ${loadedDocument?.documentNumber ?? ''}`}
      </h1>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Dodavatel</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <RegistryLookup<RegistryCompanyResult>
                label="Načíst dodavatele z ARES"
                placeholder="Najít dodavatele v ARES podle IČO nebo názvu"
                emptyMessage="Dodavatele jsme v registru nenašli. Vyplňte ho ručně."
                fallbackQuery={form.supplierIco}
                search={searchRegistryCompanies}
                resultKey={(item) => `${item.ico}-${item.name}`}
                renderResult={(item) => (
                  <>
                    <span className="block truncate font-medium">{item.name}</span>
                    <span className="block truncate text-muted-foreground">IČO {item.ico}</span>
                  </>
                )}
                onSelect={applyCompany}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                <Field id="supplier-name" label="Název" className="sm:col-span-6">
                  <Input id="supplier-name" value={form.supplierName} onChange={(e) => patch({ supplierName: e.target.value })} />
                </Field>
                <Field id="supplier-ico" label="IČO" className="sm:col-span-2">
                  <Input
                    id="supplier-ico"
                    inputMode="numeric"
                    value={form.supplierIco}
                    onChange={(e) => patch({ supplierIco: e.target.value.replace(/\s+/g, '') })}
                  />
                </Field>
                <Field
                  id="supplier-vat"
                  label={form.vatRegime === 'eu_goods' || form.vatRegime === 'eu_service' ? 'VAT ID (např. DE123456789)' : 'DIČ'}
                  className="sm:col-span-2"
                >
                  <Input id="supplier-vat" value={form.supplierVatId} onChange={(e) => patch({ supplierVatId: e.target.value })} />
                </Field>
                <Field id="supplier-country" label="Země" className="sm:col-span-2">
                  <Input
                    id="supplier-country"
                    maxLength={2}
                    value={form.supplierCountryCode}
                    onChange={(e) => patch({ supplierCountryCode: e.target.value.toUpperCase() })}
                  />
                </Field>
                <Field id="supplier-street" label="Ulice a číslo" className="sm:col-span-3">
                  <Input id="supplier-street" value={form.supplierStreet} onChange={(e) => patch({ supplierStreet: e.target.value })} />
                </Field>
                <Field id="supplier-city" label="Město" className="sm:col-span-2">
                  <Input id="supplier-city" value={form.supplierCity} onChange={(e) => patch({ supplierCity: e.target.value })} />
                </Field>
                <Field id="supplier-zip" label="PSČ" className="sm:col-span-1">
                  <Input id="supplier-zip" value={form.supplierPostalCode} onChange={(e) => patch({ supplierPostalCode: e.target.value })} />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Doklad</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="document-number" label="Číslo dokladu dodavatele">
                <Input id="document-number" value={form.documentNumber} onChange={(e) => patch({ documentNumber: e.target.value })} />
              </Field>
              <Field id="description" label="Předmět" hint="Např. notebook, hosting, účetní služby.">
                <Input id="description" value={form.description} onChange={(e) => patch({ description: e.target.value })} />
              </Field>
              <Field id="issue-date" label="Datum vystavení">
                <Input id="issue-date" type="date" value={form.issueDate} onChange={(e) => patch({ issueDate: e.target.value })} />
              </Field>
              <Field id="supply-date" label="DUZP">
                <Input
                  id="supply-date"
                  type="date"
                  value={form.taxableSupplyDate}
                  onChange={(e) => patch({ taxableSupplyDate: e.target.value })}
                />
              </Field>
              <Field id="due-date" label="Splatnost">
                <Input id="due-date" type="date" value={form.dueDate} onChange={(e) => patch({ dueDate: e.target.value })} />
              </Field>
              {form.vatRegime === 'domestic_standard' && (
                <Field
                  id="deduction-date"
                  label="Uplatnit odpočet k datu"
                  hint="Nepovinné – když doklad dorazil později, odpočet se uplatní až v tomto období."
                >
                  <Input
                    id="deduction-date"
                    type="date"
                    value={form.deductionDate}
                    onChange={(e) => patch({ deductionDate: e.target.value })}
                  />
                </Field>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <CardTitle>DPH</CardTitle>
                <CardDescription>{RECEIVED_VAT_REGIME_LABELS[form.vatRegime].hint}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {isVatPayer && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field id="vat-regime" label="Režim DPH">
                    <Select value={form.vatRegime} onValueChange={(value) => patch({ vatRegime: value as ReceivedVatRegime })}>
                      <SelectTrigger id="vat-regime" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIMES.map(([value, meta]) => (
                          <SelectItem key={value} value={value}>
                            {meta.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {form.vatRegime === 'domestic_reverse_charge' && (
                    <Field id="rc-code" label="Kód předmětu plnění">
                      <Select value={form.reverseChargeCode} onValueChange={(value) => patch({ reverseChargeCode: value })}>
                        <SelectTrigger id="rc-code" className="w-full">
                          <SelectValue placeholder="Vyberte kód…" />
                        </SelectTrigger>
                        <SelectContent>
                          {REVERSE_CHARGE_CODES.map((item) => (
                            <SelectItem key={item.code} value={item.code}>
                              {item.code} – {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                </div>
              )}

              <div className="hidden grid-cols-[100px_minmax(0,1fr)_minmax(0,1fr)_36px] gap-2 text-xs font-medium text-muted-foreground sm:grid">
                <span>Sazba</span>
                <span className="text-right">Základ daně</span>
                <span className="text-right">{selfAssessed ? 'DPH (dopočteno)' : 'DPH z dokladu'}</span>
                <span />
              </div>
              {form.lines.map((line, index) => (
                <div key={index} className="grid grid-cols-[100px_minmax(0,1fr)_minmax(0,1fr)_36px] items-center gap-2">
                  <Select value={String(line.vatRate)} onValueChange={(value) => updateLine(index, { vatRate: Number(value) })}>
                    <SelectTrigger aria-label={`Sazba DPH řádku ${index + 1}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="21">21 %</SelectItem>
                      <SelectItem value="12">12 %</SelectItem>
                      {!selfAssessed && <SelectItem value="0">0 %</SelectItem>}
                    </SelectContent>
                  </Select>
                  <Input
                    aria-label={`Základ daně řádku ${index + 1}`}
                    inputMode="decimal"
                    placeholder="0,00"
                    value={line.base}
                    onChange={(e) => updateLine(index, { base: e.target.value })}
                    className="text-right tabular-nums"
                  />
                  <Input
                    aria-label={`DPH řádku ${index + 1}`}
                    inputMode="decimal"
                    disabled={selfAssessed}
                    placeholder={lineVat({ ...line, vat: '' }, selfAssessed).toFixed(2).replace('.', ',')}
                    value={selfAssessed ? lineVat(line, true).toFixed(2).replace('.', ',') : line.vat}
                    onChange={(e) => updateLine(index, { vat: e.target.value })}
                    className="text-right tabular-nums"
                  />
                  {form.lines.length > 1 ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Odebrat řádek ${index + 1}`}
                      onClick={() => patch({ lines: form.lines.filter((_, i) => i !== index) })}
                    >
                      <Trash2 />
                    </Button>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => patch({ lines: [...form.lines, { vatRate: 12, base: '', vat: '' }] })}
                >
                  <Plus />
                  Přidat sazbu
                </Button>
                {!selfAssessed && (
                  <span className="text-xs text-muted-foreground">Prázdné DPH se dopočítá ze základu.</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Přílohy</CardTitle>
              <CardDescription>PDF nebo fotka dokladu (PDF, PNG, JPEG, WEBP, HEIC; max. 15 MB).</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {(attachments.length > 0 || pendingFiles.length > 0) && (
                <ul className="m-0 flex list-none flex-col divide-y rounded-lg border p-0">
                  {attachments.map((attachment) => (
                    <li key={attachment.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left text-primary hover:underline"
                        onClick={() =>
                          void openReceivedAttachment(documentId!, attachment).catch((err: unknown) =>
                            toast.error(err instanceof Error ? err.message : 'Otevření přílohy selhalo'),
                          )
                        }
                      >
                        {attachment.fileName}
                      </button>
                      <span className="text-xs text-muted-foreground">{formatSize(attachment.size)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Smazat přílohu ${attachment.fileName}`}
                        onClick={() => void onDeleteAttachment(attachment)}
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                  {pendingFiles.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <Paperclip className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">nahraje se po uložení</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Odebrat ${file.name}`}
                        onClick={() => setPendingFiles((current) => current.filter((_, i) => i !== index))}
                      >
                        <X />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground transition-colors',
                  dragOver && 'border-primary bg-primary/5',
                )}
              >
                {uploading ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Upload className="size-5" aria-hidden="true" />}
                <span>Přetáhněte soubory sem, nebo</span>
                <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                  Vybrat soubory
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_FILES}
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    void onAddFiles(Array.from(event.target.files ?? []));
                    event.target.value = '';
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Poznámka</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea rows={3} aria-label="Poznámka" value={form.note} onChange={(e) => patch({ note: e.target.value })} />
            </CardContent>
          </Card>
        </div>

        <Card className="lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle>Souhrn</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="m-0 flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Základ daně</dt>
                <dd className="m-0 tabular-nums">{formatMoney(totalBase)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  {form.vatRegime === 'no_deduction' ? 'DPH (bez odpočtu)' : selfAssessed ? 'DPH přiznaná i odečtená' : 'DPH k odpočtu'}
                </dt>
                <dd className="m-0 tabular-nums">{formatMoney(totalVat)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t pt-3">
                <dt className="font-semibold">K úhradě dodavateli</dt>
                <dd className="m-0 text-lg font-bold whitespace-nowrap tabular-nums">{formatMoney(totalPayable)}</dd>
              </div>
            </dl>
            {error && (
              <p role="alert" className="m-0 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Button disabled={saving} onClick={() => void onSave()}>
                {saving ? <Loader2 className="animate-spin" /> : <Save />}
                {mode === 'create' ? 'Uložit doklad' : 'Uložit změny'}
              </Button>
              {mode === 'edit' && (
                <Button variant="outline" className="text-destructive" disabled={saving} onClick={() => void onDeleteDocument()}>
                  <Trash2 />
                  Smazat doklad
                </Button>
              )}
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
