import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { adminDb } from "./firebase-admin"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/youtube.readonly"
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
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token and user id from a provider.
      session.accessToken = token.accessToken as string | undefined
      session.user.id = token.sub || ''
      return session
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Store user profile in Firestore
          const userId = typeof user.id === 'string' ? user.id : '';
          const userRef = adminDb.collection('users').doc(userId);
          await userRef.set({
            email: user.email,
            displayName: user.name,
            photoURL: user.image,
            createdAt: new Date().toISOString(),
            scanCount: 0,
            scanLimit: 3,
            subscriptionTier: 'free',
            lastSignIn: new Date().toISOString(),
          }, { merge: true })
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