import Link from 'next/link';

export default function ThanksPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-stone-50">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="w-12 h-12 bg-stone-900 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-stone-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-light text-stone-900">
            Thank you.
          </h1>

          <p className="text-stone-500 leading-relaxed">
            Your responses have been submitted. They&apos;ll be kept anonymous and
            used to help your colleague grow.
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="/"
            className="text-stone-400 text-sm hover:text-stone-600 transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
