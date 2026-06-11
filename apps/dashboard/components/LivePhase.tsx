'use client';

import { useEffect, useRef, useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import ApprovalBanner from './ApprovalBanner';
import LiveUrlGate from './LiveUrlGate';
import LaunchDeliverables from './LaunchDeliverables';

const PHASE_ORDER = [
  'intake',
  'strategy',
  'design',
  'build',
  'review',
  'launch',
  'operate',
] as const;

const PHASE_LABEL: Record<string, string> = {
  intake: 'Discovery',
  strategy: 'Strategy',
  design: 'Designer',
  build: 'Developer · Lovable',
  review: 'PM Review',
  launch: 'Launch',
  operate: 'Account / Post-launch',
};

const PHASE_STATUS: Record<string, string> = {
  intake: 'Discovery agent is gathering your brief and requirements.',
  strategy: 'Strategy agent is building your positioning and sitemap.',
  design: 'Designer is creating your visual direction and components.',
  build: 'Developer is building your site in Lovable.',
  review: 'PM is reviewing the build against strategy and requirements.',
  launch: 'Launch agent is running QA and preparing for go-live.',
  operate: 'Account manager is tracking performance and growth.',
};

export default function LivePhase({ engagementId, initialPhase, initialLovableBuildUrl }: { engagementId: string, initialPhase: string, initialLovableBuildUrl?: string | null }) {
  const [phase, setPhase] = useState<string>(initialPhase);
  const [lovableBuildUrl, setLovableBuildUrl] = useState<string | null>(initialLovableBuildUrl ?? null);
  const router = useRouter();
  // Use a ref so the async poll loop always reads the latest phase without
  // needing to restart (stale closure fix).
  const phaseRef = useRef<string>(initialPhase);
  const hasSeenUrls = useRef(false);

  useEffect(() => {
    let active = true;

    async function poll() {
      while (active) {
        try {
          const res = await fetch(`/api/engagements/${engagementId}/phase`);
          if (res.ok) {
            const data = await res.json();
            if (data.phase && data.phase !== phaseRef.current) {
              phaseRef.current = data.phase;
              setPhase(data.phase);
            }
            if (data.lovableBuildUrl) {
              setLovableBuildUrl(data.lovableBuildUrl);
            }
            if ((data.lovableBuildUrl || data.deployedUrl) && !hasSeenUrls.current) {
              hasSeenUrls.current = true;
              router.refresh();
            }
          }
        } catch (e) {
          // Network error, keep polling
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
    }

    poll();
    return () => { active = false; };
  }, [engagementId]);

  // For the phase bar, map 'paused' to the strategy->design transition and
  // 'awaiting_url' to the build->review transition (build done, PM review next).
  const adjustedPhaseIndex = phase === 'paused'
    ? PHASE_ORDER.indexOf('design')
    : phase === 'awaiting_url'
      ? PHASE_ORDER.indexOf('review')
      : PHASE_ORDER.indexOf(phase as any);

  return (
    <>
      <section className="mb-8">
        <h2 className="text-[10px] font-bold text-gold uppercase tracking-wider mb-5">
          Engagement Phase
        </h2>

        {/* Stepper — flex-1 steps keep proportions constant at any container width */}
        <div className="relative flex w-full" style={{ paddingBottom: 28 }}>
          {/* Muted track — spans between first and last circle centers */}
          <div style={{
            position: 'absolute',
            top: 8,
            left: `${100 / (PHASE_ORDER.length * 2)}%`,
            right: `${100 / (PHASE_ORDER.length * 2)}%`,
            height: 2,
            backgroundColor: 'rgba(255,255,255,0.15)',
          }} />
          {/* Green progress */}
          <div style={{
            position: 'absolute',
            top: 8,
            left: `${100 / (PHASE_ORDER.length * 2)}%`,
            width: adjustedPhaseIndex > 0
              ? `calc(${(adjustedPhaseIndex / (PHASE_ORDER.length - 1)) * (100 - 100 / PHASE_ORDER.length)}%)`
              : 0,
            height: 2,
            backgroundColor: '#22c55e',
            transition: 'width 600ms ease',
          }} />

          {PHASE_ORDER.map((p, i) => {
            const isDone = i < adjustedPhaseIndex;
            const isCurrent = i === adjustedPhaseIndex;

            return (
              <div key={p} className="flex-1 flex flex-col items-center" style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  backgroundColor: isDone ? '#22c55e' : isCurrent ? 'rgba(34,197,94,0.12)' : '#141416',
                  border: isDone ? 'none' : isCurrent ? '1.5px solid #22c55e' : '1px solid rgba(255,255,255,0.3)',
                  boxShadow: isCurrent ? '0 0 8px rgba(34,197,94,0.35)' : 'none',
                  transition: 'all 500ms',
                }}>
                  {isDone
                    ? <Check className="w-2.5 h-2.5" style={{ color: '#141416', strokeWidth: 2.5 }} />
                    : isCurrent
                    ? <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#22c55e', display: 'block' }} />
                    : null
                  }
                </div>
                <p
                  className="mt-1.5 text-[7.5px] font-semibold uppercase tracking-wide text-center leading-tight"
                  style={{
                    color: isCurrent ? '#22c55e' : isDone ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
                    position: 'absolute',
                    top: 22,
                    width: 62,
                  }}
                >
                  {PHASE_LABEL[p]}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Phase status hint */}
      <div className="mb-8 flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/5 bg-white/[0.02]">
        <div
          className="animate-pulse shrink-0"
          style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e' }}
        />
        <p className="text-xs text-white/40">
          {PHASE_STATUS[phase] ?? PHASE_STATUS[PHASE_ORDER[adjustedPhaseIndex]] ?? 'Agent is working…'}
        </p>
      </div>

      {/* Human-in-the-Loop Intercept Gates */}
      <ApprovalBanner engagementId={engagementId} phase={phase} />
      <LiveUrlGate engagementId={engagementId} phase={phase} lovableBuildUrl={lovableBuildUrl} />
      <LaunchDeliverables engagementId={engagementId} phase={phase} />
    </>
  );
}
