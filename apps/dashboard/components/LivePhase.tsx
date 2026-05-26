'use client';

import { useEffect, useRef, useState } from 'react';
import ApprovalBanner from './ApprovalBanner';

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

export default function LivePhase({ engagementId, initialPhase }: { engagementId: string, initialPhase: string }) {
  const [phase, setPhase] = useState<string>(initialPhase);
  // Use a ref so the async poll loop always reads the latest phase without
  // needing to restart (stale closure fix).
  const phaseRef = useRef<string>(initialPhase);

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

  // For the phase bar, map 'paused' to the strategy->design transition
  const adjustedPhaseIndex = phase === 'paused'
    ? PHASE_ORDER.indexOf('design')
    : PHASE_ORDER.indexOf(phase as any);

  return (
    <>
      <section className="mb-10">
        <h2 className="text-sm font-bold text-gold uppercase tracking-wider mb-4">
          Phase
        </h2>
        <div className="flex gap-2">
          {PHASE_ORDER.map((p, i) => {
            const isDone = i < adjustedPhaseIndex;
            const isCurrent = i === adjustedPhaseIndex;

            return (
              <div
                key={p}
                className={`flex-1 rounded p-3 border transition-all duration-500 ${
                  isCurrent
                    ? 'border-cyan bg-cyan/10'
                    : isDone
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-white/10 bg-card'
                }`}
              >
                <p className="text-xs text-muted">{i + 1}</p>
                <p className="font-bold text-sm">{PHASE_LABEL[p]}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Human-in-the-Loop Intercept Gate */}
      <ApprovalBanner engagementId={engagementId} phase={phase} />
    </>
  );
}
