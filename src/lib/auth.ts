import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'reflect_admin_session';
export const SESSION_VALUE = 'authenticated';

export function checkAdminAuth(): boolean {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(SESSION_COOKIE);
    return session?.value === SESSION_VALUE;
  } catch {
    return false;
  }
}

export function validatePasscode(passcode: string): boolean {
  const PASSCODE = process.env.ADMIN_PASSCODE || 'reflect2025';
  return passcode === PASSCODE;
}
