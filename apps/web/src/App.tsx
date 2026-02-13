import { useEffect, useState } from 'react';

type HealthResponse = {
  service: 'api';
  status: 'ok';
  timestamp: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  `${window.location.protocol}//${window.location.hostname}:4000/api/v1`;

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (!response.ok) {
          throw new Error(`Health check failed (${response.status})`);
        }
        const payload = (await response.json()) as HealthResponse;
        setHealth(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown health error');
      }
    };

    void run();
  }, []);

  return (
    <main className="app-shell">
      <section className="card">
        <h1>TappyFaktur</h1>
        <p>Foundation iterace je připravená. API dostupnost:</p>
        {health ? (
          <ul>
            <li>service: {health.service}</li>
            <li>status: {health.status}</li>
            <li>timestamp: {new Date(health.timestamp).toLocaleString('cs-CZ')}</li>
          </ul>
        ) : (
          <p>{error ? `Chyba: ${error}` : 'Načítám health...'}</p>
        )}
      </section>
    </main>
  );
}

export default App;
