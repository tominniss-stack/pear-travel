import TripIntakeForm from '@/components/intake/TripIntakeForm';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 py-10 sm:py-16">
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 flex flex-col gap-10">
        
        {/* Minimalist Header */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Plan your trip <span className="text-emerald-600 dark:text-emerald-400">faster.</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
            Your selections auto-save locally. Pick up right where you left off.
          </p>
        </header>

        {/* The Wide Form Container */}
        <div className="w-full rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl shadow-slate-200/50 dark:shadow-none sm:p-12">
          <TripIntakeForm />
        </div>

      </main>
    </div>
  );
}