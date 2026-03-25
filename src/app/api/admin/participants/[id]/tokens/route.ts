import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { query, queryOne, ensureDb, getPool } from '@/lib/db';
import { generatePeerToken } from '@/lib/tokens';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureDb();
  const participantId = parseInt(params.id);

  const participant = await queryOne<{ id: number; cycle_id: number }>(
    'SELECT id, cycle_id FROM participants WHERE id = $1',
    [participantId]
  );

  if (!participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }

  const countRow = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM submissions WHERE participant_id = $1 AND is_self_review = 0',
    [participantId]
  );
  const existingCount = parseInt(countRow?.count ?? '0');

  if (existingCount >= 8) {
    return NextResponse.json(
      { error: 'Maximum of 8 peer review links already generated' },
      { status: 400 }
    );
  }

  const toGenerate = Math.min(4, 8 - existingCount);
  const tokens: string[] = [];

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < toGenerate; i++) {
      const token = generatePeerToken(participantId, participant.cycle_id);
      await client.query(
        'INSERT INTO submissions (participant_id, cycle_id, is_self_review, token) VALUES ($1, $2, 0, $3)',
        [participantId, participant.cycle_id, token]
      );
      tokens.push(token);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  return NextResponse.json({ tokens });
}
