'use client';

import { useEffect, useState } from 'react';
import { ExpandableContent } from '@/components/ExpandableContent';
import { CollapsibleSection } from './CollapsibleSection';

interface QAReport {
  overall_status: string;
  checklist: string[];
  priority_fixes: string[];
  client_update: string;
  next_steps: string[];
  lighthouse_scores?: Record<string, number> | null;
}

interface AccountReport {
  launch_email: string;
  month_one_recommendations: string[];
  performance_targets: string[];
  upsell_opportunities: string[];
  email_status?: string | null;
  email_to?: string | null;
}

function EmailStatusPill({ status, to }: { status?: string | null; to?: string | null }) {
  if (status === 'sent') {
    return (
      <span className="px-2 py-0.5 rounded-full border border-green-500/40 bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider">
        ✓ Sent{to ? ` · ${to}` : ''}
      </span>
    );
  }
  if (status === 'simulated') {
    return (
      <span className="px-2 py-0.5 rounded-full border border-cyan/40 bg-cyan/10 text-cyan text-[10px] font-bold uppercase tracking-wider">
        Simulated (no key)
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="px-2 py-0.5 rounded-full border border-red-500/40 bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider">
        Send failed
      </span>
    );
  }
  if (status === 'skipped_no_recipient') {
    return (
      <span className="px-2 py-0.5 rounded-full border border-white/20 bg-white/5 text-white/60 text-[10px] font-bold uppercase tracking-wider">
        No client email
      </span>
    );
  }
  return null;
}

const SCORE_LABELS: Record<string, string> = {
  performance: 'Performance',
  accessibility: 'Accessibility',
  best_practices: 'Best practices',
  seo: 'SEO',
};

function scoreColor(score: number) {
  if (score >= 90) return 'text-green-400';
  if (score >= 70) return 'text-yellow-400';
  return 'text-red-400';
}

function statusBadge(status: string) {
  if (status === 'pass') return 'bg-green-600 text-white border-green-600';
  if (status === 'needs_fixes') return 'bg-yellow-600 text-white border-yellow-600';
  return 'bg-red-600 text-white border-red-600';
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="text-[11px] font-bold uppercase tracking-wider text-cyan hover:text-cyan/80"
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

export default function LaunchDeliverables({
  engagementId,
  phase,
}: {
  engagementId: string;
  phase: string;
}) {
  const [qa, setQa] = useState<QAReport | null>(null);
  const [launchPack, setLaunchPack] = useState<AccountReport | null>(null);

  const showQa = ['review', 'launch', 'operate'].includes(phase);
  const showLaunchPack = ['launch', 'operate'].includes(phase);

  useEffect(() => {
    if (!showQa && !showLaunchPack) return;

    let active = true;

    async function load() {
      try {
        const res = await fetch(`/api/engagements/${engagementId}/deliverables`);
        if (!res.ok || !active) return;
        const data = await res.json();
        if (data.qa) setQa(data.qa);
        if (data.launchPack) setLaunchPack(data.launchPack);
      } catch {
        // keep polling
      }
    }

    load();
    const interval = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [engagementId, phase, showQa, showLaunchPack]);

  if (!showQa && !showLaunchPack) return null;
  if (!qa && !launchPack) return null;

  const hasBlockers =
    !!qa &&
    (qa.overall_status === 'blocked' ||
      Object.values(qa.lighthouse_scores ?? {}).some((score) => score < 70));

  return (
    <div className="mb-8 space-y-4">
      {qa && (
        <CollapsibleSection
          title="Launch QA"
          titleRight={
            <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${statusBadge(qa.overall_status)}`}>
              {qa.overall_status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          }
          className="rounded-lg border border-white/10 bg-card p-4"
        >
          {hasBlockers && (
            <div
              className={`mb-4 rounded border px-3 py-2.5 flex items-center gap-2 ${qa.overall_status === 'blocked'
                  ? 'border-red-500/50 bg-red-500/10 text-red-300'
                  : 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                }`}
            >
              <span className="text-base" aria-hidden>⚠</span>
              <p className="text-xs font-bold">
                Launch QA flagged blockers — review before going live.
              </p>
            </div>
          )}

          {qa.lighthouse_scores && Object.keys(qa.lighthouse_scores).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
              {Object.entries(qa.lighthouse_scores).map(([key, value]) => (
                <div
                  key={key}
                  className={`rounded-xl border border-white/5 bg-[#1A1A1C] p-4 flex flex-col justify-between`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-semibold text-white/80 leading-tight pr-2">
                      {SCORE_LABELS[key] ?? key}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/40 text-[9px] font-bold tracking-wider shrink-0">
                      SCORE
                    </span>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white mb-0.5">{Math.round(value)}</p>
                    <p className={`text-[10px] font-semibold ${scoreColor(value)}`}>
                      {value >= 90 ? 'Excellent' : value >= 70 ? 'Needs Improvement' : 'Poor'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {qa.checklist.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-bold text-gold/60 uppercase tracking-wider mb-2">Checklist</p>
              <ExpandableContent maxHeight={140}>
                <ul className="space-y-1.5 text-xs text-white/80">
                  {qa.checklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </ExpandableContent>
            </div>
          )}

          {qa.priority_fixes.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-bold text-gold/60 uppercase tracking-wider mb-2">Priority fixes</p>
              <ExpandableContent maxHeight={100}>
                <ul className="space-y-1.5 text-xs text-white/80">
                  {qa.priority_fixes.map((item) => (
                    <li key={item} className="flex gap-1.5"><span className="text-red-400 shrink-0">•</span> {item}</li>
                  ))}
                </ul>
              </ExpandableContent>
            </div>
          )}

          {qa.client_update && (
            <div className="rounded-lg border border-white/5 bg-[#1A1A1C] p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-gold/60 uppercase tracking-wider">Client update</p>
                <CopyButton text={qa.client_update} label="Copy" />
              </div>
              <ExpandableContent maxHeight={100}>
                <p className="text-xs text-white/80 whitespace-pre-wrap leading-relaxed">{qa.client_update}</p>
              </ExpandableContent>
            </div>
          )}
        </CollapsibleSection>
      )}

      {launchPack && showLaunchPack && (
        <CollapsibleSection
          title="Launch Pack"
          className="rounded-lg border border-white/10 bg-card p-4"
        >
          <div className="rounded-lg border border-white/5 bg-[#1A1A1C] p-4 mb-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold text-gold/60 uppercase tracking-wider">Launch email</p>
                <EmailStatusPill status={launchPack.email_status} to={launchPack.email_to} />
              </div>
              <CopyButton text={launchPack.launch_email} label="Copy email" />
            </div>
            <ExpandableContent maxHeight={120}>
              <p className="text-xs text-white/80 whitespace-pre-wrap leading-relaxed">{launchPack.launch_email}</p>
            </ExpandableContent>
          </div>

          {launchPack.month_one_recommendations.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-bold text-gold/60 uppercase tracking-wider mb-1.5">Month one</p>
              <ul className="space-y-1 text-xs text-white/80">
                {launchPack.month_one_recommendations.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          )}

          {launchPack.performance_targets.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gold/60 uppercase tracking-wider mb-1.5">Performance targets</p>
              <ul className="space-y-1 text-xs text-white/80">
                {launchPack.performance_targets.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          )}
        </CollapsibleSection>
      )}
    </div>
  );
}
