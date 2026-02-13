import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { AppLayout } from './components/AppLayout';
import { AuthLayout } from './components/AuthLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { InvoiceCopyPage } from './pages/InvoiceCopyPage';
import { InvoiceDetailPage } from './pages/InvoiceDetailPage';
import { InvoiceEditorPage } from './pages/InvoiceEditorPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OnboardingSubjectPage } from './pages/OnboardingSubjectPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SettingsSubjectPage } from './pages/SettingsSubjectPage';
import { TaxReportsPage } from './pages/TaxReportsPage';

function RootRedirect() {
  const { me, loading } = useAuth();

  if (loading) {
    return (
      <main className="app-shell">
        <section className="card">Načítání...</section>
      </main>
    );
  }

  if (!me) {
    return <Navigate to="/auth/login" replace />;
  }

  return <Navigate to={me.hasSubject ? '/invoices' : '/onboarding/subject'} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/auth" element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
      </Route>
      <Route
        path="/onboarding/subject"
        element={
          <ProtectedRoute>
            <OnboardingSubjectPage />
          </ProtectedRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/invoices/new" element={<InvoiceEditorPage mode="create" />} />
        <Route path="/invoices/:invoiceId" element={<InvoiceDetailPage />} />
        <Route path="/invoices/:invoiceId/edit" element={<InvoiceEditorPage mode="edit" />} />
        <Route path="/invoices/:invoiceId/copy" element={<InvoiceCopyPage />} />
        <Route path="/settings/subject" element={<SettingsSubjectPage />} />
        <Route path="/tax-reports" element={<TaxReportsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
