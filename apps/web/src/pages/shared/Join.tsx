import { listNames, type InviteKind } from '@study-helper/shared';
import { Link2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Button, ButtonLink, Notice, Spinner } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { homeFor } from '../../routes';
import { AuthLayout } from './AuthLayout';

/** Accepting a family invite link: /join/ABCD-EFGH */
export default function Join() {
  const { code = '' } = useParams();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<{ fromName: string; fromRole: string; forRole: string; kind?: InviteKind; childNames?: string[] } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ name: string; coParent: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;
    api
      .peekInvite({ code })
      .then(setInvite)
      .catch((e) => setError(errorMessage(e)));
  }, [user, code]);

  if (loading) return <Spinner className="min-h-dvh" />;
  const here = `/join/${code}`;
  if (!user) {
    return (
      <AuthLayout title="You’ve been invited" subtitle="Sign in or create an account to link with your family member.">
        <div className="grid grid-cols-1 gap-3">
          <ButtonLink to={`/signup?next=${encodeURIComponent(here)}`} size="lg">
            Create an account
          </ButtonLink>
          <ButtonLink to={`/signin?next=${encodeURIComponent(here)}`} size="lg" variant="secondary">
            I already have an account
          </ButtonLink>
        </div>
      </AuthLayout>
    );
  }
  if (!profile) {
    const role = invite?.forRole;
    return <Navigate to={`/onboarding?next=${encodeURIComponent(here)}${role ? `&role=${role}` : ''}`} replace />;
  }

  const accept = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.acceptInvite({ code });
      setDone({ name: res.otherName, coParent: res.kind === 'coparent' });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Link your accounts">
      {done ? (
        <div className="grid grid-cols-1 gap-4">
          <Notice tone="good" title="You’re linked!">
            {done.coParent ? `You and ${done.name} are now co-parents. You’ll find your children on your Family page.` : `You and ${done.name} are now connected.`}
          </Notice>
          <Button onClick={() => navigate(homeFor(profile.role))}>Continue</Button>
        </div>
      ) : error ? (
        <div className="grid grid-cols-1 gap-4">
          <Notice tone="bad">{error}</Notice>
          <ButtonLink to={homeFor(profile.role)} variant="secondary">
            Go home
          </ButtonLink>
        </div>
      ) : !invite ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-4 dark:bg-brand-950">
            <Link2 className="mt-0.5 size-6 text-brand-700" />
            {invite.kind === 'coparent' ? (
              <p>
                <b>{invite.fromName}</b> has invited you to be a <b>co-parent</b>.
                {invite.childNames?.length ? ` You’ll both see how ${listNames(invite.childNames)} ${invite.childNames.length === 1 ? 'is' : 'are'} getting on` : ' You’ll share your children'}
                , and you can set goals and rewards together.
              </p>
            ) : (
              <p>
                <b>{invite.fromName}</b> has invited you to link as their <b>{invite.forRole}</b>.
                {invite.forRole === 'parent' ? ' You’ll be able to see their progress, chats with the tutor, and set goals.' : ' They’ll be able to see your progress and your tutor chats, and set goals with you.'}
              </p>
            )}
          </div>
          {invite.forRole !== profile.role && (
            <Notice tone="warn">This invite is for a {invite.forRole} account, but you’re signed in as a {profile.role}. Sign in with a different account to accept it.</Notice>
          )}
          <Button size="lg" onClick={accept} loading={busy} disabled={invite.forRole !== profile.role}>
            Accept and link
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
