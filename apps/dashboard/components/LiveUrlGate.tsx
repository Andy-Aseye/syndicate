'use client';

import { useTransition, useState } from 'react';
import { submitLiveUrlAction } from '@/app/actions/engagement';

export default function LiveUrlGate({
  engagementId,
  phase,
  lovableBuildUrl,
}: {
  engagementId: string;
  phase: string;
  lovableBuildUrl?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [liveUrl, setLiveUrl] = useState('');

  if (phase !== 'awaiting_url') return null;

  const isValid = /^https?:\/\/.+\..+/.test(liveUrl.trim());

  const handleSubmit = () => {
    if (!isValid) return;
    startTransition(async () => {
      await submitLiveUrlAction(engagementId, liveUrl.trim());
    });
  };

  return (
    <div className="mb-10 p-6 rounded-lg bg-gold/10 border-2 border-gold">
      <h3 className="text-xl font-bold text-gold mb-2">⚡ Launch QA Gate</h3>
      <p className="text-sm text-gold/80 mb-4">
        The Developer Agent launched the build in Lovable. Once Lovable has finished
        and you have published the site, paste the live URL below. The PM Agent will
        run real Lighthouse QA against it and the Account Agent will close out the engagement.
      </p>

      {lovableBuildUrl && (
        <a
          href={lovableBuildUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mb-4 text-sm text-gold underline hover:opacity-80"
        >
          Open the Lovable build →
        </a>
      )}

      <input
        type="url"
        inputMode="url"
        className="w-full px-4 py-3 rounded bg-card border border-white/10 focus:border-gold outline-none mb-4 text-sm"
        placeholder="https://your-published-site.lovable.app"
        value={liveUrl}
        onChange={(e) => setLiveUrl(e.target.value)}
        disabled={isPending}
      />

      <button
        onClick={handleSubmit}
        disabled={isPending || !isValid}
        style={{ backgroundColor: '#d4a843', color: '#000000' }}
        className="w-full py-3 rounded-lg font-bold text-base hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
      >
        {isPending ? 'Running Launch QA...' : 'Submit Live URL & Run QA →'}
      </button>
    </div>
  );
}
