import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { generateSelfToken } from '@/lib/tokens';

export async function GET() {
  if (!checkAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const participants = db.prepare(`
    SELECT p.*, c.name as cycle_name,
      COUNT(CASE WHEN s.is_self_review = 0 AND s.submitted_at IS NOT NULL THEN 1 END) as peer_count,
      COUNT(CASE WHEN s.is_self_review = 1 AND s.submitted_at IS NOT NULL THEN 1 END) as self_count
    FROM participants p
    JOIN cycles c ON p.cycle_id = c.id
    LEFT JOIN submissions s ON s.participant_id = p.id
    GROUP BY p.id
    ORDER BY p.name ASC
  `).all();

  return NextResponse.json({ participants });
}

export async function POST(request: NextRequest) {
  if (!checkAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, role, team, cycle_id } = await request.json();

  if (!name || !role || !team || !cycle_id) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  const db = getDb();

  // Check cycle exists
  const cycle = db.prepare('SELECT id FROM cycles WHERE id = ?').get(parseInt(cycle_id));
  if (!cycle) {
    return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
  }

  const result = db.prepare(
    'INSERT INTO participants (name, role, team, cycle_id) VALUES (?, ?, ?, ?)'
  ).run(name, role, team, parseInt(cycle_id));

  const participantId = result.lastInsertRowid as number;

  // Auto-create the self-review submission token
  const selfToken = generateSelfToken(participantId, parseInt(cycle_id));
  db.prepare(
    'INSERT INTO submissions (participant_id, cycle_id, is_self_review, token) VALUES (?, ?, 1, ?)'
  ).run(participantId, parseInt(cycle_id), selfToken);

  return NextResponse.json({ id: participantId });
}
