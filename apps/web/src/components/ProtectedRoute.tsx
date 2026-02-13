import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { me, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="app-shell">
        <section className="card">Načítání session...</section>
      </main>
    );
  }

  if (!me) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
