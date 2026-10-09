import { NextResponse } from "next/server";
import { authSecret } from "@/auth";

const googleCredentialsConfigured = Boolean(
  (process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID) &&
    (process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET),
);
const githubCredentialsConfigured = Boolean(
  (process.env.AUTH_GITHUB_ID || process.env.GITHUB_ID) &&
    (process.env.AUTH_GITHUB_SECRET || process.env.GITHUB_SECRET),
);

// Must not live under /api/auth/providers: next-auth/react's signIn() reads that
// path expecting Auth.js's own provider map.
export function GET() {
  return NextResponse.json({
    providers: {
      google: Boolean(authSecret && googleCredentialsConfigured),
      github: Boolean(authSecret && githubCredentialsConfigured),
    },
    secretConfigured: Boolean(authSecret),
  });
}
