/**
 * Google OAuth Initiation Route
 * Redirects users to Google's OAuth consent screen
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOAuthAuthorizationUrl } from '@/lib/passport/authenticate';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userType = (searchParams.get('type') as 'student' | 'college' | 'company') || 'student';
  const redirect = searchParams.get('redirect') || undefined;

  const authUrl = getOAuthAuthorizationUrl('google', userType, redirect);

  if (!authUrl) {
    return NextResponse.json(
      { error: 'Google OAuth is not configured' },
      { status: 500 }
    );
  }

  return NextResponse.redirect(authUrl);
}
