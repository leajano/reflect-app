import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.redirect(
    new URL('/admin', process.env.NEXTAUTH_URL || 'http://localhost:3000')
  );
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
