import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { getAuth as getAdminAuth } from "firebase-admin/auth";

// Conditional import for server-side only
let adminDb: any = null;
if (typeof window === 'undefined') {
  try {
    const { adminDb: db } = require("./firebase-admin");
    adminDb = db;
  } catch (error) {
    console.error("Failed to import adminDb:", error);
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/youtube.readonly",
          access_type: "offline",
          prompt: "consent"
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token and or the user id to the token right after signin
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        // Use Google account ID for consistent user identification
        token.userId = account.providerAccountId
        token.idToken = account.id_token
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined
      session.refreshToken = token.refreshToken as string | undefined
      session.expiresAt = token.expiresAt as number | undefined
      session.idToken = token.idToken as string | undefined
      // Always set session.user.id to the Google Account ID (string)
      session.user.id = String(token.userId || '');
      // Add googleAccountId to session for clarity
      session.user.googleAccountId = String(token.userId || '');
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && account.providerAccountId) {
        try {
          const googleAccountId = account.providerAccountId;
          const userRef = adminDb.collection('users').doc(googleAccountId);
          const userDoc = await userRef.get();
          const now = new Date().toISOString();
          if (!userDoc.exists) {
            await userRef.set({
              email: user.email,
              displayName: user.name,
              photoURL: user.image,
              createdAt: now,
              scanCount: 0,
              scanLimit: 3,
              subscriptionTier: 'free',
              lastSignIn: now,
              googleAccountId,
            });
          } else {
            await userRef.set({
              email: user.email,
              displayName: user.name,
              photoURL: user.image,
              lastSignIn: now,
              googleAccountId,
            }, { merge: true });
          }
        } catch (error) {
          console.error('Error storing user profile (Google Account ID):', error)
          return false;
        }
      }
      return true;
    }
  },
  pages: {
    signIn: "/auth/signin",
  }
})

/**
 * Refreshes a Google OAuth access token using the refresh token.
 * Returns { access_token, expires_in, refresh_token, scope, token_type } or throws on error.
 */
export async function refreshGoogleAccessToken(refreshToken: string) {
  const params = new URLSearchParams();
  params.append('client_id', process.env.GOOGLE_CLIENT_ID!);
  params.append('client_secret', process.env.GOOGLE_CLIENT_SECRET!);
  params.append('refresh_token', refreshToken);
  params.append('grant_type', 'refresh_token');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh Google access token: ${response.statusText}`);
  }

  return response.json();
} 