import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { query, queryOne, ensureDb } from '@/lib/db';
import { generateSelfToken } from '@/lib/tokens';

export async function GET() {
  if (!checkAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureDb();
  const participants = await query(`
    SELECT
      p.id, p.name, p.role, p.team, p.cycle_id, p.created_at,
      c.name as cycle_name,
      COUNT(CASE WHEN s.is_self_review = 0 AND s.submitted_at IS NOT NULL THEN 1 END)::int as peer_count,
      COUNT(CASE WHEN s.is_self_review = 1 AND s.submitted_at IS NOT NULL THEN 1 END)::int as self_count
    FROM participants p
    JOIN cycles c ON p.cycle_id = c.id
    LEFT JOIN submissions s ON s.participant_id = p.id
    GROUP BY p.id, p.name, p.role, p.team, p.cycle_id, p.created_at, c.name
    ORDER BY p.name ASC
  `);

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

  await ensureDb();

  const cycle = await queryOne('SELECT id FROM cycles WHERE id = $1', [parseInt(cycle_id)]);
  if (!cycle) {
    return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
  }

  const row = await queryOne<{ id: number }>(
    'INSERT INTO participants (name, role, team, cycle_id) VALUES ($1, $2, $3, $4) RETURNING id',
    [name, role, team, parseInt(cycle_id)]
  );
  const participantId = row!.id;

  const selfToken = generateSelfToken(participantId, parseInt(cycle_id));
  await query(
    'INSERT INTO submissions (participant_id, cycle_id, is_self_review, token) VALUES ($1, $2, 1, $3)',
    [participantId, parseInt(cycle_id), selfToken]
  );

  return NextResponse.json({ id: participantId });
}
