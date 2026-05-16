import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import NewEngagementForm from '@/components/NewEngagementForm';

export default async function NewEngagementPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <main className="min-h-screen px-8 py-10 max-w-2xl mx-auto">
      <Link href="/engagements" className="text-sm text-muted hover:text-cyan">
        ← Engagements
      </Link>
      <h1 className="text-3xl font-bold mt-4 mb-2">Start a new engagement</h1>
      <p className="text-muted mb-8">
        Atlas will run Discovery → Strategy → Designer → Developer → PM → Account.
        The Developer agent calls Lovable for codegen.
      </p>

      <NewEngagementForm />
    </main>
  );
}
