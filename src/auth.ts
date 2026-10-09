import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import {
  accounts,
  authSessions,
  users,
  verificationTokens,
} from "@/db/schema";

const googleClientId =
  process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID;
const googleClientSecret =
  process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET;
const githubClientId =
  process.env.AUTH_GITHUB_ID || process.env.GITHUB_ID;
const githubClientSecret =
  process.env.AUTH_GITHUB_SECRET || process.env.GITHUB_SECRET;
const localDevelopmentSecret =
  process.env.NODE_ENV === "development"
    ? "flick-swipe-local-development-secret-change-before-deploying"
    : undefined;

export const authSecret =
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || localDevelopmentSecret;

if (localDevelopmentSecret && !process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  console.warn(
    "Auth.js is using its local-only development secret. Configure AUTH_SECRET before deploying.",
  );
}

const providers = [];
if (googleClientId && googleClientSecret) {
  providers.push(
    Google({ clientId: googleClientId, clientSecret: googleClientSecret }),
  );
}
if (githubClientId && githubClientSecret) {
  providers.push(
    GitHub({ clientId: githubClientId, clientSecret: githubClientSecret }),
  );
}
export const oauthProvidersConfigured = providers.length > 0;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: authSessions,
    verificationTokensTable: verificationTokens,
  }),
  providers,
  secret: authSecret,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
