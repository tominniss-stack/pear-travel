'use client';

export default function ExportPdfButton() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <button
      onClick={handlePrint}
      // The `print:hidden` class ensures this button doesn't appear on the actual PDF
      className="
        print:hidden
        inline-flex items-center gap-2 rounded-full bg-zinc-100 dark:bg-zinc-800 
        px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 
        transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white
      "
    >
      <svg 
        className="h-4 w-4" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24" 
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      Export PDF
    </button>
  );
}