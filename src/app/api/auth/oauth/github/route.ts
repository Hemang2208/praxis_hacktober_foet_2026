/**
 * GitHub OAuth Initiation Route
 * Redirects users to GitHub's OAuth consent screen
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOAuthAuthorizationUrl } from '@/lib/passport/authenticate';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userType = (searchParams.get('type') as 'student' | 'college' | 'company') || 'student';
  const redirect = searchParams.get('redirect') || undefined;

  const authUrl = getOAuthAuthorizationUrl('github', userType, redirect);

  if (!authUrl) {
    return NextResponse.json(
      { error: 'GitHub OAuth is not configured' },
      { status: 500 }
    );
  }

  return NextResponse.redirect(authUrl);
}
