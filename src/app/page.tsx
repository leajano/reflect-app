export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-stone-50">
      <div className="max-w-md w-full text-center space-y-6">
        <div>
          <h1 className="text-4xl font-light tracking-tight text-stone-900 mb-2">
            Matchfire Peer Review Tool
          </h1>
        </div>

        <p className="text-stone-500 leading-relaxed">
          This tool is invitation-only. To participate, you&apos;ll need a unique link provided by your admin. If you don&apos;t have one, please reach out to them directly.
        </p>

        <div className="pt-8 border-t border-stone-200">
          <a href="/admin" className="text-stone-400 text-xs hover:text-stone-600 transition-colors">
            Admin access →
          </a>
        </div>
      </div>
    </main>
  );
}
