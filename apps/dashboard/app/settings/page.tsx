import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Settings } from 'lucide-react';

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <div className="flex flex-col h-full bg-[#111113]">
      <header className="px-8 py-6 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <Settings className="w-4 h-4 text-zinc-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Settings</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-8 max-w-2xl">
        <p className="text-sm text-zinc-500 mb-8">
          Workspace and integration settings. Syndicate reads its configuration from environment
          variables today; in-app settings are on the roadmap.
        </p>

        <div className="space-y-4">
          <div className="p-5 rounded-xl border border-white/5 bg-white/[0.03]">
            <h2 className="font-semibold text-white mb-1.5">Integrations</h2>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Lovable (Build-with-URL) and Slack (via the agency-mcp server) are configured through
              environment variables. Slack posts degrade to a simulated success when no bot token is
              set.
            </p>
          </div>
          <div className="p-5 rounded-xl border border-white/5 bg-white/[0.03]">
            <h2 className="font-semibold text-white mb-1.5">Agents</h2>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Six ADK agents run as independent Cloud Run services and hand off work over A2A. Each
              publishes an Agent Card at{' '}
              <code className="text-emerald-400 text-[13px]">/.well-known/agent-card.json</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
