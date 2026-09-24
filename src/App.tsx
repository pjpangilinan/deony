import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ui/useToast';
import { ThemeProvider } from './providers/ThemeProvider';

// Lazy-loaded route components for fast initial load & optimal code splitting
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage').then(m => ({ default: m.PublicProfilePage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const LibraryPage = lazy(() => import('./pages/LibraryPage').then(m => ({ default: m.LibraryPage })));
const DeonysusPage = lazy(() => import('./pages/DeonysusPage').then(m => ({ default: m.DeonysusPage })));
const LogExperiencePage = lazy(() => import('./pages/LogExperiencePage').then(m => ({ default: m.LogExperiencePage })));
const ExperienceDetailPage = lazy(() => import('./pages/ExperienceDetailPage').then(m => ({ default: m.ExperienceDetailPage })));
const EditExperiencePage = lazy(() => import('./pages/EditExperiencePage').then(m => ({ default: m.EditExperiencePage })));
const ManageCategoriesPage = lazy(() => import('./pages/ManageCategoriesPage').then(m => ({ default: m.ManageCategoriesPage })));
const TimelinePage = lazy(() => import('./pages/TimelinePage').then(m => ({ default: m.TimelinePage })));
const StatisticsPage = lazy(() => import('./pages/StatisticsPage').then(m => ({ default: m.StatisticsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

function RouteLoadingFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-sm">
        <span className="material-symbols-outlined text-[32px] text-primary animate-spin">
          progress_activity
        </span>
        <span className="font-caption text-xs text-secondary tracking-widest uppercase">
          Loading Sanctuary...
        </span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <Router>
              <Suspense fallback={<RouteLoadingFallback />}>
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
                      <Route path="/deonysus" element={<DeonysusPage />} />
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
              </Suspense>
            </Router>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
