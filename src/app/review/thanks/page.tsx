export default function ThanksPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-stone-50">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-12 h-12 bg-stone-900 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-stone-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-light text-stone-900">
          Thank you for submitting your response.
        </h1>

        <p className="text-stone-500 leading-relaxed">
          You&apos;ll be notified by email when your peer review report is complete.
        </p>
      </div>
    </main>
  );
}
