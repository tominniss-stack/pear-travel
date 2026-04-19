'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          body { font-family: system-ui, sans-serif; margin: 0; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; flex-direction: column; gap: 1.5rem; text-align: center; }
          button { background: #f8fafc; color: #0f172a; border: none; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: bold; cursor: pointer; }
        ` }} />
      </head>
      <body>
        <h1>Critical Error</h1>
        <p>We apologize, but something went seriously wrong.</p>
        <button onClick={() => reset()}>Try Again</button>
      </body>
    </html>
  );
}
