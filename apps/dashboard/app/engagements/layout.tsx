import { Sidebar } from '@/components/Sidebar';
import { AgentFeed } from '@/components/AgentFeed';

export default function EngagementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </main>

      <AgentFeed />
    </div>
  );
}
