export default function Loading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="border-4 border-brand-500 border-t-transparent rounded-full w-10 h-10 animate-spin"></div>
      <span className="sr-only">Loading, please wait...</span>
    </div>
  );
}
