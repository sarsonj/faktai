import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { APP_NAME, APP_SHORT_NAME, APP_TAGLINE } from '../brand';
import { SiteHeader } from '../components/SiteHeader';

const HIGHLIGHTS = [
  {
    title: 'Faktury během minut',
    text: 'Roční číselná řada, průběžné výpočty DPH, PDF s QR platbou a rychlá editace dokladů.',
  },
  {
    title: 'Daňové exporty pro FU',
    text: 'Export XML pro Přiznání k DPH i Kontrolní hlášení včetně správného názvu souboru.',
  },
  {
    title: 'Onboarding s pomocí registrů',
    text: 'Načtení firmy přes ARES a asistované doplnění adresy pro rychlé založení profilu.',
  },
];

export function LandingPage() {
  const { me, loading } = useAuth();
  const appTarget = me?.hasSubject ? '/invoices' : '/onboarding/subject';

  return (
    <main className="app-shell">
      <div className="page-stack">
        <SiteHeader />
        <section className="landing-hero">
          <p className="landing-kicker">{APP_SHORT_NAME}</p>
          <h1>{APP_NAME}</h1>
          <p className="landing-subtitle">{APP_TAGLINE}</p>
          <p className="landing-description">
            Praktická webová aplikace pro OSVČ, kteří jsou plátci DPH a daní procentem z příjmu.
            Pomůže pokrýt fakturaci, PDF doklady i podklady pro daňová podání bez zbytečných kroků.
          </p>

          <div className="landing-actions">
            {!loading && !me && (
              <>
                <Link className="action-link" to="/onboarding/start">
                  Vytvořit účet
                </Link>
                <Link className="action-link secondary-link" to="/auth/login">
                  Přihlášení
                </Link>
              </>
            )}
            {!loading && me && (
              <Link className="action-link" to={appTarget}>
                Pokračovat do aplikace
              </Link>
            )}
          </div>
        </section>

        <section className="landing-section">
          <h2>Co je to za projekt</h2>
          <p>
            Projekt je vytvořený a průběžně spravovaný pomocí AI asistenta Codex. Je poskytován zdarma a bez záruky.
          </p>
        </section>

        <section className="landing-section">
          <h2>Co už dnes umí</h2>
          <div className="landing-grid">
            {HIGHLIGHTS.map((item) => (
              <article key={item.title} className="landing-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
