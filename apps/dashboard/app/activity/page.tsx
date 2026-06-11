import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Activity } from 'lucide-react';
import { listAllLogs, type EnrichedActivityLog } from '@/lib/firestore';

// ── Agent colors ───────────────────────────────────────────────────────────────

const AGENT_COLOR: Record<string, string> = {
  Discovery:   'text-blue-400 bg-blue-500/10',
  Strategy:    'text-purple-400 bg-purple-500/10',
  Designer:    'text-pink-400 bg-pink-500/10',
  Developer:   'text-orange-400 bg-orange-500/10',
  PM:          'text-yellow-400 bg-yellow-500/10',
  Account:     'text-green-400 bg-green-500/10',
  Coordinator: 'text-violet-400 bg-violet-500/10',
};
const DEFAULT_AGENT_COLOR = 'text-zinc-400 bg-white/5';

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

function getDateGroup(isoString: string): 'Today' | 'Yesterday' | 'Earlier' {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86_400_000;
  const t = new Date(isoString).getTime();
  if (t >= todayStart) return 'Today';
  if (t >= yesterdayStart) return 'Yesterday';
  return 'Earlier';
}

// ── Date grouping ──────────────────────────────────────────────────────────────

type DateGroup = {
  label: 'Today' | 'Yesterday' | 'Earlier';
  logs: EnrichedActivityLog[];
};

function groupLogsByDate(logs: EnrichedActivityLog[]): DateGroup[] {
  const buckets: Record<string, EnrichedActivityLog[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };
  for (const log of logs) {
    buckets[getDateGroup(log.timestamp)].push(log);
  }
  return (['Today', 'Yesterday', 'Earlier'] as const)
    .filter((label) => buckets[label].length > 0)
    .map((label) => ({ label, logs: buckets[label] }));
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ActivityLogEntry({ log }: { log: EnrichedActivityLog }) {
  const colorClasses = AGENT_COLOR[log.agent] ?? DEFAULT_AGENT_COLOR;
  const clientLabel = log.clientCompany || log.clientName;
  const phaseLabel = PHASE_LABEL[log.phase] ?? log.phase;
  const initials = log.agent.slice(0, 2).toUpperCase();

  return (
    <div className="flex gap-3 py-3 px-3 rounded-lg hover:bg-white/[0.03] transition-colors group">
      <div
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${colorClasses}`}
      >
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
          <span className="text-xs font-semibold text-zinc-300">{log.agent}</span>
          <span className="text-[10px] text-zinc-600 bg-white/5 px-1.5 py-0.5 rounded font-medium">
            {clientLabel} · {phaseLabel}
          </span>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed">{log.message}</p>
      </div>

      <time
        dateTime={log.timestamp}
        title={log.timestamp}
        className="shrink-0 text-[11px] text-zinc-600 group-hover:text-zinc-500 transition-colors mt-0.5 tabular-nums whitespace-nowrap"
      >
        {relativeTime(log.timestamp)}
      </time>
    </div>
  );
}

function ActivityEmptyState() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
          <Activity className="w-6 h-6 text-zinc-500" />
        </div>
        <h2 className="text-base font-semibold text-white mb-2">No activity yet</h2>
        <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
          Agents haven't logged any activity yet. Start an engagement to see the pipeline in motion.
        </p>
        <Link
          href="/engagements/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          Start an engagement
        </Link>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function ActivityPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');

  const tenantId = orgId ?? userId;
  const allLogs = await listAllLogs(tenantId);
  const dateGroups = groupLogsByDate(allLogs);

  return (
    <div className="flex flex-col h-full bg-[#111113]">
      <header className="px-8 py-6 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-zinc-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Activity</h1>
          {allLogs.length > 0 && (
            <span className="ml-1 text-xs font-medium text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full tabular-nums">
              {allLogs.length} events
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {allLogs.length === 0 ? (
          <ActivityEmptyState />
        ) : (
          <div className="max-w-2xl mx-auto px-6 py-6">
            {dateGroups.map((group) => (
              <div key={group.label} className="mb-8">
                <div className="sticky top-0 z-10 bg-[#111113]/90 backdrop-blur-sm py-2 mb-1 border-b border-white/5">
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                    {group.label}
                  </span>
                  <span className="ml-2 text-xs text-zinc-600">
                    — {group.logs.length} {group.logs.length === 1 ? 'event' : 'events'}
                  </span>
                </div>
                <div className="space-y-0.5 pt-1">
                  {group.logs.map((log) => (
                    <ActivityLogEntry key={`${log.engagementId}-${log.id}`} log={log} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
