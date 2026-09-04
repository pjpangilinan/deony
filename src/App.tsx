import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import { AuthPage } from './pages/AuthPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';

import { LandingPage } from './pages/LandingPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { LibraryPage } from './pages/LibraryPage';
import { LogExperiencePage } from './pages/LogExperiencePage';
import { ExperienceDetailPage } from './pages/ExperienceDetailPage';
import { EditExperiencePage } from './pages/EditExperiencePage';
import { ManageCategoriesPage } from './pages/ManageCategoriesPage';
import { TimelinePage } from './pages/TimelinePage';
import { StatisticsPage } from './pages/StatisticsPage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { ToastProvider } from './components/ui/useToast';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <Router>
          <Routes>
            <Route element={<AppLayout />}>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/u/:username" element={<PublicProfilePage />} />
              <Route path="/profile/:username" element={<PublicProfilePage />} />
              
              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/home" element={<Navigate to="/library" replace />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/log" element={<LogExperiencePage />} />
                <Route path="/experience/:id" element={<ExperienceDetailPage />} />
                <Route path="/experience/:id/edit" element={<EditExperiencePage />} />
                <Route path="/categories" element={<ManageCategoriesPage />} />
                <Route path="/timeline" element={<TimelinePage />} />
                <Route path="/stats" element={<StatisticsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              {/* Catch-all 404 */}
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
