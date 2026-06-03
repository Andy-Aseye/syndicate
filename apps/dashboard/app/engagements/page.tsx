import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { listEngagements } from '@/lib/firestore';
import { EngagementCard } from '@/components/EngagementCard';
import { LayoutGrid, Star } from 'lucide-react';

export default async function EngagementsPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');

  const tenantId = orgId ?? userId;
  const engagements = await listEngagements(tenantId);

  const columns: { id: string; title: string; color: string; phases: string[] }[] = [
    { id: 'intake', title: 'Discovery', color: 'text-blue-400', phases: ['intake', 'design'] },
    { id: 'strategy', title: 'Strategy', color: 'text-purple-400', phases: ['strategy', 'paused'] },
    { id: 'build', title: 'In Build', color: 'text-orange-400', phases: ['build', 'awaiting_url'] },
    { id: 'review', title: 'QA & Launch', color: 'text-yellow-400', phases: ['review', 'launch', 'operate'] },
  ];

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header matching the reference */}
      <header className="px-8 py-6 border-b border-border/50 shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center">
              <Star className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Active Engagements</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/engagements/new"
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              + New Client
            </Link>
          </div>
        </div>

        {/* View Toggles */}
        <div className="flex items-center gap-6 text-sm text-muted font-medium border-b border-border/50 pb-px">
          <span className="flex items-center gap-2 pb-3 border-b-2 border-primary text-white">
            <LayoutGrid className="w-4 h-4" /> Kanban
          </span>
        </div>
      </header>

      {/* Kanban Board Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-8">
        <div className="flex gap-6 h-full min-w-max">
          {columns.map(col => {
            const colEngagements = engagements.filter(e => col.phases.includes(e.phase));
            return (
              <div key={col.id} className="flex flex-col w-80 shrink-0 h-full">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h2 className="font-semibold text-sm flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full bg-current ${col.color}`} />
                    {col.title}
                  </h2>
                  <span className="text-xs text-muted font-mono bg-surface border border-border px-2 py-0.5 rounded-full">
                    {colEngagements.length}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 pb-8 pr-2">
                  {colEngagements.length === 0 ? (
                    <p className="text-xs text-muted/50 px-1 py-3">No engagements.</p>
                  ) : (
                    colEngagements.map(e => (
                      <EngagementCard key={e.id} engagement={e} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
