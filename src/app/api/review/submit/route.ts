import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, ensureDb, pool } from '@/lib/db';

export async function POST(request: NextRequest) {
  const { token, answers } = await request.json() as {
    token: string;
    answers: Record<string, string | number>;
  };

  if (!token || !answers) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
    [token]
  );

  if (!submission) {
    return NextResponse.json({ error: 'Invalid review link.' }, { status: 404 });
  }

  if (submission.submitted_at !== null) {
    return NextResponse.json({ error: 'This review has already been submitted.' }, { status: 409 });
  }

  const category = submission.is_self_review ? 'self' : 'peer';
  const questions = await query<{ id: number; type: string }>(
    'SELECT id, type FROM questions WHERE category = $1',
    [category]
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const question of questions) {
      const answer = answers[question.id];
      if (answer !== undefined && answer !== '') {
        if (question.type === 'scale') {
          await client.query(
            'INSERT INTO answers (submission_id, question_id, answer_text, answer_scale) VALUES ($1, $2, $3, $4)',
            [submission.id, question.id, null, Number(answer)]
          );
        } else {
          await client.query(
            'INSERT INTO answers (submission_id, question_id, answer_text, answer_scale) VALUES ($1, $2, $3, $4)',
            [submission.id, question.id, String(answer), null]
          );
        }
      }
    }

    await client.query('UPDATE submissions SET submitted_at = NOW() WHERE id = $1', [submission.id]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  return NextResponse.json({ success: true });
}
