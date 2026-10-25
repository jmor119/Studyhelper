import { Check, Plug, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { Button, ButtonLink, Notice, Spinner } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { AuthLayout } from './AuthLayout';

const CAN: Record<'student' | 'parent', string[]> = {
  student: [
    'Give you practice questions and mark your answers',
    'See your progress, topic mastery and recent mistakes',
    'See your study plans and exam dates',
    'Suggest practice questions for your family (checked before anyone else sees them)',
  ],
  parent: [
    'See your linked children’s progress and exam results',
    'Read your children’s tutor chats',
    'Set goals and rewards for your children',
    'Suggest practice questions for your family (checked before anyone else sees them)',
  ],
};

const CANNOT = ['See your password or AI keys', 'Change your account, family links or settings'];

function isExpired(e: unknown) {
  return !!e && typeof e === 'object' && 'code' in e && String((e as { code: unknown }).code).endsWith('not-found');
}

/** OAuth consent for MCP clients (Claude, ChatGPT…): /oauth/consent?request=<id> */
export default function OAuthConsent() {
  const [params] = useSearchParams();
  const location = useLocation();
  const requestId = params.get('request') ?? '';
  const { user, profile, loading, signOut } = useAuth();
  const [request, setRequest] = useState<{ clientName: string; redirectHost: string } | null>(null);
  const [error, setError] = useState<{ expired: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState<'allow' | 'deny' | null>(null);
  const here = location.pathname + location.search;
  const ready = !!user && !!profile;

  useEffect(() => {
    if (!ready || !requestId) return;
    setError(null);
    api
      .oauthGetRequest({ requestId })
      .then(setRequest)
      .catch((e) => setError({ expired: isExpired(e), message: errorMessage(e) }));
  }, [ready, requestId]);

  if (loading) return <Spinner className="min-h-dvh" />;

  if (!requestId) {
    return (
      <AuthLayout title="Nothing to approve">
        <p className="text-muted">This link is missing its sign-in request. Go back to the app you were connecting and start again.</p>
      </AuthLayout>
    );
  }

  if (!user) {
    return (
      <AuthLayout title="Connect an app to Study Helper" subtitle="Sign in first, then you can choose whether to allow access.">
        <div className="grid grid-cols-1 gap-3">
          <ButtonLink to={`/signin?next=${encodeURIComponent(here)}`} size="lg">
            Sign in
          </ButtonLink>
          <ButtonLink to={`/signup?next=${encodeURIComponent(here)}`} size="lg" variant="secondary">
            Create an account
          </ButtonLink>
        </div>
      </AuthLayout>
    );
  }

  if (!profile) {
    return (
      <AuthLayout title="Finish setting up first" subtitle="Your Study Helper account needs a couple of details before you can connect apps.">
        <ButtonLink to={`/onboarding?next=${encodeURIComponent(here)}`} size="lg" className="w-full">
          Finish setting up
        </ButtonLink>
      </AuthLayout>
    );
  }

  const decide = async (approve: boolean) => {
    setBusy(approve ? 'allow' : 'deny');
    try {
      const { redirectTo } = await api.oauthDecide({ requestId, approve });
      window.location.assign(redirectTo); // keep the buttons busy while the browser leaves
    } catch (e) {
      setError({ expired: isExpired(e), message: errorMessage(e) });
      setBusy(null);
    }
  };

  const switchAccount = (
    <>
      Signed in as <b className="text-ink">{profile.displayName}</b> ({profile.role}).{' '}
      <button type="button" onClick={() => void signOut()} className="font-semibold text-brand-700 underline dark:text-brand-300">
        Not you?
      </button>
    </>
  );

  if (error) {
    return (
      <AuthLayout title={error.expired ? 'This request has expired' : 'Something went wrong'} footer={switchAccount}>
        <Notice tone={error.expired ? 'warn' : 'bad'}>
          {error.expired ? 'Sign-in requests only last 15 minutes and work once. Go back to the app you were connecting and try again.' : error.message}
        </Notice>
      </AuthLayout>
    );
  }

  if (!request) {
    return (
      <AuthLayout title="Connect an app">
        <Spinner />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={
        <>
          <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300" aria-hidden>
            <Plug className="size-6" />
          </span>
          {request.clientName} wants to connect to your Study Helper account
        </>
      }
      footer={switchAccount}
    >
      <div className="grid grid-cols-1 gap-5">
        <div>
          <h2 className="text-sm font-bold">It will be able to</h2>
          <ul className="mt-2 grid grid-cols-1 gap-1.5 text-sm">
            {CAN[profile.role].map((c) => (
              <li key={c} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-good" aria-hidden />
                <span>{c}</span>
              </li>
            ))}
          </ul>
          <h2 className="mt-4 text-sm font-bold">It won’t be able to</h2>
          <ul className="mt-2 grid grid-cols-1 gap-1.5 text-sm">
            {CANNOT.map((c) => (
              <li key={c} className="flex gap-2">
                <X className="mt-0.5 size-4 shrink-0 text-bad" aria-hidden />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="rounded-xl bg-canvas p-3 text-sm text-muted">
          After you choose, you’ll go back to <b className="break-all text-ink">{request.redirectHost}</b>. Only allow apps you trust. You can disconnect it any time in Settings → Connect AI apps.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button variant="secondary" size="lg" onClick={() => decide(false)} loading={busy === 'deny'} disabled={!!busy}>
            Deny
          </Button>
          <Button size="lg" onClick={() => decide(true)} loading={busy === 'allow'} disabled={!!busy}>
            Allow
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
