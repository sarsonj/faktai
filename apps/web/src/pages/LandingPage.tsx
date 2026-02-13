import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { APP_NAME, APP_SHORT_NAME } from '../brand';
import { SiteHeader } from '../components/SiteHeader';

const HIGHLIGHTS = [
  {
    title: 'Faktura za minutu, ne za půl dne',
    text: 'Automatické číslování, variabilní symbol i QR platba. Ty řešíš práci, ne formátování.',
  },
  {
    title: 'DPH bez tabulkového maratonu',
    text: 'Přiznání k DPH i kontrolní hlášení exportuješ do XML připraveného pro finanční úřad.',
  },
  {
    title: 'Výstupy, které vypadají dospěle',
    text: 'PDF faktury působí profesionálně, takže se nemusíš stydět je poslat klientovi.',
  },
];

export function LandingPage() {
  const { me, loading } = useAuth();
  const appTarget = me?.hasSubject ? '/invoices' : '/onboarding/subject';

  return (
    <main className="app-shell">
      <div className="page-stack">
        <SiteHeader showGuestActions={false} />
        <section className="landing-hero">
          <p className="landing-kicker">{APP_SHORT_NAME}</p>
          <h1>{APP_NAME} - fakturační systém, který naprogramovala kompletně AI</h1>
          <p className="landing-subtitle">
            Vystavíš fakturu, pohlídáš DPH a stáhneš XML pro finanční úřad bez zbytečného dramatu.
          </p>
          <p className="landing-description">
            Primárně pro OSVČ, kteří jsou plátci DPH a daní procentem z příjmu.
            Méně administrativy, víc času na práci, která tě živí.
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
          <h2>Dobré vědět...</h2>
          <p>
            Postaveno pomocí AI. Zdarma, bez záruky, ale s dobrými úmysly.
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
