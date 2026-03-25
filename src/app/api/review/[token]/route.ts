import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parseToken } from '@/lib/tokens';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const parsed = parseToken(params.token);

  if (!parsed) {
    return NextResponse.json({ error: 'Invalid or expired review link.' }, { status: 400 });
  }

  const db = getDb();

  // Find the submission for this token
  const submission = db.prepare(
    'SELECT * FROM submissions WHERE token = ?'
  ).get(params.token) as {
    id: number;
    participant_id: number;
    cycle_id: number;
    is_self_review: number;
    submitted_at: string | null;
  } | undefined;

  if (!submission) {
    return NextResponse.json({ error: 'Review link not found.' }, { status: 404 });
  }

  const participant = db.prepare(
    'SELECT * FROM participants WHERE id = ?'
  ).get(submission.participant_id) as {
    id: number;
    name: string;
  } | undefined;

  if (!participant) {
    return NextResponse.json({ error: 'Participant not found.' }, { status: 404 });
  }

  const category = submission.is_self_review ? 'self' : 'peer';
  const questions = db.prepare(
    'SELECT * FROM questions WHERE category = ? ORDER BY order_index ASC'
  ).all(category);

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
