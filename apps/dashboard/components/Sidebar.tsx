import { 
  Home, 
  Briefcase, 
  Folder, 
  Clock, 
  Star, 
  Users, 
  Settings, 
  HelpCircle,
  Archive,
  LayoutGrid,
  FileText,
  MoreVertical
} from 'lucide-react';
import Link from 'next/link';
import { auth, currentUser } from '@clerk/nextjs/server';
import { listEngagements } from '@/lib/firestore';
import { UserButton } from '@clerk/nextjs';

export async function Sidebar() {
  const { userId, orgId } = await auth();
  const user = await currentUser();
  const tenantId = orgId ?? userId;
  
  let engagements: any[] = [];
  if (tenantId) {
    engagements = await listEngagements(tenantId);
  }

  const activeCount = engagements.length;

  return (
    <div className="w-[280px] h-full bg-[#0a0a0b] border-r border-white/5 flex flex-col shrink-0 text-zinc-400 overflow-hidden font-sans">
      
      {/* Logo & Brand */}
      <div className="px-6 py-8 flex items-center gap-3">
        <div className="flex gap-1 items-center justify-center transform -rotate-45">
          <div className="w-1.5 h-5 bg-white rounded-full" />
          <div className="w-1.5 h-5 bg-white rounded-full" />
          <div className="w-1.5 h-5 bg-white rounded-full" />
        </div>
        <span className="font-bold tracking-wide text-lg text-white">Atlas</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-6">
        
        {/* Main Nav */}
        <div className="space-y-1">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
            <Home className="w-[18px] h-[18px]" />
            <span className="text-sm font-medium">Home</span>
          </Link>
          <Link href="/engagements" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 text-white transition-colors shadow-sm">
            <Briefcase className="w-[18px] h-[18px]" />
            <span className="text-sm font-medium">Engagements</span>
          </Link>
          <Link href="/projects" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
            <LayoutGrid className="w-[18px] h-[18px]" />
            <span className="text-sm font-medium">My projects</span>
          </Link>
          <Link href="/scheduled" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
            <Clock className="w-[18px] h-[18px]" />
            <span className="text-sm font-medium">Scheduled</span>
          </Link>
        </div>

        {/* Folders Section */}
        <div>
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4" />
              <span>Folders</span>
            </div>
            <span className="opacity-50">—</span>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center justify-between px-3 py-2 pl-9 rounded-lg hover:bg-white/5 hover:text-white transition-colors cursor-pointer text-sm">
              <span className="font-medium">View all</span>
              <span className="bg-white/5 text-zinc-300 border border-white/10 px-2 py-0.5 rounded-md text-[11px] font-medium">{activeCount}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 pl-9 rounded-lg hover:bg-white/5 hover:text-white transition-colors cursor-pointer text-sm">
              <span className="font-medium">Recent</span>
              <span className="bg-white/5 text-zinc-300 border border-white/10 px-2 py-0.5 rounded-md text-[11px] font-medium">6</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 pl-9 rounded-lg hover:bg-white/5 hover:text-white transition-colors cursor-pointer text-sm">
              <span className="font-medium">Favorites</span>
              <span className="bg-white/5 text-zinc-300 border border-white/10 px-2 py-0.5 rounded-md text-[11px] font-medium">4</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 pl-9 rounded-lg hover:bg-white/5 hover:text-white transition-colors cursor-pointer text-sm">
              <span className="font-medium">Shared</span>
              <span className="bg-white/5 text-zinc-300 border border-white/10 px-2 py-0.5 rounded-md text-[11px] font-medium">22</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 pl-9 rounded-lg hover:bg-white/5 hover:text-white transition-colors cursor-pointer text-sm">
              <span className="font-medium">Archived</span>
              <span className="bg-white/5 text-zinc-300 border border-white/10 px-2 py-0.5 rounded-md text-[11px] font-medium">14</span>
            </div>
          </div>
        </div>

        {/* Other links */}
        <div className="space-y-0.5 pt-4 border-t border-white/5">
          <Link href="/files" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
            <FileText className="w-[18px] h-[18px]" />
            <span className="text-sm font-medium">All files</span>
          </Link>
          <Link href="/team" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
            <Users className="w-[18px] h-[18px]" />
            <span className="text-sm font-medium">Team members</span>
          </Link>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="p-4 border-t border-white/5 space-y-1">
        <Link href="/support" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
          <HelpCircle className="w-[18px] h-[18px]" />
          <span className="text-sm font-medium">Support</span>
        </Link>
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors mb-2">
          <Settings className="w-[18px] h-[18px]" />
          <span className="text-sm font-medium">Settings</span>
        </Link>
        
        {/* User Profile Block */}
        <div className="mt-2 p-2 rounded-xl border border-white/5 bg-white/5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
            <div className="shrink-0 flex items-center justify-center relative">
              <UserButton appearance={{ elements: { userButtonAvatarBox: "w-9 h-9 shadow-md" } }} />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#1c1c1c]" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-sm font-semibold text-white truncate leading-tight">
                {user?.firstName ? `${user.firstName} ${user.lastName}` : 'Atlas User'}
              </span>
              <span className="text-[12px] text-zinc-400 truncate leading-tight mt-0.5">
                {user?.emailAddresses[0]?.emailAddress ?? 'user@atlas.com'}
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
