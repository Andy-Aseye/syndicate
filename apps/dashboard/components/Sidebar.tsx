import { auth, currentUser } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import { MoreVertical } from 'lucide-react';
import { listEngagements } from '@/lib/firestore';
import { NavLinks } from './NavLinks';

export async function Sidebar() {
  const { userId, orgId } = await auth();
  const user = await currentUser();
  const tenantId = orgId ?? userId;

  let engagementCount = 0;
  if (tenantId) {
    const engagements = await listEngagements(tenantId);
    engagementCount = engagements.length;
  }

  return (
    <div className="w-[260px] h-full bg-[#0a0a0b] border-r border-white/5 flex flex-col shrink-0 overflow-hidden font-sans">

      {/* Logo & Brand */}
      <div className="px-6 py-7 flex items-center gap-3">
        <div className="flex gap-1 items-center justify-center transform -rotate-45">
          <div className="w-1.5 h-5 bg-white rounded-full" />
          <div className="w-1.5 h-5 bg-white rounded-full" />
          <div className="w-1.5 h-5 bg-white rounded-full" />
        </div>
        <span className="font-bold tracking-wide text-lg text-white">Syndicate</span>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-4 space-y-6">
        <NavLinks engagementCount={engagementCount} />
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-white/5">
        <div className="p-2 rounded-xl border border-white/5 bg-white/5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
            <div className="shrink-0 flex items-center justify-center relative">
              <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-9 h-9 shadow-md' } }} />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#1c1c1c]" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-sm font-semibold text-white truncate leading-tight">
                {user?.firstName ? `${user.firstName} ${user.lastName}` : 'Syndicate User'}
              </span>
              <span className="text-[12px] text-zinc-400 truncate leading-tight mt-0.5">
                {user?.emailAddresses[0]?.emailAddress ?? 'user@syndicate.com'}
              </span>
            </div>
          </div>
          <div className="text-zinc-500 hover:text-white px-2 cursor-pointer transition-colors">
            <MoreVertical className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
