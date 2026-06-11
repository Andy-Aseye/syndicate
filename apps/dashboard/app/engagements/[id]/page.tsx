import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getEngagement } from '@/lib/firestore';
import LivePhase from '@/components/LivePhase';
import RequirementsPanel from '@/components/RequirementsPanel';
import KickoffErrorBanner from '@/components/KickoffErrorBanner';
import { ExpandableContent } from '@/components/ExpandableContent';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { ArrowTopRightOnSquareIcon } from '@/components/ui/arrow-top-right-on-square';

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
    <main className="min-h-screen px-8 py-6 max-w-5xl mx-auto">
      <Link href="/engagements" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        ← All engagements
      </Link>

      <header className="flex items-center justify-between mt-3 mb-6">
        <div>
          <p className="text-gold font-bold tracking-widest text-[10px] mb-1.5">
            ENGAGEMENT · {engagement.id.slice(0, 8).toUpperCase()}
          </p>
          <h1 className="text-2xl font-bold">{engagement.clientName}</h1>
          {engagement.clientCompany && (
            <p className="text-sm text-zinc-500 mt-0.5">{engagement.clientCompany}</p>
          )}
        </div>
        <div className="flex gap-2">
          {engagement.lovableBuildUrl && (
            <a
              href={engagement.lovableBuildUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg border border-green-500 text-green-500 text-sm font-medium hover:bg-green-500/10 transition-colors flex items-center gap-1.5"
            >
              View in Lovable <ArrowTopRightOnSquareIcon size={16} />
            </a>
          )}
          {engagement.deployedUrl && (
            <a
              href={engagement.deployedUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-green-500 text-bg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              Open live site <ArrowTopRightOnSquareIcon size={16} />
            </a>
          )}
        </div>
      </header>

      {engagement._triggerError && <KickoffErrorBanner engagementId={engagement.id} />}

      <LivePhase
        engagementId={engagement.id}
        initialPhase={engagement.phase}
        initialLovableBuildUrl={engagement.lovableBuildUrl}
      />

      <RequirementsPanel engagementId={engagement.id} />

      <CollapsibleSection title="Initial brief" className="mb-8">
        <div className="rounded-lg border border-white/10 bg-card p-4 text-sm whitespace-pre-wrap text-zinc-300">
          <ExpandableContent maxHeight={120}>
            {engagement.brief || <span className="text-zinc-600">No brief yet.</span>}
          </ExpandableContent>
        </div>
      </CollapsibleSection>

      {(engagement.deployedUrl || engagement.lovableBuildUrl) && (
        <section className="mb-8">
          <h2 className="text-[10px] font-bold text-gold uppercase tracking-wider mb-2">
            Live Preview
          </h2>
          {engagement.deployedUrl ? (
            <div className="rounded-lg border border-white/10 bg-card overflow-hidden h-[520px] w-full">
              <iframe
                src={engagement.deployedUrl}
                className="w-full h-full border-0"
                title="Live Site Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-white/10 bg-card p-8 text-center text-zinc-500 h-[160px] flex flex-col items-center justify-center gap-3">
              <p className="text-sm">Site is currently being built in Lovable.</p>
              {engagement.lovableBuildUrl && (
                <a
                  href={engagement.lovableBuildUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-green-500 font-medium hover:underline flex items-center gap-1"
                >
                  Open Lovable Builder <ArrowTopRightOnSquareIcon size={12} />
                </a>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
