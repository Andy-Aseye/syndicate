import Link from 'next/link';
import { Home, Briefcase, Bot, Settings, Rocket } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

export function PrimarySidebar() {
  return (
    <div className="w-16 h-full bg-bg border-r border-border flex flex-col items-center py-6 justify-between shrink-0">
      <div className="flex flex-col items-center gap-8">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white shadow-lg shadow-primary/20">
          A
        </div>
        <nav className="flex flex-col gap-6">
          <SidebarIcon icon={Home} label="Home" href="/" />
          <SidebarIcon icon={Briefcase} label="Engagements" href="/engagements" active />
          <SidebarIcon icon={Bot} label="Agents" href="/agents" />
          <SidebarIcon icon={Rocket} label="Deployments" href="/deployments" />
        </nav>
      </div>
      <div className="flex flex-col items-center gap-6">
        <SidebarIcon icon={Settings} label="Settings" href="/settings" />
        <UserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8" } }} />
      </div>
    </div>
  );
}

function SidebarIcon({ icon: Icon, label, href, active }: { icon: any, label: string, href: string, active?: boolean }) {
  return (
    <Link 
      href={href} 
      className={`p-2 rounded-xl transition-colors ${active ? 'bg-surface text-primary' : 'text-muted hover:text-white hover:bg-surface/50'}`}
      title={label}
    >
      <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
    </Link>
  );
}
