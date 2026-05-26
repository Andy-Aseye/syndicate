'use client';

import Link from 'next/link';
import { useCreateEngagement } from '@/hooks/useCreateEngagement';

export default function NewEngagementForm() {
  const { createEngagement, isPending } = useCreateEngagement();

  return (
    <form action={createEngagement} className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-primary uppercase tracking-wider mb-2">
          Client name *
        </label>
        <input
          name="clientName"
          required
          className="w-full px-4 py-3 rounded bg-card border border-white/10 focus:border-primary outline-none"
          placeholder="Acme Coffee Co."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-primary uppercase tracking-wider mb-2">
            Email
          </label>
          <input
            name="clientEmail"
            type="email"
            className="w-full px-4 py-3 rounded bg-card border border-white/10 focus:border-primary outline-none"
            placeholder="founder@acme.coffee"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-primary uppercase tracking-wider mb-2">
            Company
          </label>
          <input
            name="clientCompany"
            className="w-full px-4 py-3 rounded bg-card border border-white/10 focus:border-primary outline-none"
            placeholder="Acme Coffee Co."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-primary uppercase tracking-wider mb-2">
          Initial brief
        </label>
        <textarea
          name="brief"
          rows={8}
          className="w-full px-4 py-3 rounded bg-card border border-white/10 focus:border-primary outline-none resize-none"
          placeholder="What does the client want? A one-paragraph summary is enough — Discovery will fill in the rest via a voice call."
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-3 rounded bg-primary text-white font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Starting workflow...' : 'Start engagement →'}
        </button>
        <Link
          href="/engagements"
          className="px-6 py-3 rounded border border-white/20 hover:bg-white/5"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
