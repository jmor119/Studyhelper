import type { FamilyLink } from '@study-helper/shared';
import { collection, orderBy, query, where } from 'firebase/firestore';
import { Link2, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { AddChildModal } from '../../components/parent/AddChildModal';
import { AiStatusCard } from '../../components/parent/AiStatusCard';
import { ChildCard } from '../../components/parent/ChildCard';
import { LinkStudentModal } from '../../components/parent/LinkStudentModal';
import { Button, Card, Notice, PageHeader, Spinner } from '../../components/ui';
import { useUser } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { useQuery } from '../../lib/hooks';

export default function Family() {
  const { user, profile } = useUser();
  const links = useQuery<FamilyLink>(query(collection(db, 'links'), where('parentUid', '==', user.uid), orderBy('createdAt')), `links:parent:${user.uid}`);
  const [adding, setAdding] = useState(false);
  const [linking, setLinking] = useState(false);
  const hasChildren = links.data.length > 0;

  const actions = (
    <>
      <Button onClick={() => setAdding(true)} icon={<UserPlus className="size-4" />}>
        Add a child
      </Button>
      <Button variant="secondary" onClick={() => setLinking(true)} icon={<Link2 className="size-4" />}>
        Link an existing account
      </Button>
    </>
  );

  return (
    <div>
      <PageHeader
        title="Your family"
        subtitle={hasChildren ? `Kia ora ${profile.displayName} — here’s how everyone is getting on.` : `Kia ora ${profile.displayName}. Let’s get your family set up.`}
        actions={hasChildren ? actions : undefined}
      />

      {links.loading ? (
        <Spinner label="Loading your family" />
      ) : links.error ? (
        <Notice tone="bad" title="We couldn’t load your family">
          Check your connection and refresh the page.
        </Notice>
      ) : hasChildren ? (
        <section aria-label="Your children" className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {links.data.map((l) => (
            <ChildCard key={l.id} link={l} />
          ))}
        </section>
      ) : (
        <section aria-labelledby="family-empty" className="rounded-2xl border border-dashed border-line px-5 py-8 sm:px-8">
          <div className="mx-auto max-w-xl text-center">
            <Users className="mx-auto size-10 text-muted" aria-hidden="true" />
            <h2 id="family-empty" className="mt-3 text-lg font-bold">
              Add your first child
            </h2>
            <p className="mt-1 text-muted">Once your child is linked, you’ll see their progress, mock exam results and tutor chats here, and you can set goals and rewards.</p>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="flex flex-col">
              <UserPlus className="size-6 text-brand-700 dark:text-brand-300" aria-hidden="true" />
              <h3 className="mt-2 font-bold">Create a child account</h3>
              <p className="mt-1 flex-1 text-sm text-muted">
                Best for younger children without their own email. They sign in with a username and password you choose, and you can reset it if they forget.
              </p>
              <Button className="mt-4 self-start" onClick={() => setAdding(true)}>
                Add a child
              </Button>
            </Card>
            <Card className="flex flex-col">
              <Link2 className="size-6 text-brand-700 dark:text-brand-300" aria-hidden="true" />
              <h3 className="mt-2 font-bold">Link an existing account</h3>
              <p className="mt-1 flex-1 text-sm text-muted">
                If your child already signed up with their own email or Google, send them an invite code, or enter one they’ve made for you.
              </p>
              <Button variant="secondary" className="mt-4 self-start" onClick={() => setLinking(true)}>
                Link an account
              </Button>
            </Card>
          </div>
        </section>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4">
        <AiStatusCard />
        <div className="flex items-start gap-3 rounded-2xl bg-surface p-4 text-sm ring-1 ring-line">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-700 dark:text-brand-300" aria-hidden="true" />
          <p className="text-muted">
            Progress you see here is recorded by our server as your child works, so it can’t be edited by hand. Children are told that linked parents can see their
            progress and read their tutor chats.
          </p>
        </div>
      </div>

      <AddChildModal open={adding} onClose={() => setAdding(false)} />
      <LinkStudentModal open={linking} onClose={() => setLinking(false)} />
    </div>
  );
}
