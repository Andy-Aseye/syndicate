import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getEngagement } from '@/lib/firestore';
import LivePhase from '@/components/LivePhase';

export default async function EngagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');

  const tenantId = orgId ?? userId;
  const engagement = await getEngagement(tenantId, id);
  if (!engagement) notFound();

  return (
    <main className="min-h-screen px-8 py-10 max-w-5xl mx-auto">
      <Link href="/engagements" className="text-sm text-muted hover:text-cyan">
        ← All engagements
      </Link>

      <header className="flex items-center justify-between mt-4 mb-8">
        <div>
          <p className="text-gold font-bold tracking-widest text-xs mb-2">
            ENGAGEMENT · {engagement.id.slice(0, 8)}
          </p>
          <h1 className="text-3xl font-bold">{engagement.clientName}</h1>
          {engagement.clientCompany && (
            <p className="text-muted">{engagement.clientCompany}</p>
          )}
        </div>
        {engagement.deployedUrl && (
          <a
            href={engagement.deployedUrl}
            target="_blank"
            rel="noreferrer"
            className="px-5 py-3 rounded bg-cyan text-bg font-bold hover:opacity-90"
          >
            Open live site ↗
          </a>
        )}
      </header>

      {/* Real-time Phase timeline & Intercept Gate */}
      <LivePhase engagementId={engagement.id} initialPhase={engagement.phase} />

      {/* Brief */}
      <section className="mb-10">
        <h2 className="text-sm font-bold text-gold uppercase tracking-wider mb-3">
          Initial brief
        </h2>
        <div className="rounded border border-white/10 bg-card p-5 whitespace-pre-wrap">
          {engagement.brief || (
            <span className="text-muted">No brief yet.</span>
          )}
        </div>
      </section>

      {/* Live Agent Graph */}
      <section className="mb-10">
        <h2 className="text-sm font-bold text-gold uppercase tracking-wider mb-3">
          Live agent graph
        </h2>
        <div className="rounded border border-dashed border-white/10 bg-card p-10 text-center text-muted h-[500px] flex items-center justify-center">
          Agent graph view loads here. (W2: React Flow visualization of A2A traces.)
        </div>
      </section>
    </main>
  );
}
