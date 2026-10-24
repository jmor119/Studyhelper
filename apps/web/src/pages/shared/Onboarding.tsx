import { supportedYearLevels, type Role } from '@study-helper/shared';
import clsx from 'clsx';
import { GraduationCap, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { Button, Field, Input, Notice, Select, Spinner } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { homeFor } from '../../routes';
import { AuthLayout } from './AuthLayout';

export default function Onboarding() {
  const { user, profile, loading } = useAuth();
  const [params] = useSearchParams();
  const next = params.get('next');
  const [role, setRole] = useState<Role | null>((params.get('role') as Role | null) ?? null);
  const [name, setName] = useState('');
  const [year, setYear] = useState(9);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.displayName && !name) setName(user.displayName.split(' ')[0] ?? '');
  }, [user, name]);

  if (loading) return <Spinner className="min-h-dvh" />;
  if (!user) return <Navigate to="/signin" replace />;
  if (profile) return <Navigate to={next ?? homeFor(profile.role)} replace />;

  const years = [...new Set([...supportedYearLevels(), 6, 7, 8, 9, 10, 11, 12, 13])].sort((a, b) => a - b);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    setBusy(true);
    setError('');
    try {
      await api.completeOnboarding({ role, displayName: name.trim(), ...(role === 'student' && { yearLevel: year }) });
      // Stay busy: the profile listener picks up the new document and the redirect above runs.
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const choice = (r: Role, title: string, desc: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setRole(r)}
      className={clsx(
        'flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors',
        role === r ? 'border-brand-600 bg-brand-50 dark:bg-brand-950' : 'border-line hover:border-brand-300',
      )}
    >
      <span className="mt-0.5 text-brand-700 dark:text-brand-300">{icon}</span>
      <span>
        <span className="block font-bold">{title}</span>
        <span className="text-sm text-muted">{desc}</span>
      </span>
    </button>
  );

  return (
    <AuthLayout title="Let’s get you set up" subtitle="This only takes a moment.">
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-2">
          {choice('student', 'I’m a student', 'Practise, revise for exams and get help with homework.', <GraduationCap className="size-6" />)}
          {choice('parent', 'I’m a parent or caregiver', 'Follow progress, set goals and add your children.', <Users className="size-6" />)}
        </div>
        {role && (
          <>
            <Field label="First name" hint={role === 'student' ? 'This is what the app and your tutor will call you.' : undefined}>
              <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} autoComplete="given-name" />
            </Field>
            {role === 'student' && (
              <Field label="Year level" hint="Year 9 maths and science are ready now; more years are coming.">
                <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      Year {y}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {role === 'student' && <Notice tone="info">You can link a parent later so they can see your progress and set goals.</Notice>}
          </>
        )}
        {error && <Notice tone="bad">{error}</Notice>}
        <Button type="submit" size="lg" disabled={!role || !name.trim()} loading={busy}>
          Continue
        </Button>
      </form>
    </AuthLayout>
  );
}
