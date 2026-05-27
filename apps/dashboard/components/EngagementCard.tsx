import Link from 'next/link';
import type { Engagement } from '@/lib/firestore';
import { Bot, Paperclip, MessageSquare } from 'lucide-react';

const PHASE_COLOR: Record<string, string> = {
  intake: 'bg-blue-500',
  strategy: 'bg-purple-500',
  design: 'bg-pink-500',
  build: 'bg-orange-500',
  review: 'bg-yellow-500',
  launch: 'bg-green-500',
  operate: 'bg-green-500',
  paused: 'bg-amber-500',
  archived: 'bg-gray-500',
};

const PHASE_PROGRESS: Record<string, number> = {
  intake: 10, strategy: 25, design: 40, build: 60,
  review: 75, launch: 90, operate: 100, paused: 45, archived: 100,
};

export function EngagementCard({ engagement }: { engagement: Engagement }) {
  const progress = PHASE_PROGRESS[engagement.phase] ?? 10;
  const colorClass = PHASE_COLOR[engagement.phase] ?? 'bg-white/10';

  const phaseLabel = {
    intake: 'Discovery',
    strategy: 'Strategy',
    design: 'Design',
    build: 'Building',
    review: 'PM Review',
    launch: 'Launch',
    operate: 'Live',
    paused: 'Needs Approval',
    archived: 'Archived',
  }[engagement.phase] ?? engagement.phase;

  return (
    <Link
      href={`/engagements/${engagement.id}`}
      className="group flex flex-col p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all shadow-sm relative overflow-hidden"
    >
      {engagement.phase === 'paused' && (
        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 animate-pulse" />
      )}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${colorClass}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted/80">
            {phaseLabel}
          </span>
        </div>
        <span className="text-xs text-muted/60 font-medium">
          {new Date(engagement.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      </div>
      
      <h3 className="font-bold text-[15px] mb-1 text-white group-hover:text-primary transition-colors">
        {engagement.clientName}
      </h3>
      
      <p className="text-[13px] text-muted line-clamp-2 mb-4 leading-relaxed">
        {engagement.brief || 'No brief yet — intake in progress.'}
      </p>

      {/* Progress Bar */}
      <div className="w-full bg-surface rounded-full h-1.5 mb-4 overflow-hidden border border-border">
        <div className={`h-1.5 rounded-full ${colorClass}`} style={{ width: `${progress}%` }} />
      </div>

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
        <div className="flex items-center gap-3 text-muted/60">
          <div className="flex items-center gap-1 hover:text-white transition-colors">
            <Paperclip className="w-3.5 h-3.5" />
            <span className="text-xs">2</span>
          </div>
          <div className="flex items-center gap-1 hover:text-white transition-colors">
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-xs">5</span>
          </div>
        </div>
        
        {/* Mock Agent Avatars */}
        <div className="flex -space-x-2">
          <div className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-[10px] z-10 text-primary">C</div>
          <div className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-[10px] z-0 text-cyan-400">D</div>
        </div>
      </div>
    </Link>
  );
}
