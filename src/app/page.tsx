import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-stone-50">
      <div className="max-w-md w-full text-center space-y-12">
        {/* Wordmark */}
        <div>
          <h1 className="text-4xl font-light tracking-tight text-stone-900 mb-2">
            reflect
          </h1>
          <p className="text-stone-500 text-sm">
            Peer review for creative teams
          </p>
        </div>

        {/* Options */}
        <div className="space-y-4">
          <p className="text-stone-600 text-sm uppercase tracking-widest font-medium">
            I&apos;m here to
          </p>

          <div className="space-y-3">
            <Link
              href="#"
              className="block w-full py-4 px-6 bg-stone-900 text-stone-50 rounded-lg text-center hover:bg-stone-800 transition-colors font-medium"
            >
              Review a colleague
            </Link>

            <Link
              href="#"
              className="block w-full py-4 px-6 border border-stone-300 text-stone-700 rounded-lg text-center hover:border-stone-400 hover:bg-stone-100 transition-colors font-medium"
            >
              Complete my self-review
            </Link>
          </div>

          <p className="text-stone-400 text-xs leading-relaxed mt-6">
            You&apos;ll need a unique review link sent to you by your team admin.
            If you don&apos;t have one, reach out to them directly.
          </p>
        </div>

        {/* Admin link */}
        <div className="pt-8 border-t border-stone-200">
          <Link
            href="/admin"
            className="text-stone-400 text-xs hover:text-stone-600 transition-colors"
          >
            Admin access →
          </Link>
        </div>
      </div>
    </main>
  );
}
