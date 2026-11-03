import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../auth/auth-context';
import { APP_NAME } from '../brand';
import { PublicLayout } from '../components/PublicLayout';
import { LANDING_HIGHLIGHTS } from '../landing-copy';
import { Button } from '@/components/ui/button';

const LANDING_FEATURE_IMAGES = [
  { src: '/graphics/landing-feature-1.webp', alt: 'Ilustrace rychlého vystavení faktury s PDF a QR platbou' },
  { src: '/graphics/landing-feature-2.webp', alt: 'Ilustrace XML exportu pro DPH a kontrolní hlášení' },
  { src: '/graphics/landing-feature-3.webp', alt: 'Ilustrace profesionálního PDF výstupu připraveného k odeslání klientovi' },
] as const;

export function LandingPage() {
  const { me, loading } = useAuth();
  const appTarget = me?.hasSubject ? '/invoices' : '/onboarding/subject';

  return (
    <PublicLayout width="wide">
      <section className="grid grid-cols-1 items-center gap-10 py-6 md:grid-cols-2 md:py-12">
        <div className="flex flex-col gap-5">
          <h1 className="m-0 text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
            {APP_NAME} – fakturační systém, který fakt naprogramovala AI
          </h1>
          <p className="m-0 text-lg text-muted-foreground">
            Vystavíš fakturu, pohlídáš DPH a stáhneš XML pro finanční úřad bez zbytečného dramatu.
          </p>
          <p className="m-0 text-muted-foreground">
            Primárně pro OSVČ, kteří jsou plátci DPH a daní procentem z příjmu. Méně administrativy, víc času na
            práci, která tě živí.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {!loading && !me && (
              <>
                <Button size="lg" asChild>
                  <Link to="/onboarding/start" className="no-underline">
                    Vytvořit účet
                    <ArrowRight />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/auth/login" className="no-underline">
                    Přihlášení
                  </Link>
                </Button>
              </>
            )}
            {!loading && me && (
              <Button size="lg" asChild>
                <Link to={appTarget} className="no-underline">
                  Pokračovat do aplikace
                  <ArrowRight />
                </Link>
              </Button>
            )}
          </div>
        </div>
        <img
          src="/graphics/landing-hero.webp"
          alt="Náhled hlavních funkcí FaktAI: fakturace, DPH a XML export"
          className="w-full rounded-2xl border bg-card"
        />
      </section>

      <section className="flex flex-col gap-6 py-10">
        <h2 className="m-0 text-2xl font-bold tracking-tight">Co už dnes umí</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {LANDING_HIGHLIGHTS.map((item, index) => (
            <article key={item.title} className="flex flex-col gap-3 rounded-xl border bg-card p-5">
              <img
                src={LANDING_FEATURE_IMAGES[index]?.src}
                alt={LANDING_FEATURE_IMAGES[index]?.alt || item.title}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-lg object-cover"
              />
              <h3 className="m-0 text-base font-semibold">{item.title}</h3>
              <p className="m-0 text-sm text-muted-foreground">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        <strong className="text-foreground">Dobré vědět:</strong> Postaveno pomocí AI. Zdarma, bez záruky, ale
        s dobrými úmysly. Více informací na stránce projektu na{' '}
        <a href="https://github.com/sarsonj/faktai" target="_blank" rel="noreferrer">
          GitHubu
        </a>
        .
      </section>
    </PublicLayout>
  );
}
