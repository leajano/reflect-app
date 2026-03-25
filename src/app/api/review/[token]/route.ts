import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, ensureDb } from '@/lib/db';
import { parseToken } from '@/lib/tokens';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const parsed = parseToken(params.token);
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid or expired review link.' }, { status: 400 });
  }

  await ensureDb();

  const submission = await queryOne<{
    id: number;
    participant_id: number;
    cycle_id: number;
    is_self_review: number;
    submitted_at: string | null;
  }>(
    'SELECT id, participant_id, cycle_id, is_self_review, submitted_at FROM submissions WHERE token = $1',
    [params.token]
  );

  if (!submission) {
    return NextResponse.json({ error: 'Review link not found.' }, { status: 404 });
  }

  const participant = await queryOne<{ id: number; name: string }>(
    'SELECT id, name FROM participants WHERE id = $1',
    [submission.participant_id]
  );

  if (!participant) {
    return NextResponse.json({ error: 'Participant not found.' }, { status: 404 });
  }

  const category = submission.is_self_review ? 'self' : 'peer';
  const questions = await query(
    'SELECT * FROM questions WHERE category = $1 ORDER BY order_index ASC',
    [category]
  );

  const firstName = participant.name.split(' ')[0];

  return NextResponse.json({
    participantName: participant.name,
    firstName,
    isSelf: submission.is_self_review === 1,
    questions,
    submissionId: submission.id,
    alreadySubmitted: submission.submitted_at !== null,
  });
}
