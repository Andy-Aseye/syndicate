import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getEngagement } from '@/lib/firestore';
import LivePhase from '@/components/LivePhase';
import RequirementsPanel from '@/components/RequirementsPanel';
import KickoffErrorBanner from '@/components/KickoffErrorBanner';

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
        <div className="flex gap-3">
          {engagement.lovableBuildUrl && (
            <a
              href={engagement.lovableBuildUrl}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-3 rounded border border-cyan text-cyan font-bold hover:bg-cyan/10"
            >
              View in Lovable ↗
            </a>
          )}
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
        </div>
      </header>

      {/* Coordinator kickoff failure (with retry) */}
      {engagement._triggerError && <KickoffErrorBanner engagementId={engagement.id} />}

      {/* Real-time Phase timeline & Intercept Gate */}
      <LivePhase engagementId={engagement.id} initialPhase={engagement.phase} initialLovableBuildUrl={engagement.lovableBuildUrl} />

      {/* Structured requirements extracted by Discovery */}
      <RequirementsPanel engagementId={engagement.id} />

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

      {/* Live Preview */}
      {(engagement.deployedUrl || engagement.lovableBuildUrl) && (
        <section className="mb-10">
          <h2 className="text-sm font-bold text-gold uppercase tracking-wider mb-3">
            Live Preview
          </h2>
          {engagement.deployedUrl ? (
            <div className="rounded border border-white/10 bg-card overflow-hidden h-[600px] w-full">
              <iframe
                src={engagement.deployedUrl}
                className="w-full h-full border-0"
                title="Live Site Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          ) : (
            <div className="rounded border border-dashed border-white/10 bg-card p-10 text-center text-muted h-[200px] flex flex-col items-center justify-center gap-4">
              <p>Site is currently being built in Lovable.</p>
              {engagement.lovableBuildUrl && (
                <a
                  href={engagement.lovableBuildUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan font-bold hover:underline"
                >
                  Open Lovable Builder
                </a>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
