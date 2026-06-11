import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { listEngagements } from '@/lib/firestore';
import { Star } from 'lucide-react';
import { EngagementsBoard } from '@/components/EngagementsBoard';

export default async function EngagementsPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect('/sign-in');

  const tenantId = orgId ?? userId;
  const engagements = await listEngagements(tenantId);

  return (
    <div className="flex flex-col h-full bg-[#111113]">
      <header className="px-8 pt-6 pb-4 border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface border border-white/10 flex items-center justify-center">
              <Star className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Active Engagements</h1>
          </div>
          <Link
            href="/engagements/new"
            className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
          >
            + New Client
          </Link>
        </div>
      </header>

      <EngagementsBoard engagements={engagements} />
    </div>
  );
}
