'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Briefcase, Users2, Activity, Settings } from 'lucide-react';

interface NavLinksProps {
  engagementCount: number;
}

const mainNav = [
  { href: '/', icon: Home, label: 'Home', exact: true },
  { href: '/engagements', icon: Briefcase, label: 'Engagements' },
  { href: '/clients', icon: Users2, label: 'Clients' },
  { href: '/activity', icon: Activity, label: 'Activity' },
];

export function NavLinks({ engagementCount }: NavLinksProps) {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <>
      <div className="space-y-1">
        {mainNav.map(({ href, icon: Icon, label, exact }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive(href, exact)
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
          >
            <Icon className="w-[18px] h-[18px] shrink-0" />
            <span className="text-sm font-medium">{label}</span>
            {href === '/engagements' && engagementCount > 0 && (
              <span className="ml-auto bg-white/10 text-zinc-300 px-2 py-0.5 rounded-md text-[11px] font-medium tabular-nums">
                {engagementCount}
              </span>
            )}
          </Link>
        ))}
      </div>

      <div className="space-y-1 pt-4 border-t border-white/5">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive('/settings')
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-zinc-400 hover:bg-white/5 hover:text-white'
            }`}
        >
          <Settings className="w-[18px] h-[18px] shrink-0" />
          <span className="text-sm font-medium">Settings</span>
        </Link>
      </div>
    </>
  );
}
