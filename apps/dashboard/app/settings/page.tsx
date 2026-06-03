import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <main className="min-h-screen px-8 py-10 max-w-2xl mx-auto">
      <Link href="/engagements" className="text-sm text-muted hover:text-cyan">
        ← Engagements
      </Link>
      <h1 className="text-3xl font-bold mt-4 mb-2">Settings</h1>
      <p className="text-muted mb-8">
        Workspace and integration settings. Atlas reads its configuration from
        environment variables today; in-app settings are on the roadmap.
      </p>

      <div className="space-y-4">
        <div className="p-5 rounded-lg border border-border bg-card">
          <h2 className="font-bold mb-1">Integrations</h2>
          <p className="text-sm text-muted">
            Lovable (Build-with-URL) and Slack (via the agency-mcp server) are
            configured through environment variables. Slack posts degrade to a
            simulated success when no bot token is set.
          </p>
        </div>
        <div className="p-5 rounded-lg border border-border bg-card">
          <h2 className="font-bold mb-1">Agents</h2>
          <p className="text-sm text-muted">
            Six ADK agents run as independent Cloud Run services and hand off work
            over A2A. Each publishes an Agent Card at
            <code className="mx-1 text-cyan">/.well-known/agent-card.json</code>.
          </p>
        </div>
      </div>
    </main>
  );
}
