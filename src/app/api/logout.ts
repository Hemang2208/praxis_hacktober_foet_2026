import { NextResponse } from 'next/server';

export async function POST() {
  // Remove the JWT cookie to end the session
  const response = NextResponse.json({ message: 'Logged out successfully.' });
  response.cookies.set('aipm_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
