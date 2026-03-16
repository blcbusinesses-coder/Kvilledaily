'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-24 text-center">
      <h2 className="font-serif text-3xl font-bold mb-4 text-newsdark">Something went wrong</h2>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        There was an error loading this page. This usually means the database migration hasn't been
        run yet, or there's a temporary connection issue.
      </p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={reset}
          className="bg-newsred text-white px-6 py-2 font-sans text-sm uppercase tracking-widest hover:bg-red-800 transition-colors"
        >
          Try Again
        </button>
        <a
          href="/"
          className="border border-newsdark text-newsdark px-6 py-2 font-sans text-sm uppercase tracking-widest hover:bg-gray-100 transition-colors"
        >
          Go Home
        </a>
      </div>
      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-8 text-left text-xs bg-gray-100 p-4 rounded max-w-2xl mx-auto overflow-auto text-red-600">
          {error.message}
        </pre>
      )}
    </div>
  );
}
