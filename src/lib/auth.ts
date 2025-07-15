import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

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
      // Send properties to the client, like an access_token and user id from a provider.
      session.accessToken = token.accessToken as string | undefined
      session.refreshToken = token.refreshToken as string | undefined
      session.expiresAt = token.expiresAt as number | undefined
      // Use the consistent user ID from the JWT token
      session.user.id = (token.userId as string) || token.sub || ''
      session.idToken = token.idToken as string | undefined

      // Add Firebase Auth UID from ID token (sub claim)
      if (session.idToken) {
        try {
          const payload = JSON.parse(Buffer.from(session.idToken.split('.')[1], 'base64').toString());
          session.user.firebaseUid = payload.sub;
        } catch (e) {
          console.error('Failed to decode Firebase UID from ID token:', e);
        }
      }

      // Check if user has 2FA enabled and add to session
      if (session.user.id && adminDb) {
        try {
          const userRef = adminDb.collection('users').doc(session.user.id);
          const userDoc = await userRef.get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            session.twoFactorEnabled = userData?.twoFactorEnabled || false;
            
            // Check if 2FA has been verified recently (within 24 hours)
            if (userData?.twoFactorVerifiedAt) {
              const verifiedAt = new Date(userData.twoFactorVerifiedAt);
              const now = new Date();
              const hoursSinceVerification = (now.getTime() - verifiedAt.getTime()) / (1000 * 60 * 60);
              session.twoFactorVerified = hoursSinceVerification < 24;
            } else {
              session.twoFactorVerified = false;
            }
          }
        } catch (error) {
          console.error('Error checking 2FA status in session:', error);
          session.twoFactorEnabled = false;
          session.twoFactorVerified = false;
        }
      }
      
      return session
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Store user profile in Firestore using the Google account ID for consistency
          const userId = account.providerAccountId || user.id || '';
          const userRef = adminDb.collection('users').doc(userId);
          const userDoc = await userRef.get();
          if (!userDoc.exists) {
            await userRef.set({
              email: user.email,
              displayName: user.name,
              photoURL: user.image,
              createdAt: new Date().toISOString(),
              scanCount: 0,
              scanLimit: 3,
              subscriptionTier: 'free',
              lastSignIn: new Date().toISOString(),
              googleAccountId: account.providerAccountId, // Store for reference
            });
          } else {
            // Only update non-usage fields if doc exists
            await userRef.set({
              email: user.email,
              displayName: user.name,
              photoURL: user.image,
              lastSignIn: new Date().toISOString(),
              googleAccountId: account.providerAccountId,
            }, { merge: true });
          }


        } catch (error) {
          console.error('Error storing user profile:', error)
        }
      }
      return true
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