import { useEffect, useState } from 'react';
import { Check, Copy, KeyRound, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getApiKeyStatus, regenerateApiKey, revokeApiKey, type ApiKeyStatus } from '../api-key-api';
import { useConfirm } from '../components/app/confirm-context';
import { PageHeader } from '../components/app/PageHeader';
import { API_BASE_URL } from '../lib-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString('cs-CZ') : '—';
}

/** Absolutní adresa API (pro ukázku curl) a kořen bez `/v1` – tam běží dokumentace (`/api/docs`). */
const API_URL = new URL(API_BASE_URL, window.location.origin).href.replace(/\/$/, '');
const DOCS_URL = `${API_URL.replace(/\/v1$/, '')}/docs`;

export function SettingsApiKeyPage() {
  const confirm = useConfirm();
  const [status, setStatus] = useState<ApiKeyStatus | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getApiKeyStatus()
      .then((payload) => {
        if (!ignore) setStatus(payload);
      })
      .catch((err: unknown) => {
        if (!ignore) setError(err instanceof Error ? err.message : 'Načtení API klíče selhalo');
      });
    return () => {
      ignore = true;
    };
  }, []);

  const onGenerate = async () => {
    if (
      status?.exists &&
      !(await confirm({
        title: 'Vygenerovat nový API klíč?',
        description: 'Stávající klíč okamžitě přestane fungovat. Skripty bude potřeba aktualizovat.',
        confirmLabel: 'Vygenerovat nový',
      }))
    ) {
      return;
    }
    setBusy(true);
    setCopied(false);
    try {
      const { key, ...next } = await regenerateApiKey();
      setStatus(next);
      setNewKey(key);
      toast.success('API klíč byl vygenerován.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Vygenerování klíče selhalo');
    } finally {
      setBusy(false);
    }
  };

  const onRevoke = async () => {
    if (
      !(await confirm({
        title: 'Zrušit API klíč?',
        description: 'Skripty, které klíč používají, přestanou fungovat.',
        confirmLabel: 'Zrušit klíč',
        destructive: true,
      }))
    ) {
      return;
    }
    setBusy(true);
    try {
      await revokeApiKey();
      setStatus({ exists: false, prefix: null, createdAt: null, lastUsedAt: null });
      setNewKey(null);
      toast.success('API klíč byl zrušen.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Zrušení klíče selhalo');
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
    } catch {
      toast.error('Kopírování se nezdařilo – označte klíč a zkopírujte ho ručně.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="API klíč"
        description="Klíč umožní skriptům a integracím pracovat s doklady stejně jako vy v aplikaci."
      />

      {error && <p className="m-0 text-sm text-destructive">{error}</p>}

      {newKey && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle>Nový API klíč</CardTitle>
            <CardDescription>Zkopírujte si ho teď – po opuštění stránky ho už neuvidíte.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 rounded-md border bg-card px-3 py-2 font-mono text-sm break-all">
              {newKey}
            </code>
            <Button variant="outline" onClick={() => void onCopy()}>
              {copied ? <Check /> : <Copy />}
              {copied ? 'Zkopírováno' : 'Kopírovat'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Stav</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {!status ? (
            <p className="m-0 text-sm text-muted-foreground">Načítám…</p>
          ) : status.exists ? (
            <dl className="m-0 grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Klíč</dt>
                <dd className="m-0 mt-1 font-mono">{status.prefix}…</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Vytvořen</dt>
                <dd className="m-0 mt-1">{formatDateTime(status.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Naposledy použit</dt>
                <dd className="m-0 mt-1">{formatDateTime(status.lastUsedAt)}</dd>
              </div>
            </dl>
          ) : (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <KeyRound className="size-5" aria-hidden="true" />
              API klíč zatím nemáte.
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || !status} onClick={() => void onGenerate()}>
              <RefreshCw />
              {status?.exists ? 'Vygenerovat nový klíč' : 'Vygenerovat klíč'}
            </Button>
            {status?.exists && (
              <Button variant="outline" disabled={busy} onClick={() => void onRevoke()} className="text-destructive">
                <Trash2 />
                Zrušit klíč
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Použití</CardTitle>
          <CardDescription>
            Klíč posílejte v hlavičce <code className="font-mono">Authorization: Bearer fai_…</code>. Při vytváření
            dokladů můžete poslat hlavičku <code className="font-mono">Idempotency-Key</code>, aby opakovaný požadavek
            nevytvořil duplicitní fakturu.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <pre className="m-0 overflow-x-auto rounded-md bg-muted px-4 py-3 font-mono text-sm">
            {`curl -H "Authorization: Bearer $FAKTAI_API_KEY" \\\n  ${API_URL}/invoices`}
          </pre>
          <a href={DOCS_URL} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary">
            Dokumentace API (OpenAPI)
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
