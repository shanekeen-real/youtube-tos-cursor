import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import speakeasy from 'speakeasy';

export async function POST(req: NextRequest) {
  try {
    const { userId, token } = await req.json();
    
    if (!userId || !token) {
      return NextResponse.json({ error: 'User ID and token are required' }, { status: 400 });
    }

    // Get user's 2FA secret
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const twoFactorSecret = userData?.twoFactorSecret;
    const twoFactorEnabled = userData?.twoFactorEnabled;

    if (!twoFactorEnabled) {
      return NextResponse.json({ error: '2FA is not enabled for this user' }, { status: 400 });
    }

    if (!twoFactorSecret) {
      return NextResponse.json({ error: '2FA secret not found' }, { status: 400 });
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps in either direction for clock skew
    });

    if (!verified) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    // Update last 2FA verification time and mark as verified for this session
    await userRef.update({
      lastTwoFactorVerification: new Date().toISOString(),
      twoFactorVerifiedAt: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true,
      message: '2FA verification successful'
    });

  } catch (error) {
    console.error('Error verifying 2FA for login:', error);
    return NextResponse.json({ error: 'Failed to verify 2FA' }, { status: 500 });
  }
} 