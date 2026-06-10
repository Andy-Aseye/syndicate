'use client';

import { useEffect, useState } from 'react';

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
      <span className="px-2.5 py-0.5 rounded-full border border-green-500/40 bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider">
        ✓ Sent to client{to ? ` · ${to}` : ''}
      </span>
    );
  }
  if (status === 'simulated') {
    return (
      <span className="px-2.5 py-0.5 rounded-full border border-cyan/40 bg-cyan/10 text-cyan text-[10px] font-bold uppercase tracking-wider">
        Simulated (no key)
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="px-2.5 py-0.5 rounded-full border border-red-500/40 bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider">
        Send failed
      </span>
    );
  }
  if (status === 'skipped_no_recipient') {
    return (
      <span className="px-2.5 py-0.5 rounded-full border border-white/20 bg-white/5 text-white/60 text-[10px] font-bold uppercase tracking-wider">
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
  if (score >= 90) return 'text-green-400 border-green-500/40 bg-green-500/10';
  if (score >= 70) return 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10';
  return 'text-red-400 border-red-500/40 bg-red-500/10';
}

function statusBadge(status: string) {
  if (status === 'pass') return 'bg-green-500/20 text-green-400 border-green-500/40';
  if (status === 'needs_fixes') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
  return 'bg-red-500/20 text-red-400 border-red-500/40';
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
      className="text-xs font-bold uppercase tracking-wider text-cyan hover:text-cyan/80"
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
    <div className="mb-10 space-y-8">
      {qa && (
        <section className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gold uppercase tracking-wider">
              Launch QA
            </h2>
            <span className={`px-3 py-1 rounded-full border text-xs font-bold uppercase ${statusBadge(qa.overall_status)}`}>
              {qa.overall_status.replace('_', ' ')}
            </span>
          </div>

          {hasBlockers && (
            <div
              className={`mb-5 rounded border px-4 py-3 flex items-center gap-3 ${
                qa.overall_status === 'blocked'
                  ? 'border-red-500/50 bg-red-500/10 text-red-300'
                  : 'border-amber-500/50 bg-amber-500/10 text-amber-300'
              }`}
            >
              <span className="text-lg" aria-hidden>⚠</span>
              <p className="text-sm font-bold">
                Launch QA flagged blockers — review before going live.
              </p>
            </div>
          )}

          {qa.lighthouse_scores && Object.keys(qa.lighthouse_scores).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {Object.entries(qa.lighthouse_scores).map(([key, value]) => (
                <div
                  key={key}
                  className={`rounded border p-3 text-center ${scoreColor(value)}`}
                >
                  <p className="text-2xl font-bold">{Math.round(value)}</p>
                  <p className="text-xs uppercase tracking-wide opacity-80">
                    {SCORE_LABELS[key] ?? key}
                  </p>
                </div>
              ))}
            </div>
          )}

          {qa.checklist.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-gold/60 uppercase tracking-wider mb-2">Checklist</p>
              <ul className="space-y-1 text-sm text-white/90">
                {qa.checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {qa.priority_fixes.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-gold/60 uppercase tracking-wider mb-2">Priority fixes</p>
              <ul className="space-y-1 text-sm text-white/90">
                {qa.priority_fixes.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          )}

          {qa.client_update && (
            <div className="rounded border border-white/10 bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gold/60 uppercase tracking-wider">Client update</p>
                <CopyButton text={qa.client_update} label="Copy" />
              </div>
              <p className="text-sm text-white/90 whitespace-pre-wrap">{qa.client_update}</p>
            </div>
          )}
        </section>
      )}

      {launchPack && showLaunchPack && (
        <section className="rounded-lg border border-green-500/30 bg-green-500/5 p-6">
          <h2 className="text-sm font-bold text-gold uppercase tracking-wider mb-4">
            Launch pack
          </h2>

          <div className="rounded border border-white/10 bg-card p-4 mb-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-gold/60 uppercase tracking-wider">Launch email</p>
                <EmailStatusPill status={launchPack.email_status} to={launchPack.email_to} />
              </div>
              <CopyButton text={launchPack.launch_email} label="Copy email" />
            </div>
            <p className="text-sm text-white/90 whitespace-pre-wrap">{launchPack.launch_email}</p>
          </div>

          {launchPack.month_one_recommendations.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-gold/60 uppercase tracking-wider mb-2">Month one</p>
              <ul className="space-y-1 text-sm text-white/90">
                {launchPack.month_one_recommendations.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          )}

          {launchPack.performance_targets.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gold/60 uppercase tracking-wider mb-2">Performance targets</p>
              <ul className="space-y-1 text-sm text-white/90">
                {launchPack.performance_targets.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
