import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { ThemeToggle } from '../components/ThemeToggle';

// Simple SVG Icons for the steps
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const FileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
);
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const RocketIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
);

export default function Home() {
  const steps = [
    { title: "Define scope", description: "Outline your project objectives", icon: <FileIcon />, active: false },
    { title: "Assemble agents", description: "We assign the right AI agents", icon: <UsersIcon />, active: false },
    { title: "Review strategy", description: "Approve the multi-agent execution plan", icon: <UserIcon />, active: false },
    { title: "Start engagement", description: "Get up and running in 3 minutes", icon: <RocketIcon />, active: true },
  ];

  return (
    <main className="h-screen w-full flex bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-white overflow-hidden font-sans transition-colors duration-300">
      
      {/* Left Column - Content & Stepper */}
      <div className="flex-1 lg:w-[45%] xl:w-[40%] flex-none flex flex-col relative overflow-hidden">
        
        {/* Subtle background pattern/gradient */}
        <div className="absolute -bottom-[20%] -left-[20%] w-[140%] h-[60%] bg-gradient-to-tr from-black/5 dark:from-white/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        {/* Mobile Nav / Top Auth */}
        <div className="w-full p-6 lg:p-10 flex justify-between items-center relative z-20">
          <div className="flex items-center gap-3">
            <div className="flex gap-1 items-center justify-center transform -rotate-45">
              <div className="w-1.5 h-6 bg-zinc-900 dark:bg-white rounded-full transition-colors duration-300" />
              <div className="w-1.5 h-6 bg-zinc-900 dark:bg-white rounded-full transition-colors duration-300" />
              <div className="w-1.5 h-6 bg-zinc-900 dark:bg-white rounded-full transition-colors duration-300" />
            </div>
            <span className="font-bold tracking-wide text-lg ml-2">Rubicx's Syndicate</span>
          </div>
          
          {/* Mobile Auth (Hidden on Desktop) */}
          <div className="flex lg:hidden items-center gap-4">
            <ThemeToggle />
            <SignedOut>
              <SignInButton>
                <button className="text-sm font-semibold hover:text-zinc-600 dark:hover:text-white/80 transition-colors mr-2">
                  Log in
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/engagements" className="text-sm font-semibold text-zinc-500 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white mr-4 transition-colors">
                Dashboard
              </Link>
              <UserButton />
            </SignedIn>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 px-8 lg:px-16 py-4 flex flex-col justify-center max-w-lg mx-auto w-full relative z-10">
          <h1 className="text-3xl md:text-4xl lg:text-[2.2rem] font-bold mb-3 tracking-tight">
            Get Started
          </h1>
          <p className="text-zinc-500 dark:text-white/60 mb-8 text-sm md:text-base tracking-wide transition-colors duration-300">
            Welcome to Rubicx's Syndicate — Let's initiate your engagement.
          </p>

          <div className="relative mb-8">
            {/* Vertical Line connecting steps */}
            <div className="absolute left-[19px] top-4 bottom-8 w-[2px] bg-zinc-200 dark:bg-white/10 transition-colors duration-300" />

            {steps.map((step, index) => (
              <div key={index} className={`flex gap-5 mb-8 last:mb-0 ${step.active ? '' : 'opacity-50 hover:opacity-80 transition-opacity'}`}>
                {/* Icon Container */}
                <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-sm transition-colors duration-300 ${
                  step.active ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-black shadow-md' : 'bg-zinc-50 dark:bg-[#09090b] border-zinc-300 dark:border-white/20 text-zinc-900 dark:text-white'
                }`}>
                  {step.icon}
                </div>
                
                {/* Text Content */}
                <div className={`flex flex-col flex-1 pb-2 ${
                  step.active ? 'bg-black/5 dark:bg-white/5 px-5 py-3 -mt-2 rounded-xl backdrop-blur-md border border-black/5 dark:border-white/10 shadow-sm dark:shadow-xl' : 'pt-1.5'
                }`}>
                  <span className={`text-sm font-bold tracking-wide`}>
                    {step.title}
                  </span>
                  <span className={`text-[13px] mt-1 ${step.active ? 'text-zinc-600 dark:text-white/80' : 'text-zinc-500 dark:text-white/60'}`}>
                    {step.description}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="w-full">
            <SignedOut>
              <SignInButton>
                <button className="w-full py-3.5 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-sm shadow-[0_8px_30px_rgb(5,150,105,0.25)] transition-all hover:-translate-y-0.5 border border-[#059669]/50">
                  Start Engagement
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/engagements" className="flex w-full">
                <button className="w-full py-3.5 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-sm shadow-[0_8px_30px_rgb(5,150,105,0.25)] transition-all hover:-translate-y-0.5 border border-[#059669]/50">
                  Start Engagement
                </button>
              </Link>
            </SignedIn>
          </div>
        </div>
      </div>

      {/* Right Column - Massive Image */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] flex-none p-4 lg:p-6 bg-zinc-50 dark:bg-[#09090b] transition-colors duration-300">
        <div className="w-full h-full rounded-[2rem] overflow-hidden shadow-2xl relative group bg-zinc-200 dark:bg-black/20 border border-zinc-200 dark:border-white/5 transition-colors duration-300">
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
            style={{ backgroundImage: "url('/images/characters.png')" }}
          />
          {/* Subtle inner shadow overlay */}
          <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] pointer-events-none transition-shadow duration-300" />
          
          {/* Floating Auth Controls for Desktop */}
          <div className="absolute top-6 right-6 z-20 flex items-center gap-5 bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-white/40 dark:border-white/10 px-5 py-2.5 rounded-full shadow-2xl">
            <ThemeToggle />
            <SignedOut>
              <SignInButton>
                <button className="text-sm font-semibold text-zinc-900 dark:text-white hover:opacity-80 transition-opacity mr-1">
                  Log in
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/engagements" className="text-sm font-bold tracking-wide text-zinc-900 dark:text-white hover:opacity-80 transition-opacity">
                Dashboard
              </Link>
              <div className="ml-2 pl-4 border-l border-zinc-900/10 dark:border-white/10 h-6 flex items-center">
                <UserButton />
              </div>
            </SignedIn>
          </div>
        </div>
      </div>
      
    </main>
  );
}
