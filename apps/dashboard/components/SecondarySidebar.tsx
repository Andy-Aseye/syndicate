import { ChevronDown, Hash, Plus } from 'lucide-react';
import Link from 'next/link';

export function SecondarySidebar() {
  return (
    <div className="w-64 h-full bg-surface border-r border-border flex flex-col shrink-0">
      <div className="p-4 border-b border-border/50">
        <h2 className="font-bold text-sm text-muted uppercase tracking-wider mb-4">Active Projects</h2>
        <div className="space-y-1">
          <ProjectItem name="Atlas Rebrand" count={3} />
          <ProjectItem name="Neon Marketing" count={12} active />
          <ProjectItem name="Nexus AI Platform" count={4} />
          <ProjectItem name="Synthwave App" count={8} />
        </div>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto">
        <h2 className="font-bold text-sm text-muted uppercase tracking-wider mb-4 flex items-center justify-between group cursor-pointer hover:text-white">
          <span>Categories</span>
          <ChevronDown className="w-4 h-4" />
        </h2>
        <div className="space-y-1">
          <CategoryItem name="Design Phase" color="bg-pink-500" />
          <CategoryItem name="Engineering" color="bg-blue-500" />
          <CategoryItem name="Marketing" color="bg-green-500" />
        </div>
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

function ProjectItem({ name, count, active }: { name: string, count: number, active?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${active ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:bg-white/5 hover:text-white'}`}>
      <span className="truncate text-sm">{name}</span>
      <span className={`text-xs ${active ? 'text-primary' : 'text-muted/60'}`}>{count}</span>
    </div>
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
