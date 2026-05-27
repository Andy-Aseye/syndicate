import { ChevronDown, Plus } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { listEngagements } from '@/lib/firestore';

export async function SecondarySidebar() {
  const { userId, orgId } = await auth();
  const tenantId = orgId ?? userId;
  
  let engagements = [];
  if (tenantId) {
    engagements = await listEngagements(tenantId);
  }

  // Sort by updated descending
  engagements.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="w-64 h-full bg-surface border-r border-border flex flex-col shrink-0">
      <div className="p-4 border-b border-border/50">
        <h2 className="font-bold text-sm text-muted uppercase tracking-wider mb-4">Active Projects</h2>
        <div className="space-y-1">
          {engagements.length === 0 ? (
            <p className="text-xs text-muted/60 px-3 py-2 italic">No active projects.</p>
          ) : (
            engagements.map(eng => (
              <ProjectItem key={eng.id} id={eng.id} name={eng.clientName} phase={eng.phase} />
            ))
          )}
        </div>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto">
        {/* Removed static categories section as requested */}
      </div>

      <div className="p-4 border-t border-border/50">
        <Link href="/engagements/new" className="w-full py-2.5 px-4 rounded-lg bg-primary/10 text-primary font-medium flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors border border-primary/20">
          <Plus className="w-4 h-4" />
          New Engagement
        </Link>
      </div>
    </div>
  );
}

function ProjectItem({ id, name, phase }: { id: string, name: string, phase: string }) {
  return (
    <Link href={`/engagements/${id}`} className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-muted hover:bg-white/5 hover:text-white">
      <span className="truncate text-sm pr-2">{name}</span>
      <span className="text-[10px] uppercase font-bold text-muted/50 tracking-wider shrink-0">{phase === 'intake' ? 'Discovery' : phase}</span>
    </Link>
  );
}

function CategoryItem({ name, color }: { name: string, color: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-muted hover:bg-white/5 hover:text-white transition-colors">
      <Hash className={`w-3.5 h-3.5 text-${color.replace('bg-', '')}`} />
      <span className="text-sm truncate">{name}</span>
    </div>
  );
}
