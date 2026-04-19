export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <span className="sr-only">Loading your itinerary...</span>
      
      {/* Hero block */}
      <div className="w-full h-72 rounded-3xl animate-pulse bg-slate-200 dark:bg-slate-800 mb-6"></div>
      
      {/* Utility tiles row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <div className="h-24 rounded-2xl animate-pulse bg-slate-200 dark:bg-slate-800"></div>
        <div className="h-24 rounded-2xl animate-pulse bg-slate-200 dark:bg-slate-800" style={{ animationDelay: '150ms' }}></div>
        <div className="h-24 rounded-2xl animate-pulse bg-slate-200 dark:bg-slate-800" style={{ animationDelay: '300ms' }}></div>
        <div className="h-24 rounded-2xl animate-pulse bg-slate-200 dark:bg-slate-800" style={{ animationDelay: '450ms' }}></div>
      </div>
      
      {/* Tab bar */}
      <div className="h-12 w-full rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800 mb-8" style={{ animationDelay: '150ms' }}></div>
      
      {/* Content area */}
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:col-span-2 flex-grow h-96 rounded-3xl animate-pulse bg-slate-200 dark:bg-slate-800" style={{ animationDelay: '300ms' }}></div>
        <div className="w-full lg:w-80 flex-shrink-0 h-96 rounded-3xl animate-pulse bg-slate-200 dark:bg-slate-800" style={{ animationDelay: '450ms' }}></div>
      </div>
    </div>
  );
}
