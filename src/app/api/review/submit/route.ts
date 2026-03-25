import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  const { token, answers } = await request.json() as {
    token: string;
    answers: Record<string, string | number>;
  };

  if (!token || !answers) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const db = getDb();

  // Find submission by token
  const submission = db.prepare(
    'SELECT * FROM submissions WHERE token = ?'
  ).get(token) as {
    id: number;
    participant_id: number;
    cycle_id: number;
    is_self_review: number;
    submitted_at: string | null;
  } | undefined;

  if (!submission) {
    return NextResponse.json({ error: 'Invalid review link.' }, { status: 404 });
  }

  if (submission.submitted_at !== null) {
    return NextResponse.json({ error: 'This review has already been submitted.' }, { status: 409 });
  }

  // Get questions for category
  const category = submission.is_self_review ? 'self' : 'peer';
  const questions = db.prepare(
    'SELECT * FROM questions WHERE category = ?'
  ).all(category) as Array<{ id: number; type: string }>;

  // Insert answers and mark as submitted
  const insertAnswer = db.prepare(
    'INSERT INTO answers (submission_id, question_id, answer_text, answer_scale) VALUES (?, ?, ?, ?)'
  );

  const submitTransaction = db.transaction(() => {
    for (const question of questions) {
      const answer = answers[question.id];
      if (answer !== undefined && answer !== '') {
        if (question.type === 'scale') {
          insertAnswer.run(submission.id, question.id, null, Number(answer));
        } else {
          insertAnswer.run(submission.id, question.id, String(answer), null);
        }
      }
    }

    db.prepare(
      "UPDATE submissions SET submitted_at = datetime('now') WHERE id = ?"
    ).run(submission.id);
  });

  submitTransaction();

  return NextResponse.json({ success: true });
}
