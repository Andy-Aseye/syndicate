import Link from 'next/link';
import type { Engagement } from '@/lib/firestore';

const PHASE_COLOR: Record<string, string> = {
  intake: 'bg-cyan/20 text-cyan',
  strategy: 'bg-cyan/20 text-cyan',
  design: 'bg-cyan/20 text-cyan',
  build: 'bg-gold/20 text-gold',
  review: 'bg-gold/20 text-gold',
  launch: 'bg-green-500/20 text-green-400',
  operate: 'bg-green-500/20 text-green-400',
  paused: 'bg-orange-400/20 text-orange-300',
  archived: 'bg-white/10 text-muted',
};

export function EngagementCard({ engagement }: { engagement: Engagement }) {
  return (
    <Link
      href={`/engagements/${engagement.id}`}
      className="block rounded-lg border border-white/10 bg-card hover:border-cyan/40 transition-colors p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
            PHASE_COLOR[engagement.phase] ?? 'bg-white/10'
          }`}
        >
          {engagement.phase}
        </span>
        <span className="text-xs text-muted">
          {new Date(engagement.updatedAt).toLocaleDateString()}
        </span>
      </div>
      <h3 className="font-bold text-lg mb-1">{engagement.clientName}</h3>
      {engagement.clientCompany && (
        <p className="text-sm text-muted mb-3">{engagement.clientCompany}</p>
      )}
      <p className="text-sm text-white/70 line-clamp-2">
        {engagement.brief || 'No brief yet — intake in progress.'}
      </p>
      {engagement.deployedUrl && (
        <p className="mt-4 text-xs text-cyan truncate">
          ↗ {engagement.deployedUrl}
        </p>
      )}
    </Link>
  );
}
