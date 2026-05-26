import { PrimarySidebar } from '@/components/PrimarySidebar';
import { SecondarySidebar } from '@/components/SecondarySidebar';
import { AgentFeed } from '@/components/AgentFeed';

export default function EngagementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg">
      <PrimarySidebar />
      <SecondarySidebar />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </main>

      <AgentFeed />
    </div>
  );
}
