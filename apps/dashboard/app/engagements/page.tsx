import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { listEngagements, type Engagement } from '@/lib/firestore';
import { EngagementCard } from '@/components/EngagementCard';
import { LayoutGrid, List, SlidersHorizontal, Star } from 'lucide-react';

// Fallback mock data so we can see the UI even if the DB is empty
const MOCK_ENGAGEMENTS: Engagement[] = [
  { id: '1', tenantId: '1', clientName: 'Atlas Rebrand', phase: 'intake', brief: 'Complete brand overhaul and new landing page.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', tenantId: '1', clientName: 'Neon Marketing', phase: 'intake', brief: 'Social media templates and campaign strategy.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '3', tenantId: '1', clientName: 'Nexus AI Platform', phase: 'strategy', brief: 'AI-driven analytics dashboard for enterprise.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '4', tenantId: '1', clientName: 'Synthwave App', phase: 'build', brief: 'Mobile app UI implementation with Next.js.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '5', tenantId: '1', clientName: 'Quantum CRM', phase: 'review', brief: 'QA testing for the new CRM deployment.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export default async function EngagementsPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');

  const tenantId = orgId ?? userId;
  let engagements = await listEngagements(tenantId);
  
  if (engagements.length === 0 && process.env.NODE_ENV === 'development') {
    engagements = MOCK_ENGAGEMENTS;
  }

  const columns = [
    { id: 'intake', title: 'Discovery', color: 'text-blue-400' },
    { id: 'strategy', title: 'Strategy', color: 'text-purple-400' },
    { id: 'build', title: 'In Build', color: 'text-orange-400' },
    { id: 'review', title: 'QA', color: 'text-yellow-400' },
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
            <button className="p-2 rounded-lg bg-surface border border-border text-muted hover:text-white transition-colors">
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity">
              + New Client
            </button>
          </div>
        </div>

        {/* View Toggles */}
        <div className="flex items-center gap-6 text-sm text-muted font-medium border-b border-border/50 pb-px">
          <button className="flex items-center gap-2 pb-3 border-b-2 border-primary text-white">
            <LayoutGrid className="w-4 h-4" /> Kanban
          </button>
          <button className="flex items-center gap-2 pb-3 border-b-2 border-transparent hover:text-white transition-colors">
            <List className="w-4 h-4" /> List
          </button>
        </div>
      </header>

      {/* Kanban Board Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-8">
        <div className="flex gap-6 h-full min-w-max">
          {columns.map(col => {
            const colEngagements = engagements.filter(e => e.phase === col.id || (col.id === 'intake' && ['intake', 'design'].includes(e.phase)));
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
                  {colEngagements.map(e => (
                    <EngagementCard key={e.id} engagement={e} />
                  ))}
                  <button className="w-full py-3 rounded-xl border border-dashed border-border text-muted text-sm hover:text-white hover:border-muted/50 transition-colors flex items-center justify-center gap-2">
                    + Add task
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
