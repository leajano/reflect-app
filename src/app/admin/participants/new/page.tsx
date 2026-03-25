'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Cycle {
  id: number;
  name: string;
  status: string;
}

export default function NewParticipantPage() {
  const router = useRouter();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    role: '',
    team: 'Design' as 'Design' | 'Account' | 'Auctions' | 'Dev',
    cycle_id: '',
  });

  useEffect(() => {
    fetch('/api/admin/cycles')
      .then((r) => r.json())
      .then((data) => {
        setCycles(data.cycles || []);
        const active = data.cycles?.find((c: Cycle) => c.status === 'active');
        if (active) setForm((f) => ({ ...f, cycle_id: String(active.id) }));
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/admin/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (data.id) {
      router.push(`/admin/participants/${data.id}`);
    } else {
      setError(data.error || 'Failed to create participant.');
      setLoading(false);
    }
  }

  async function handleCreateCycle() {
    const name = prompt('Enter cycle name (e.g. "Q1 2025"):');
    if (!name) return;

    const res = await fetch('/api/admin/cycles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, status: 'active' }),
    });

    const data = await res.json();
    if (data.id) {
      setCycles((prev) => [data, ...prev]);
      setForm((f) => ({ ...f, cycle_id: String(data.id) }));
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="border-b border-stone-200 bg-white">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-stone-400 hover:text-stone-600 text-sm">
            ← Dashboard
          </Link>
          <span className="text-stone-300">·</span>
          <span className="text-stone-900 text-sm font-medium">New participant</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white border border-stone-200 rounded-lg p-8">
          <h1 className="text-xl font-light text-stone-900 mb-8">Add participant</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Full name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="e.g. Sarah Chen"
                className="w-full border border-stone-200 rounded-lg px-4 py-3 text-stone-900 placeholder-stone-300 focus:outline-none focus:border-stone-400 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Role / Title</label>
              <input
                type="text"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                required
                placeholder="e.g. Senior Designer"
                className="w-full border border-stone-200 rounded-lg px-4 py-3 text-stone-900 placeholder-stone-300 focus:outline-none focus:border-stone-400 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Team</label>
              <select
                value={form.team}
                onChange={(e) => setForm({ ...form, team: e.target.value as typeof form.team })}
                className="w-full border border-stone-200 rounded-lg px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-400 bg-white"
              >
                <option value="Design">Design</option>
                <option value="Account">Account</option>
                <option value="Auctions">Auctions</option>
                <option value="Dev">Dev</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-stone-700">Review Cycle</label>
                <button
                  type="button"
                  onClick={handleCreateCycle}
                  className="text-xs text-stone-400 hover:text-stone-600"
                >
                  + Create new cycle
                </button>
              </div>
              <select
                value={form.cycle_id}
                onChange={(e) => setForm({ ...form, cycle_id: e.target.value })}
                required
                className="w-full border border-stone-200 rounded-lg px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-400 bg-white"
              >
                <option value="">Select a cycle</option>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.status === 'active' ? '(active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-stone-900 text-stone-50 rounded-lg font-medium hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create participant'}
              </button>
              <Link
                href="/admin/dashboard"
                className="px-6 py-3 border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
