import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';

type ProtectedRouteProps = {
  children: React.ReactNode;
  requireSubject?: boolean;
};

export function ProtectedRoute({ children, requireSubject = false }: ProtectedRouteProps) {
  const { me, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Načítám…
      </div>
    );
  }

  if (!me) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (requireSubject && !me.hasSubject) {
    return <Navigate to="/onboarding/subject" replace />;
  }

  return <>{children}</>;
}
