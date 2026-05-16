'use client';

import { useTransition, useState } from 'react';
import { approveEngagementAction } from '@/app/actions/engagement';

export default function ApprovalBanner({ engagementId, phase }: { engagementId: string, phase: string }) {
  const [isPending, startTransition] = useTransition();
  const [adjustments, setAdjustments] = useState('');

  // Only render this intercept gate when the engagement is durably paused
  if (phase !== 'paused') return null;

  const handleApprove = () => {
    startTransition(async () => {
      await approveEngagementAction(engagementId, adjustments);
    });
  };

  return (
    <div className="mb-10 p-6 rounded bg-gold/10 border border-gold border-dashed">
      <h3 className="text-xl font-bold text-gold mb-2">⚡ Human Approval Required</h3>
      <p className="text-sm text-gold/80 mb-4">
        The Strategy Agent has formulated a technical plan. Please review the Live Activity Stream logs. 
        Add any manual adjustments below, then approve to release the Temporal workflow into the Vertex AI Sandbox.
      </p>
      
      <textarea
        className="w-full px-4 py-3 rounded bg-card border border-white/10 focus:border-gold outline-none resize-none mb-4 text-sm"
        rows={3}
        placeholder="E.g., 'Make sure to use a deep blue theme instead of light.'"
        value={adjustments}
        onChange={(e) => setAdjustments(e.target.value)}
        disabled={isPending}
      />
      
      <div className="flex justify-end">
        <button
          onClick={handleApprove}
          disabled={isPending}
          className="px-6 py-2 rounded bg-gold text-bg font-bold hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Sending Approval Signal...' : 'Approve & Release to Sandbox'}
        </button>
      </div>
    </div>
  );
}
