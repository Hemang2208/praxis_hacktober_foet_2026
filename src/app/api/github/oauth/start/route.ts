import {  NextResponse } from "next/server";

// Replace with your GitHub OAuth app credentials
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const REDIRECT_URI = process.env.GITHUB_OAUTH_REDIRECT_URI;

// Step 1: Redirect user to GitHub OAuth
export async function GET(req) {
  // Get redirect param from query
  const { searchParams } = new URL(req.url);
  const redirectParam = searchParams.get("redirect");
  // Pass redirect param to callback so it can be used after auth
  let callbackUri = REDIRECT_URI;
  if (redirectParam) {
    callbackUri += `?redirect=${encodeURIComponent(redirectParam)}`;
  }
  // Request full repo access (public + private)
  const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(callbackUri)}&scope=repo%20read:user%20user:email`;
  return NextResponse.redirect(url);
}
