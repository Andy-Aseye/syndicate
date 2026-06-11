import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users2 } from 'lucide-react';
import { listEngagements, type Engagement } from '@/lib/firestore';

// ── Phase display maps ─────────────────────────────────────────────────────────

const PHASE_BORDER: Record<string, string> = {
  intake:       'border-l-blue-500',
  strategy:     'border-l-purple-500',
  design:       'border-l-pink-500',
  build:        'border-l-orange-500',
  awaiting_url: 'border-l-amber-500',
  review:       'border-l-yellow-500',
  launch:       'border-l-green-500',
  operate:      'border-l-green-500',
  paused:       'border-l-amber-500',
  archived:     'border-l-gray-500',
};

const PHASE_DOT: Record<string, string> = {
  intake:       'bg-blue-500',
  strategy:     'bg-purple-500',
  design:       'bg-pink-500',
  build:        'bg-orange-500',
  awaiting_url: 'bg-amber-500',
  review:       'bg-yellow-500',
  launch:       'bg-green-500',
  operate:      'bg-green-500',
  paused:       'bg-amber-500',
  archived:     'bg-gray-500',
};

const PHASE_LABEL: Record<string, string> = {
  intake:       'Discovery',
  strategy:     'Strategy',
  design:       'Design',
  build:        'Building',
  awaiting_url: 'Awaiting URL',
  review:       'QA Review',
  launch:       'Launch',
  operate:      'Live',
  paused:       'Needs Approval',
  archived:     'Archived',
};

// ── Utilities ──────────────────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return rtf.format(-days, 'day');
  if (hours > 0) return rtf.format(-hours, 'hour');
  if (minutes > 0) return rtf.format(-minutes, 'minute');
  return 'just now';
}

// ── Client grouping ────────────────────────────────────────────────────────────

type ClientGroup = {
  key: string;
  displayName: string;
  contactName?: string;
  email?: string;
  engagements: Engagement[];
  latestEngagement: Engagement;
};

function groupByClient(engagements: Engagement[]): ClientGroup[] {
  const map = new Map<string, ClientGroup>();

  for (const eng of engagements) {
    const key = eng.clientCompany || eng.clientName;
    if (!map.has(key)) {
      map.set(key, {
        key,
        displayName: eng.clientCompany || eng.clientName,
        contactName: eng.clientCompany ? eng.clientName : undefined,
        email: eng.clientEmail,
        engagements: [],
        latestEngagement: eng,
      });
    }
    map.get(key)!.engagements.push(eng);
  }

  return Array.from(map.values()).sort((a, b) =>
    b.latestEngagement.updatedAt.localeCompare(a.latestEngagement.updatedAt)
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ClientCard({ client }: { client: ClientGroup }) {
  const eng = client.latestEngagement;
  const borderColor = PHASE_BORDER[eng.phase] ?? 'border-l-gray-500';
  const dotColor = PHASE_DOT[eng.phase] ?? 'bg-gray-500';
  const phaseLabel = PHASE_LABEL[eng.phase] ?? eng.phase;

  return (
    <Link
      href={`/engagements/${eng.id}`}
      className={`group flex flex-col p-5 rounded-xl border border-[#333336] bg-[#242426] border-l-4 ${borderColor} hover:border-[#765EEA]/40 transition-all shadow-sm`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-bold text-white truncate group-hover:text-[#765EEA] transition-colors">
            {client.displayName}
          </h2>
          {client.contactName && (
            <p className="text-xs text-zinc-400 mt-0.5 truncate">{client.contactName}</p>
          )}
          {client.email && (
            <p className="text-xs text-zinc-500 mt-0.5 truncate">{client.email}</p>
          )}
        </div>
        <span className="ml-3 shrink-0 text-[11px] font-medium text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full tabular-nums">
          {client.engagements.length}{' '}
          {client.engagements.length === 1 ? 'engagement' : 'engagements'}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e8e93]">
          {phaseLabel}
        </span>
      </div>
      <p className="text-[13px] text-zinc-400 line-clamp-2 leading-relaxed mb-4">
        {eng.brief || 'No brief recorded.'}
      </p>

      <div className="mt-auto pt-3 border-t border-[#333336]/50 flex items-center justify-between">
        <span className="text-[11px] text-zinc-500">
          Updated {relativeTime(eng.updatedAt)}
        </span>
        <span className="text-[11px] text-[#765EEA] opacity-0 group-hover:opacity-100 transition-opacity font-medium">
          View →
        </span>
      </div>
    </Link>
  );
}

function ClientsEmptyState() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
          <Users2 className="w-6 h-6 text-zinc-500" />
        </div>
        <h2 className="text-base font-semibold text-white mb-2">No clients yet</h2>
        <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
          Clients are derived from your engagements. Start your first engagement to see clients appear here.
        </p>
        <Link
          href="/engagements/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#765EEA] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-[#765EEA]/20"
        >
          + New Client
        </Link>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function ClientsPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');

  const tenantId = orgId ?? userId;
  const engagements = await listEngagements(tenantId);
  const clients = groupByClient(engagements);

  return (
    <div className="flex flex-col h-full bg-[#111113]">
      <header className="px-8 py-6 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <Users2 className="w-4 h-4 text-zinc-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Clients</h1>
          {clients.length > 0 && (
            <span className="ml-1 text-xs font-medium text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full tabular-nums">
              {clients.length}
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {clients.length === 0 ? (
          <ClientsEmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {clients.map((client) => (
              <ClientCard key={client.key} client={client} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
