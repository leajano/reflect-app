import { NextRequest, NextResponse } from 'next/server';
import { validatePasscode, SESSION_COOKIE, SESSION_VALUE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { passcode } = await request.json();

  if (validatePasscode(passcode)) {
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, SESSION_VALUE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;
  }

  return NextResponse.json({ success: false }, { status: 401 });
}
