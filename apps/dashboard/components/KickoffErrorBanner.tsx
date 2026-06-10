'use client';

import { useState, useTransition } from 'react';
import { retryKickoffAction } from '@/app/actions/engagement';

/**
 * Shown when the Coordinator kickoff call failed (engagement._triggerError).
 * Lets the operator re-post the same payload instead of being silently stuck
 * at intake.
 */
export default function KickoffErrorBanner({ engagementId }: { engagementId: string }) {
  const [isPending, startTransition] = useTransition();
  const [retryFailed, setRetryFailed] = useState(false);
  const [resolved, setResolved] = useState(false);

  if (resolved) return null;

  function retry() {
    setRetryFailed(false);
    startTransition(async () => {
      const result = await retryKickoffAction(engagementId);
      if (result.ok) {
        setResolved(true);
      } else {
        setRetryFailed(true);
      }
    });
  }

  return (
    <div className="mb-8 rounded-lg border border-red-500/40 bg-red-500/10 p-5 flex items-center justify-between gap-4">
      <div>
        <p className="font-bold text-red-300">
          ⚠ The coordinator could not be reached — the workflow has not started.
        </p>
        <p className="text-sm text-red-300/70 mt-1">
          {retryFailed
            ? 'Retry failed — check that the Coordinator service is running, then try again.'
            : 'Your engagement was saved, but the agent pipeline was not kicked off.'}
        </p>
      </div>
      <button
        type="button"
        onClick={retry}
        disabled={isPending}
        className="shrink-0 px-5 py-2.5 rounded border border-red-400/60 text-red-300 font-bold hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Retrying…' : 'Retry kickoff'}
      </button>
    </div>
  );
}
