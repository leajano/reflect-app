import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { query, queryOne, ensureDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureDb();
  const participantId = parseInt(params.id);

  const participant = await queryOne<{
    id: number;
    name: string;
    role: string;
    team: string;
    cycle_id: number;
    cycle_name: string;
  }>(
    `SELECT p.*, c.name as cycle_name
     FROM participants p
     JOIN cycles c ON p.cycle_id = c.id
     WHERE p.id = $1`,
    [participantId]
  );

  if (!participant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const submissions = await query<{
    id: number;
    is_self_review: number;
    token: string;
    submitted_at: string | null;
  }>(
    'SELECT id, is_self_review, token, submitted_at FROM submissions WHERE participant_id = $1',
    [participantId]
  );

  const selfSubmission = submissions.find((s) => s.is_self_review === 1);
  const peerSubmissions = submissions.filter((s) => s.is_self_review === 0);
  const completedPeerCount = peerSubmissions.filter((s) => s.submitted_at !== null).length;

  const report = await queryOne<{ id: number }>(
    'SELECT id FROM reports WHERE participant_id = $1 AND cycle_id = $2',
    [participantId, participant.cycle_id]
  );

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
