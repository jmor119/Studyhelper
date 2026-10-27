import type { Role } from '@study-helper/shared';
import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { Spinner } from './components/ui';
import { useAuth } from './lib/auth';

const page = (load: () => Promise<{ default: ComponentType }>) => {
  const C = lazy(load);
  return (
    <Suspense fallback={<Spinner />}>
      <C />
    </Suspense>
  );
};

export const homeFor = (role: Role | undefined) => (role === 'parent' ? '/parent' : '/home');

function RequireAuth({ role, children }: { role?: Role; children?: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner className="min-h-dvh" />;
  if (!user) return <Navigate to={`/signin?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (!profile) return <Navigate to={`/onboarding?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (role && profile.role !== role) return <Navigate to={homeFor(profile.role)} replace />;
  return children ?? <Outlet />;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <Spinner className="min-h-dvh" />;
  if (user && profile) return <Navigate to={homeFor(profile.role)} replace />;
  return children;
}

function RequireAdmin() {
  const { isAdmin, loading } = useAuth();
  if (loading) return <Spinner />;
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}

export const router = createBrowserRouter([
  { path: '/', element: <PublicOnly>{page(() => import('./pages/shared/Landing'))}</PublicOnly> },
  { path: '/signin', element: <PublicOnly>{page(() => import('./pages/shared/SignIn'))}</PublicOnly> },
  { path: '/signup', element: <PublicOnly>{page(() => import('./pages/shared/SignUp'))}</PublicOnly> },
  { path: '/onboarding', element: page(() => import('./pages/shared/Onboarding')) },
  { path: '/join/:code', element: page(() => import('./pages/shared/Join')) },
  { path: '/oauth/consent', element: page(() => import('./pages/shared/OAuthConsent')) },
  { path: '/about', element: page(() => import('./pages/shared/About')) },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      {
        element: <RequireAuth role="student" />,
        children: [
          { path: '/home', element: page(() => import('./pages/student/Home')) },
          { path: '/learn', element: page(() => import('./pages/student/Learn')) },
          { path: '/learn/:topicId', element: page(() => import('./pages/student/Topic')) },
          { path: '/lesson/:topicId', element: page(() => import('./pages/student/LessonPlayer')) },
          { path: '/practice/:topicId', element: page(() => import('./pages/student/Practice')) },
          { path: '/mistakes', element: page(() => import('./pages/student/Mistakes')) },
          { path: '/exams', element: page(() => import('./pages/student/Exams')) },
          { path: '/exams/:examId', element: page(() => import('./pages/student/ExamTake')) },
          { path: '/exams/:examId/results', element: page(() => import('./pages/student/ExamResults')) },
          { path: '/flashcards', element: page(() => import('./pages/student/Flashcards')) },
          { path: '/planner', element: page(() => import('./pages/student/Planner')) },
          { path: '/tutor', element: page(() => import('./pages/student/Tutor')) },
          { path: '/tutor/:chatId', element: page(() => import('./pages/student/Tutor')) },
          { path: '/help', element: page(() => import('./pages/student/HomeworkHelp')) },
          { path: '/notes', element: page(() => import('./pages/student/Notes')) },
          { path: '/notes/:setId', element: page(() => import('./pages/student/Notes')) },
          { path: '/progress', element: page(() => import('./pages/student/Progress')) },
          { path: '/collection', element: page(() => import('./pages/student/Collection')) },
        ],
      },
      {
        element: <RequireAuth role="parent" />,
        children: [
          { path: '/parent', element: page(() => import('./pages/parent/Family')) },
          { path: '/parent/child/:uid', element: page(() => import('./pages/parent/Child')) },
        ],
      },
      { path: '/settings', element: page(() => import('./pages/shared/Settings')) },
      { element: <RequireAdmin />, children: [{ path: '/admin', element: page(() => import('./pages/admin/Admin')) }] },
    ],
  },
  { path: '*', element: page(() => import('./pages/shared/NotFound')) },
]);
