import { GoogleAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button, Field, Input, Notice, Tabs } from '../../components/ui';
import { auth, usernameToEmail } from '../../lib/firebase';
import { AuthLayout, GoogleIcon } from './AuthLayout';

function authError(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return "That username/email and password don't match.";
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes and try again.';
    case 'auth/popup-closed-by-user':
      return '';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in window. Allow pop-ups and try again.';
    case 'auth/network-request-failed':
      return 'No internet connection.';
    default:
      return 'Sign-in failed. Please try again.';
  }
}

export default function SignIn() {
  const [params] = useSearchParams();
  const next = params.get('next') ?? '';
  const navigate = useNavigate();
  const [mode, setMode] = useState<'email' | 'username'>('email');
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const done = () => navigate(next || '/onboarding', { replace: true });

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const email = mode === 'username' ? usernameToEmail(id) : id.trim();
      await signInWithEmailAndPassword(auth, email, password);
      done();
    } catch (err) {
      setError(authError((err as { code?: string }).code ?? ''));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      done();
    } catch (err) {
      setError(authError((err as { code?: string }).code ?? ''));
    }
  };

  const reset = async () => {
    if (mode === 'username') {
      setInfo('Ask the parent who set up your account to reset your password from their Family page.');
      return;
    }
    if (!id.includes('@')) {
      setError('Type your email address first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, id.trim());
    } catch {
      /* don't reveal whether the address exists */
    }
    setInfo('If that email has an account, a reset link is on its way.');
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to keep studying."
      footer={
        <>
          New here?{' '}
          <Link to={`/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-brand-700 dark:text-brand-300">
            Create an account
          </Link>
        </>
      }
    >
      <Button variant="secondary" size="lg" className="w-full" onClick={google} icon={<GoogleIcon />}>
        Continue with Google
      </Button>
      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      <Tabs
        className="mb-4 w-full"
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError('');
          setInfo('');
        }}
        options={[
          { value: 'email', label: 'Email' },
          { value: 'username', label: 'Username' },
        ]}
      />
      <form onSubmit={signIn} className="grid grid-cols-1 gap-4">
        <Field label={mode === 'email' ? 'Email' : 'Username'} hint={mode === 'username' ? 'For accounts a parent set up for you.' : undefined}>
          <Input
            value={id}
            onChange={(e) => setId(e.target.value)}
            type={mode === 'email' ? 'email' : 'text'}
            autoComplete={mode === 'email' ? 'email' : 'username'}
            autoCapitalize="off"
            required
          />
        </Field>
        <Field label="Password">
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required />
        </Field>
        {error && <Notice tone="bad">{error}</Notice>}
        {info && <Notice tone="info">{info}</Notice>}
        <Button type="submit" size="lg" loading={busy}>
          Sign in
        </Button>
        <button type="button" onClick={reset} className="text-sm font-semibold text-muted hover:text-ink">
          Forgot your password?
        </button>
      </form>
    </AuthLayout>
  );
}
