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
      <section className="mb-10">
        <h2 className="text-[10px] font-bold text-gold uppercase tracking-wider mb-5">
          Engagement Phase
        </h2>
        <div className="flex items-start w-full">
          {PHASE_ORDER.map((p, i) => {
            const isDone = i < adjustedPhaseIndex;
            const isCurrent = i === adjustedPhaseIndex;
            const isLast = i === PHASE_ORDER.length - 1;

            return (
              <Fragment key={p}>
                {/* Step */}
                <div className="flex flex-col items-center flex-shrink-0 w-[62px]">
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      backgroundColor: isDone ? '#22c55e' : isCurrent ? 'rgba(34,211,238,0.12)' : 'transparent',
                      border: isDone ? 'none' : isCurrent ? '1.5px solid #22c55e' : '1px solid rgba(255,255,255,0.5)',
                      boxShadow: isCurrent ? '0 0 8px rgba(34,211,238,0.3)' : 'none',
                      transition: 'all 500ms',
                    }}
                  >
                    {isDone
                      ? <Check className="w-2.5 h-2.5" style={{ color: '#141416', strokeWidth: 2.5 }} />
                      : isCurrent
                      ? <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#22c55e', display: 'block' }} />
                      : <span className="text-[8px] font-bold text-white/50">{i + 1}</span>
                    }
                  </div>
                  <p
                    className="mt-1.5 text-[7.5px] font-semibold uppercase tracking-wide text-center leading-tight"
                    style={{ color: isCurrent ? '#22c55e' : isDone ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)' }}
                  >
                    {PHASE_LABEL[p]}
                  </p>
                </div>

                {/* Connector */}
                {!isLast && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      marginTop: 8,
                      backgroundColor: isDone ? '#22c55e' : 'rgba(255,255,255,0.2)',
                      transition: 'background-color 500ms',
                    }}
                  />
                )}
              </Fragment>
            );
          })}
        </div>
      </section>

      {/* Human-in-the-Loop Intercept Gates */}
      <ApprovalBanner engagementId={engagementId} phase={phase} />
      <LiveUrlGate engagementId={engagementId} phase={phase} lovableBuildUrl={lovableBuildUrl} />
      <LaunchDeliverables engagementId={engagementId} phase={phase} />
    </>
  );
}
