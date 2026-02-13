import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { AuthLayout } from './components/AuthLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { InvoiceCopyPage } from './pages/InvoiceCopyPage';
import { InvoiceDetailPage } from './pages/InvoiceDetailPage';
import { InvoiceEditorPage } from './pages/InvoiceEditorPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OnboardingStartPage } from './pages/OnboardingStartPage';
import { OnboardingSubjectPage } from './pages/OnboardingSubjectPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SettingsSubjectPage } from './pages/SettingsSubjectPage';
import { TaxReportsPage } from './pages/TaxReportsPage';

function ScrollToTopOnNavigate() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}

function App() {
  return (
    <>
      <ScrollToTopOnNavigate />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/onboarding/start" element={<OnboardingStartPage />} />
        <Route path="/auth" element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<Navigate to="/onboarding/start" replace />} />
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
            <ProtectedRoute requireSubject>
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
    </>
  );
}

export default App;
