import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-cyan flex items-center justify-center font-mono font-bold text-bg">
            A
          </div>
          <span className="font-bold tracking-wide">SYNDICATE</span>
        </div>
        <div className="flex items-center gap-4">
          <SignedOut>
            <SignInButton>
              <button className="px-4 py-2 rounded bg-cyan text-bg font-medium hover:opacity-90">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/engagements"
              className="px-4 py-2 rounded bg-cyan text-bg font-medium hover:opacity-90"
            >
              Open dashboard
            </Link>
            <UserButton />
          </SignedIn>
        </div>
      </nav>

      <section className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <p className="text-gold font-bold tracking-widest text-sm mb-6">
          OPERATIONS LAYER · GEMINI ENTERPRISE AGENT PLATFORM
        </p>
        <h1 className="text-6xl md:text-8xl font-black text-cyan tracking-tight mb-6">
          The agency, in a box.
        </h1>
        <p className="max-w-2xl text-lg text-muted leading-relaxed mb-10">
          Rubicx's Syndicate runs the entire client engagement — discovery, strategy, design, build,
          project management, and post-launch ops — across six specialized agents.
          The Developer agent uses Lovable. The Syndicate does everything else.
        </p>
        <div className="flex gap-4">
          <SignedOut>
            <SignInButton>
              <button className="px-8 py-4 rounded bg-cyan text-bg font-bold hover:opacity-90">
                Start an engagement →
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/engagements/new"
              className="px-8 py-4 rounded bg-cyan text-bg font-bold hover:opacity-90"
            >
              Start an engagement →
            </Link>
          </SignedIn>
          <a
            href="https://github.com/USER/atlas"
            target="_blank"
            rel="noreferrer"
            className="px-8 py-4 rounded border border-white/20 text-white font-bold hover:bg-white/5"
          >
            GitHub
          </a>
        </div>
      </section>

      <footer className="border-t border-white/5 px-8 py-4 text-xs text-muted flex justify-between">
        <span>Rubicx · Google for Startups AI Agents Challenge 2026 · Track 2</span>
        <span>Apache 2.0</span>
      </footer>
    </main>
  );
}
