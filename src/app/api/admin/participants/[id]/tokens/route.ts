import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { generatePeerToken } from '@/lib/tokens';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const participantId = parseInt(params.id);

  const participant = db.prepare(
    'SELECT id, cycle_id FROM participants WHERE id = ?'
  ).get(participantId) as { id: number; cycle_id: number } | undefined;

  if (!participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }

  // Count existing peer submissions
  const existingCount = (db.prepare(
    'SELECT COUNT(*) as count FROM submissions WHERE participant_id = ? AND is_self_review = 0'
  ).get(participantId) as { count: number }).count;

  if (existingCount >= 8) {
    return NextResponse.json(
      { error: 'Maximum of 8 peer review links already generated' },
      { status: 400 }
    );
  }

  // Generate tokens in a batch of 4, up to the limit of 8
  const toGenerate = Math.min(4, 8 - existingCount);
  const tokens: string[] = [];

  const insertSubmission = db.prepare(
    'INSERT INTO submissions (participant_id, cycle_id, is_self_review, token) VALUES (?, ?, 0, ?)'
  );

  const generateBatch = db.transaction(() => {
    for (let i = 0; i < toGenerate; i++) {
      const token = generatePeerToken(participantId, participant.cycle_id);
      insertSubmission.run(participantId, participant.cycle_id, token);
      tokens.push(token);
    }
  });

  generateBatch();

  return NextResponse.json({ tokens });
}
