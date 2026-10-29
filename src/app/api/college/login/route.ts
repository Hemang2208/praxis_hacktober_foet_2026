import { NextRequest, NextResponse } from 'next/server';
import { authenticateLocal, createAuthResponse } from '@/lib/passport/authenticate';
import '@/lib/passport'; // Initialize passport strategies

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required.' }, { status: 400 });
    }

    // Use Passport.js local strategy for college authentication
    const { user, error } = await authenticateLocal('local-college', email, password);

    if (!user) {
      return NextResponse.json({ error: error || 'Invalid credentials.' }, { status: 401 });
    }

    // Create response with JWT cookie
    return createAuthResponse(user, 'College login successful.');
  } catch (error) {
    console.error('College login error:', error);
    return NextResponse.json({ error: 'Error logging in' }, { status: 500 });
  }
}
