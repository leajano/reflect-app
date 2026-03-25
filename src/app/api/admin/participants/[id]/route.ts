import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const participantId = parseInt(params.id);

  const participant = db.prepare(`
    SELECT p.*, c.name as cycle_name
    FROM participants p
    JOIN cycles c ON p.cycle_id = c.id
    WHERE p.id = ?
  `).get(participantId) as {
    id: number;
    name: string;
    role: string;
    team: string;
    cycle_id: number;
    cycle_name: string;
  } | undefined;

  if (!participant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const submissions = db.prepare(
    'SELECT * FROM submissions WHERE participant_id = ?'
  ).all(participantId) as Array<{
    id: number;
    is_self_review: number;
    token: string;
    submitted_at: string | null;
  }>;

  const selfSubmission = submissions.find((s) => s.is_self_review === 1);
  const peerSubmissions = submissions.filter((s) => s.is_self_review === 0);
  const completedPeerCount = peerSubmissions.filter((s) => s.submitted_at !== null).length;

  const report = db.prepare(
    'SELECT id FROM reports WHERE participant_id = ? AND cycle_id = ?'
  ).get(participantId, participant.cycle_id) as { id: number } | undefined;

  const firstName = participant.name.split(' ')[0];

  return NextResponse.json({
    id: participant.id,
    name: participant.name,
    firstName,
    role: participant.role,
    team: participant.team,
    cycleName: participant.cycle_name,
    cycleId: participant.cycle_id,
    peerCount: completedPeerCount,
    selfDone: selfSubmission?.submitted_at != null,
    reportId: report?.id ?? null,
    selfToken: selfSubmission?.token ?? '',
    peerTokens: peerSubmissions.map((s) => s.token),
  });
}
