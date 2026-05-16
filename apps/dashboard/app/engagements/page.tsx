import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { listEngagements } from '@/lib/firestore';
import { EngagementCard } from '@/components/EngagementCard';
import Link from 'next/link';

export default async function EngagementsPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');

  const tenantId = orgId ?? userId;
  const engagements = await listEngagements(tenantId);

  return (
    <main className="min-h-screen px-8 py-10 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-10">
        <div>
          <p className="text-gold font-bold tracking-widest text-xs mb-2">
            ATLAS · OPERATOR DASHBOARD
          </p>
          <h1 className="text-3xl font-bold">Engagements</h1>
        </div>
        <Link
          href="/engagements/new"
          className="px-5 py-3 rounded bg-cyan text-bg font-bold hover:opacity-90"
        >
          New engagement
        </Link>
      </header>

      {engagements.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-lg p-16 text-center">
          <p className="text-muted mb-6">
            No engagements yet. Start your first one to watch Atlas run it end-to-end.
          </p>
          <Link
            href="/engagements/new"
            className="inline-block px-6 py-3 rounded bg-cyan text-bg font-bold"
          >
            Start an engagement →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {engagements.map((e) => (
            <EngagementCard key={e.id} engagement={e} />
          ))}
        </div>
      )}
    </main>
  );
}
