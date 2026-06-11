import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import NewEngagementForm from '@/components/NewEngagementForm';

export default async function NewEngagementPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <main className="min-h-screen px-8 py-8 max-w-2xl mx-auto">
      <Link href="/engagements" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        ← Engagements
      </Link>
      <h1 className="text-xl font-semibold mt-4 mb-1 text-white">New engagement</h1>
      <p className="text-xs text-zinc-500 mb-5">
        Discovery → Strategy → Designer → Developer → PM → Account. The Developer agent calls Lovable for codegen.
      </p>

      <div className="rounded-xl border border-white/5 bg-[#1c1c1e] p-6">
        <NewEngagementForm />
      </div>
    </main>
  );
}
