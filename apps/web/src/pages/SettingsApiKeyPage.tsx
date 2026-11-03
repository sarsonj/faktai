import { useEffect, useState } from 'react';
import { getApiKeyStatus, regenerateApiKey, revokeApiKey, type ApiKeyStatus } from '../api-key-api';
import { API_BASE_URL } from '../lib-api';

function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString('cs-CZ') : '—';
}

/** Kořen API bez `/api/v1` – tam běží dokumentace (`/api/docs`). */
const DOCS_URL = `${API_BASE_URL.replace(/\/v1\/?$/, '')}/docs`;

export function SettingsApiKeyPage() {
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
    if (status?.exists && !window.confirm('Vygenerovat nový klíč? Stávající klíč okamžitě přestane fungovat.')) {
      return;
    }
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const { key, ...next } = await regenerateApiKey();
      setStatus(next);
      setNewKey(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vygenerování klíče selhalo');
    } finally {
      setBusy(false);
    }
  };

  const onRevoke = async () => {
    if (!window.confirm('Zrušit API klíč? Skripty, které ho používají, přestanou fungovat.')) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await revokeApiKey();
      setStatus({ exists: false, prefix: null, createdAt: null, lastUsedAt: null });
      setNewKey(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Zrušení klíče selhalo');
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
      setCopied(false);
    }
  };

  return (
    <section className="card card-narrow">
      <header className="page-head">
        <div>
          <p className="page-kicker">Nastavení</p>
          <h1 className="page-title">API klíč</h1>
          <p className="page-subtitle">
            Klíč umožní skriptům a integracím pracovat s doklady stejně jako vy v aplikaci.
          </p>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      {newKey && (
        <section className="ui-section">
          <h2>Nový API klíč</h2>
          <p className="helper-text">Zkopírujte si ho teď – po opuštění stránky ho už neuvidíte.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <code style={{ padding: '8px 10px', background: 'var(--bg-soft)', borderRadius: 8, wordBreak: 'break-all' }}>
              {newKey}
            </code>
            <button type="button" className="secondary" onClick={() => void onCopy()}>
              {copied ? 'Zkopírováno' : 'Kopírovat'}
            </button>
          </div>
        </section>
      )}

      <section className="ui-section">
        <h2>Stav</h2>
        {!status ? (
          <p>Načítám…</p>
        ) : status.exists ? (
          <dl>
            <dt>Klíč</dt>
            <dd>
              <code>{status.prefix}…</code>
            </dd>
            <dt>Vytvořen</dt>
            <dd>{formatDateTime(status.createdAt)}</dd>
            <dt>Naposledy použit</dt>
            <dd>{formatDateTime(status.lastUsedAt)}</dd>
          </dl>
        ) : (
          <p>API klíč zatím nemáte.</p>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" disabled={busy || !status} onClick={() => void onGenerate()}>
            {status?.exists ? 'Vygenerovat nový klíč' : 'Vygenerovat klíč'}
          </button>
          {status?.exists && (
            <button type="button" className="danger" disabled={busy} onClick={() => void onRevoke()}>
              Zrušit klíč
            </button>
          )}
        </div>
      </section>

      <section className="ui-section">
        <h2>Použití</h2>
        <p className="helper-text">
          Klíč posílejte v hlavičce <code>Authorization: Bearer fai_…</code>. Při vytváření dokladů můžete
          poslat hlavičku <code>Idempotency-Key</code>, aby opakovaný požadavek nevytvořil duplicitní fakturu.
        </p>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: 'var(--bg-soft)', padding: 12, borderRadius: 8 }}>
{`curl -H "Authorization: Bearer $FAKTAI_API_KEY" \\
  ${API_BASE_URL}/invoices`}
        </pre>
        <p>
          <a href={DOCS_URL} target="_blank" rel="noreferrer">
            Dokumentace API (OpenAPI)
          </a>
        </p>
      </section>
    </section>
  );
}
