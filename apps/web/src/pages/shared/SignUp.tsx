import { createUserWithEmailAndPassword, GoogleAuthProvider, sendEmailVerification, signInWithPopup, updateProfile } from 'firebase/auth';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button, Field, Input, Notice } from '../../components/ui';
import { auth } from '../../lib/firebase';
import { AuthLayout, GoogleIcon } from './AuthLayout';

export default function SignUp() {
  const [params] = useSearchParams();
  const next = params.get('next') ?? '';
  const role = params.get('role');
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onboarding = `/onboarding?${new URLSearchParams({ ...(next && { next }), ...(role && { role }) })}`;

  const google = async () => {
    setError('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      navigate(onboarding, { replace: true });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== 'auth/popup-closed-by-user') setError('Google sign-up failed. Please try again.');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Use at least 8 characters for your password.');
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name.trim() });
      void sendEmailVerification(cred.user).catch(() => undefined);
      navigate(onboarding, { replace: true });
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(
        code === 'auth/email-already-in-use'
          ? 'That email already has an account — sign in instead.'
          : code === 'auth/invalid-email'
            ? 'That email address doesn’t look right.'
            : code === 'auth/weak-password'
              ? 'Choose a stronger password.'
              : 'Couldn’t create the account. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="For students and parents. Parents can also create accounts for younger children."
      footer={
        <>
          Already have an account?{' '}
          <Link to={`/signin${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-brand-700 dark:text-brand-300">
            Sign in
          </Link>
        </>
      }
    >
      <Button variant="secondary" size="lg" className="w-full" onClick={google} icon={<GoogleIcon />}>
        Sign up with Google
      </Button>
      <p className="mt-2 text-center text-xs text-muted">Google accounts need you to be 13 or older. Younger children: ask a parent to set up your account.</p>
      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" /> or use email <span className="h-px flex-1 bg-line" />
      </div>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Your first name">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" required maxLength={60} />
        </Field>
        <Field label="Email">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="new-password" required />
        </Field>
        {error && <Notice tone="bad">{error}</Notice>}
        <Button type="submit" size="lg" loading={busy}>
          Create account
        </Button>
        <p className="text-xs text-muted">
          By signing up you agree to our <Link to="/about#privacy" className="underline">privacy policy</Link>.
        </p>
      </form>
    </AuthLayout>
  );
}
