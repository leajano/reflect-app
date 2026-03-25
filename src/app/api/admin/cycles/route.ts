import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { query, queryOne, ensureDb } from '@/lib/db';

export async function GET() {
  if (!checkAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureDb();
  const cycles = await query('SELECT * FROM cycles ORDER BY created_at DESC');
  return NextResponse.json({ cycles });
}

export async function POST(request: NextRequest) {
  if (!checkAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, status = 'active' } = await request.json();
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  await ensureDb();
  const row = await queryOne<{ id: number }>(
    'INSERT INTO cycles (name, status) VALUES ($1, $2) RETURNING id',
    [name, status]
  );

  return NextResponse.json({ id: row?.id, name, status });
}
