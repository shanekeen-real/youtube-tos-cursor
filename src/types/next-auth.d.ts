import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    twoFactorEnabled?: boolean
    twoFactorVerified?: boolean
    idToken?: string
    user: {
      id: string
      firebaseUid?: string
      email?: string | null
      name?: string | null
      image?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    userId?: string
    idToken?: string
  }
} 