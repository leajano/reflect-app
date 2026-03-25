import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { queryOne, ensureDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureDb();
  const reportId = parseInt(params.id);

  const report = await queryOne(
    `SELECT r.*, p.name as participant_name, p.role, p.team, c.name as cycle_name
     FROM reports r
     JOIN participants p ON r.participant_id = p.id
     JOIN cycles c ON r.cycle_id = c.id
     WHERE r.id = $1`,
    [reportId]
  );

  if (!report) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(report);
}
