import type { StudentStats, UserProfile } from '@study-helper/shared';
import { onAuthStateChanged, signOut as fbSignOut, type User } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, db } from './firebase';
import { useDoc } from './hooks';

interface AuthState {
  user: User | null;
  /** null = signed in but not onboarded yet. */
  profile: (UserProfile & { id: string }) | null;
  stats: (StudentStats & { id: string }) | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        setUser(u);
        if (u) {
          const token = await u.getIdTokenResult();
          setIsAdmin(token.claims.admin === true);
        } else setIsAdmin(false);
        setAuthLoading(false);
      }),
    [],
  );

  const profileState = useDoc<UserProfile>(user ? doc(db, 'users', user.uid) : null, user ? `users/${user.uid}` : null);
  const isStudent = profileState.data?.role === 'student';
  const statsState = useDoc<StudentStats>(user && isStudent ? doc(db, 'students', user.uid) : null, user && isStudent ? `students/${user.uid}` : null);

  // Keep the theme in sync with the profile preference.
  const theme = profileState.data?.prefs?.theme;
  useEffect(() => {
    if (!theme) return;
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* storage blocked */
    }
    const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  }, [theme]);

  const value: AuthState = {
    user,
    profile: profileState.data,
    stats: statsState.data,
    isAdmin,
    loading: authLoading || (!!user && profileState.loading),
    signOut: () => fbSignOut(auth),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}

/** For pages that require a signed-in, onboarded user. */
export function useUser(): AuthState & { user: User; profile: UserProfile & { id: string } } {
  const a = useAuth();
  if (!a.user || !a.profile) throw new Error('useUser requires a signed-in, onboarded user');
  return a as AuthState & { user: User; profile: UserProfile & { id: string } };
}
