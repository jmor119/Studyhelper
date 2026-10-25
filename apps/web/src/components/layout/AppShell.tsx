import { nzDateKey } from '@study-helper/shared/dates';
import { currentStreak, levelForXp, xpForLevel } from '@study-helper/shared/gamification';
import clsx from 'clsx';
import {
  BookOpen,
  Brain,
  CalendarDays,
  ClipboardCheck,
  Flame,
  GraduationCap,
  Home,
  Layers,
  LogOut,
  Menu,
  MessageCircle,
  NotebookPen,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../../lib/auth';
import { usingEmulators } from '../../lib/firebase';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const studentNav: NavItem[] = [
  { to: '/home', label: 'Home', icon: <Home className="size-5" /> },
  { to: '/learn', label: 'Learn', icon: <BookOpen className="size-5" /> },
  { to: '/exams', label: 'Mock exams', icon: <ClipboardCheck className="size-5" /> },
  { to: '/flashcards', label: 'Flashcards', icon: <Layers className="size-5" /> },
  { to: '/planner', label: 'Study planner', icon: <CalendarDays className="size-5" /> },
  { to: '/tutor', label: 'AI tutor', icon: <MessageCircle className="size-5" /> },
  { to: '/help', label: 'Homework help', icon: <GraduationCap className="size-5" /> },
  { to: '/notes', label: 'My notes', icon: <NotebookPen className="size-5" /> },
  { to: '/progress', label: 'Progress', icon: <TrendingUp className="size-5" /> },
];

const parentNav: NavItem[] = [
  { to: '/parent', label: 'Family', icon: <Users className="size-5" /> },
  { to: '/settings', label: 'Settings', icon: <Settings className="size-5" /> },
];

const mobileStudent = ['/home', '/learn', '/exams', '/tutor'];

function StreakXp() {
  const { stats } = useAuth();
  if (!stats) return null;
  const streak = currentStreak(stats, nzDateKey());
  const level = levelForXp(stats.xp);
  const inLevel = stats.xp - xpForLevel(level);
  const needed = xpForLevel(level + 1) - xpForLevel(level);
  return (
    <div className="flex items-center gap-3 text-sm font-bold">
      <span className={clsx('inline-flex items-center gap-1', streak ? 'text-streak' : 'text-muted')} title={`${streak}-day streak`}>
        <Flame className="size-5" />
        {streak}
      </span>
      <span className="inline-flex items-center gap-1 text-xp" title={`Level ${level}: ${inLevel}/${needed} XP to the next level`}>
        <Sparkles className="size-5" />
        {stats.xp.toLocaleString('en-NZ')}
      </span>
      <span className="hidden rounded-full bg-brand-100 px-2 py-0.5 text-brand-800 sm:inline dark:bg-brand-900 dark:text-brand-200">Lv {level}</span>
    </div>
  );
}

export function AppShell() {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const isParent = profile?.role === 'parent';
  const nav = [...(isParent ? parentNav : studentNav), ...(isParent ? [] : [{ to: '/settings', label: 'Settings', icon: <Settings className="size-5" /> }])];
  if (isAdmin) nav.push({ to: '/admin', label: 'Admin', icon: <Shield className="size-5" /> });

  const link = (item: NavItem, compact = false) => (
    <NavLink
      key={item.to}
      to={item.to}
      onClick={() => setMenuOpen(false)}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
          compact && 'flex-col gap-1 px-1 py-1.5 text-[11px]',
          isActive ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-200' : 'text-muted hover:bg-black/5 hover:text-ink dark:hover:bg-white/5',
        )
      }
    >
      {item.icon}
      <span>{item.label}</span>
    </NavLink>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <img src="/icon.svg" alt="" className="size-9" />
          <span className="text-lg font-extrabold tracking-tight">Study Helper</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">{nav.map((n) => link(n))}</nav>
        <div className="border-t border-line p-3">
          <p className="truncate px-3 text-sm font-semibold">{profile?.displayName}</p>
          <p className="px-3 text-xs text-muted">{isParent ? 'Parent' : `Year ${profile?.yearLevel ?? ''} student`}</p>
          <button
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
            className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-black/5"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur lg:px-8">
        <div className="flex items-center gap-2 lg:hidden">
          <img src="/icon.svg" alt="" className="size-7" />
          <span className="font-extrabold">Study Helper</span>
        </div>
        <div className="hidden lg:block">{usingEmulators && <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-900">Local dev (emulators)</span>}</div>
        <div className="flex items-center gap-3">
          {!isParent && <StreakXp />}
          <button className="rounded-lg p-2 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Menu">
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-5xl px-4 pt-6 pb-28 lg:px-8 lg:pb-12">
        <Outlet />
      </main>

      {/* Bottom nav (phones/tablets) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-1 border-t border-line bg-surface px-2 pt-1 pb-[max(env(safe-area-inset-bottom),0.4rem)] lg:hidden">
        {(isParent ? parentNav : studentNav.filter((n) => mobileStudent.includes(n.to))).map((n) => link(n, true))}
        <button onClick={() => setMenuOpen(true)} className="flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold text-muted">
          <Brain className="size-5" />
          More
        </button>
      </nav>

      {/* Slide-over menu (phones/tablets) */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-72 flex-col bg-surface p-3 shadow-xl">
            <p className="px-3 py-2 font-bold">{profile?.displayName}</p>
            <nav className="flex-1 space-y-1 overflow-y-auto">{nav.map((n) => link(n))}</nav>
            <button
              onClick={async () => {
                await signOut();
                navigate('/');
              }}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-black/5"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
