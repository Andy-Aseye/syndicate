'use client';

import { useState } from 'react';
import { SegmentedToggle } from './SegmentedToggle';
import { EngagementCard } from './EngagementCard';
import type { Engagement } from '@/lib/firestore';

const columns: { id: string; title: string; color: string; phases: string[] }[] = [
  { id: 'intake',   title: 'Discovery',   color: 'text-blue-400',   phases: ['intake', 'design'] },
  { id: 'strategy', title: 'Strategy',    color: 'text-purple-400', phases: ['strategy', 'paused'] },
  { id: 'build',    title: 'In Build',    color: 'text-orange-400', phases: ['build', 'awaiting_url'] },
  { id: 'review',   title: 'QA & Launch', color: 'text-yellow-400', phases: ['review', 'launch', 'operate'] },
];

export function EngagementsBoard({ engagements }: { engagements: Engagement[] }) {
  const [view, setView] = useState<'Simple' | 'Progress'>('Progress');
  const variant = view === 'Simple' ? 'simple' : 'progress';

  return (
    <>
      {/* Toggle row */}
      <div className="px-8 py-4 border-b border-white/5 shrink-0">
        <SegmentedToggle
          options={['Simple', 'Progress']}
          defaultSelected="Progress"
          onChange={(v) => setView(v as 'Simple' | 'Progress')}
        />
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-[#111113]">
        <div className="flex gap-4 h-full min-w-max">
          {columns.map((col) => {
            const colEngagements = engagements.filter((e) => col.phases.includes(e.phase));
            return (
              <div
                key={col.id}
                className="flex flex-col w-[340px] shrink-0 h-full bg-[#1c1c1e] rounded-2xl p-4 border border-white/5 shadow-xl"
              >
                <div className="flex items-center justify-between mb-4 px-1">
                  <h2 className={`font-semibold text-[15px] flex items-center gap-2 text-zinc-100`}>
                    <span className={`w-2 h-2 rounded-full bg-current ${col.color}`} />
                    {col.title}
                  </h2>
                  <span className="text-xs text-zinc-400 font-mono bg-black/20 border border-white/10 px-2 py-0.5 rounded-full">
                    {colEngagements.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pb-2 pr-1 custom-scrollbar">
                  {colEngagements.length === 0 ? (
                    <div className="w-full py-8 border border-dashed border-white/10 rounded-xl flex items-center justify-center">
                      <p className="text-xs text-zinc-500">No engagements</p>
                    </div>
                  ) : (
                    colEngagements.map((e) => (
                      <EngagementCard key={e.id} engagement={e} variant={variant} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
