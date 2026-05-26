'use client';

import { useTransition, useState, useEffect } from 'react';
import { approveEngagementAction } from '@/app/actions/engagement';

interface Plan {
  positioning?: string;
  target_persona?: string;
  information_architecture?: string[];
  key_components?: string[];
  visual_direction?: string;
  estimated_hours?: number;
  estimated_cost_usd?: number;
  timeline_days?: number;
}

export default function ApprovalBanner({ engagementId, phase }: { engagementId: string, phase: string }) {
  const [isPending, startTransition] = useTransition();
  const [adjustments, setAdjustments] = useState('');
  const [strategy, setStrategy] = useState<Plan | null>(null);

  useEffect(() => {
    if (phase !== 'paused') return;
    fetch(`/api/engagements/${engagementId}/strategy`)
      .then(r => r.json())
      .then(d => { if (d.strategy) setStrategy(d.strategy); })
      .catch(() => {});
  }, [engagementId, phase]);

  if (phase !== 'paused') return null;

  const handleApprove = () => {
    startTransition(async () => {
      await approveEngagementAction(engagementId, adjustments);
    });
  };

  const hasRealPlan = !!strategy?.positioning;

  return (
    <div className="mb-10 p-6 rounded-lg bg-gold/10 border-2 border-gold">
      <h3 className="text-xl font-bold text-gold mb-4">⚡ Human Approval Required</h3>

      {hasRealPlan ? (
        <div className="mb-5 space-y-4 text-sm">
          <div>
            <p className="text-xs font-bold text-gold/60 uppercase tracking-wider mb-1">Positioning</p>
            <p className="text-white/90 leading-relaxed">{strategy!.positioning}</p>
          </div>

          {strategy!.target_persona && (
            <div>
              <p className="text-xs font-bold text-gold/60 uppercase tracking-wider mb-1">Target Persona</p>
              <p className="text-white/90">{strategy!.target_persona}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {strategy!.information_architecture && strategy!.information_architecture.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gold/60 uppercase tracking-wider mb-1">Pages / IA</p>
                <ul className="text-white/90 space-y-0.5">
                  {strategy!.information_architecture.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-gold mt-0.5 shrink-0">·</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {strategy!.key_components && strategy!.key_components.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gold/60 uppercase tracking-wider mb-1">Components</p>
                <ul className="text-white/90 space-y-0.5">
                  {strategy!.key_components.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-gold mt-0.5 shrink-0">·</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {strategy!.visual_direction && (
            <div>
              <p className="text-xs font-bold text-gold/60 uppercase tracking-wider mb-1">Visual Direction</p>
              <p className="text-white/90">{strategy!.visual_direction}</p>
            </div>
          )}

          <div className="flex gap-6 pt-1">
            {strategy!.estimated_cost_usd !== undefined && (
              <div>
                <p className="text-xs text-gold/60 uppercase tracking-wider">Est. Cost</p>
                <p className="font-bold text-white">${strategy!.estimated_cost_usd.toLocaleString()}</p>
              </div>
            )}
            {strategy!.timeline_days !== undefined && (
              <div>
                <p className="text-xs text-gold/60 uppercase tracking-wider">Timeline</p>
                <p className="font-bold text-white">{strategy!.timeline_days} days</p>
              </div>
            )}
            {strategy!.estimated_hours !== undefined && (
              <div>
                <p className="text-xs text-gold/60 uppercase tracking-wider">Hours</p>
                <p className="font-bold text-white">{strategy!.estimated_hours}h</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gold/80 mb-4">
          The Strategy Agent has formulated a technical plan. Review the Agent Activity feed,
          add any adjustments below, and approve to begin building.
        </p>
      )}

      <textarea
        className="w-full px-4 py-3 rounded bg-card border border-white/10 focus:border-gold outline-none resize-none mb-4 text-sm"
        rows={2}
        placeholder="E.g., 'Use a deep blue theme instead of light. Add a pricing table.'"
        value={adjustments}
        onChange={(e) => setAdjustments(e.target.value)}
        disabled={isPending}
      />

      <button
        onClick={handleApprove}
        disabled={isPending}
        style={{ backgroundColor: '#d4a843', color: '#000000' }}
        className="w-full py-3 rounded-lg font-bold text-base hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
      >
        {isPending ? 'Sending Approval Signal...' : 'Approve & Release to Sandbox →'}
      </button>
    </div>
  );
}
