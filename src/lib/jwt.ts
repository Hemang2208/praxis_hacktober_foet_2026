
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const encoder = new TextEncoder();
const secret = encoder.encode(JWT_SECRET);

export async function signJwt(payload: object, expiresIn = '7d') {
  // jose expects payload to not include reserved claims like exp, iat, etc.
  // expiresIn is a string like '7d', convert to seconds
  let seconds = 60 * 60 * 24 * 7; // default 7d
  if (typeof expiresIn === 'string') {
    const match = expiresIn.match(/(\d+)([smhd])/);
    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2];
      if (unit === 's') seconds = value;
      if (unit === 'm') seconds = value * 60;
      if (unit === 'h') seconds = value * 60 * 60;
      if (unit === 'd') seconds = value * 60 * 60 * 24;
    }
  }
  return await new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(Math.floor(Date.now() / 1000) + seconds)
    .sign(secret);
}

export async function verifyJwt(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}
