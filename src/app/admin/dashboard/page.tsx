import { redirect } from 'next/navigation';
import Link from 'next/link';
import { checkAdminAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

interface ParticipantRow {
  id: number;
  name: string;
  role: string;
  team: string;
  cycle_name: string;
  peer_count: number;
  self_count: number;
  report_id: number | null;
}

export default function DashboardPage() {
  if (!checkAdminAuth()) {
    redirect('/admin');
  }

  const db = getDb();

  const cycles = db.prepare('SELECT * FROM cycles ORDER BY created_at DESC').all() as Array<{
    id: number;
    name: string;
    status: string;
    created_at: string;
  }>;

  const participants = db.prepare(`
    SELECT
      p.id, p.name, p.role, p.team,
      c.name as cycle_name,
      COUNT(CASE WHEN s.is_self_review = 0 AND s.submitted_at IS NOT NULL THEN 1 END) as peer_count,
      COUNT(CASE WHEN s.is_self_review = 1 AND s.submitted_at IS NOT NULL THEN 1 END) as self_count,
      r.id as report_id
    FROM participants p
    JOIN cycles c ON p.cycle_id = c.id
    LEFT JOIN submissions s ON s.participant_id = p.id
    LEFT JOIN reports r ON r.participant_id = p.id AND r.cycle_id = p.cycle_id
    GROUP BY p.id
    ORDER BY c.created_at DESC, p.name ASC
  `).all() as ParticipantRow[];

  const activeCycle = cycles.find((c) => c.status === 'active');

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Nav */}
      <nav className="border-b border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-light text-stone-900 text-lg">reflect</span>
          <div className="flex items-center gap-6">
            <Link href="/admin/participants/new" className="text-sm text-stone-600 hover:text-stone-900">
              + Add participant
            </Link>
            <form action="/api/admin/logout" method="POST">
              <button type="submit" className="text-sm text-stone-400 hover:text-stone-600">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* Active cycle */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest text-stone-400 font-medium">
              Active Cycle
            </h2>
          </div>

          {activeCycle ? (
            <div className="bg-white border border-stone-200 rounded-lg p-5">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium text-stone-900">{activeCycle.name}</span>
                <span className="text-stone-400 text-sm">Active</span>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-lg p-5">
              <p className="text-stone-500 text-sm">
                No active cycle. Add a participant to create one.
              </p>
            </div>
          )}
        </div>

        {/* Participants */}
        <div className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest text-stone-400 font-medium">
            Participants
          </h2>

          {participants.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-lg p-8 text-center">
              <p className="text-stone-500 text-sm mb-4">No participants yet.</p>
              <Link
                href="/admin/participants/new"
                className="inline-block px-4 py-2 bg-stone-900 text-stone-50 rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors"
              >
                Add first participant
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100">
              {participants.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/participants/${p.id}`}
                  className="flex items-center justify-between p-5 hover:bg-stone-50 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-stone-900">{p.name}</span>
                      <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                        {p.team}
                      </span>
                      {p.report_id && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Report ready
                        </span>
                      )}
                    </div>
                    <p className="text-stone-500 text-sm">{p.role} · {p.cycle_name}</p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <div className="text-sm text-stone-900 font-medium">
                      {p.peer_count} peer {p.peer_count === 1 ? 'review' : 'reviews'}
                    </div>
                    <div className="text-xs text-stone-400">
                      {p.self_count > 0 ? '✓ Self-review done' : 'No self-review'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
