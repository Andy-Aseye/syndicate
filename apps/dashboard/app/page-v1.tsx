import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 md:p-6 lg:p-8 relative overflow-hidden bg-bg">
      {/* Blurred Outer Background Image Layer */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: "url('/images/characters.png')" }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-bg/90 via-bg/60 to-bg" />

      {/* Inner Frame */}
      <div className="relative z-10 w-full h-full min-h-[calc(100vh-7rem)] md:min-h-[calc(100vh-7rem)] lg:min-h-[calc(100vh-7rem)] rounded-[2rem] overflow-hidden flex flex-col shadow-2xl border border-white/20">

        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/characters.png')" }}
        />
        {/* Subtle overlay for text readability inside the inner container */}
        <div className="absolute inset-0 z-0 bg-black/70 backdrop-blur-xs" />

        {/* --- Content inside the frame --- */}
        <div className="relative z-20 flex flex-col h-full flex-1">
          <nav className="flex items-center justify-between px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-cyan flex items-center justify-center font-mono font-bold text-bg">
                A
              </div>
              <span className="font-bold tracking-widest text-white text-xs">SYNDICATE</span>
            </div>
            <div className="flex items-center gap-4 ml-4">
              <SignedOut>
                <SignInButton>
                  <button className="px-4 py-2 rounded bg-cyan text-bg font-bold tracking-widest text-xs uppercase hover:opacity-90 transition-opacity">
                    Sign in
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/engagements"
                  className="px-4 py-2 rounded bg-cyan text-bg font-bold tracking-widest text-xs uppercase hover:opacity-90 transition-opacity"
                >
                  Dashboard
                </Link>
                <UserButton />
              </SignedIn>
            </div>
          </nav>

          <section className="flex-1 flex flex-col justify-center px-8 lg:px-16 pb-12 pt-4">
            <div className="w-full h-full flex flex-col">

              {/* Massive Title Area */}
              <div className="flex flex-col relative w-full mb-auto mt-8 md:mt-12">
                <div className="hidden md:flex flex-col text-right absolute right-0 top-0 text-xs font-bold tracking-[0.2em] text-white/80 uppercase">
                  <span>Enterprise AI</span>
                  <span>Agent Platform</span>
                </div>

                <h1 className="text-[8vw] leading-[0.8] font-sans tracking-tight text-white uppercase text-center md:text-left">
                  Rubicx's<br />Syndicate
                </h1>
              </div>

              {/* Description and Action Area */}
              <div className="mt-12 md:mt-auto flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12 pt-8">

                <div className="max-w-sm">
                  <p className="text-sm text-white/80 leading-relaxed mb-6 font-medium">
                    Rubicx's Syndicate is an architecture and operations platform, providing teams with all services relating to AI multi-agent orchestration covering all project phases.
                  </p>
                  <div className="flex flex-col gap-4">
                    <SignedOut>
                      <SignInButton>
                        <button className="text-xs font-bold tracking-[0.2em] uppercase text-white hover:text-cyan transition-colors flex items-center gap-2 text-left">
                          ABOUT US <span className="text-lg leading-none mb-1">→</span>
                        </button>
                      </SignInButton>
                    </SignedOut>
                    <SignedIn>
                      <Link
                        href="/engagements/new"
                        className="text-xs font-bold tracking-[0.2em] uppercase text-white hover:text-cyan transition-colors flex items-center gap-2 text-left"
                      >
                        START PROJECT <span className="text-lg leading-none mb-1">→</span>
                      </Link>
                    </SignedIn>
                  </div>
                </div>

                {/* Big bottom text similar to EMPOWERING SPACES */}
                <div className="text-[3.6vw] font-sans tracking-tight text-white/90 uppercase leading-none hidden md:block text-right">
                  Empowering<br />Operations
                </div>

              </div>
            </div>
          </section>

          <footer className="px-8 py-6 text-[10px] tracking-[0.2em] font-bold text-white/50 uppercase flex justify-between items-center w-full mt-auto">
            <span>Rubicx · AI Agents Challenge 2026</span>
            <div className="flex gap-4">
              <a href="https://github.com/USER/atlas" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
              <span>All Rights Reserved</span>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
