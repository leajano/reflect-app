import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  if (!checkAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const cycles = db.prepare('SELECT * FROM cycles ORDER BY created_at DESC').all();
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

  const db = getDb();
  const result = db.prepare('INSERT INTO cycles (name, status) VALUES (?, ?)').run(name, status);

  return NextResponse.json({ id: result.lastInsertRowid, name, status });
}
