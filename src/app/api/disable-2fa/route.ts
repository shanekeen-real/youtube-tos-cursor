import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import speakeasy from 'speakeasy';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { token } = await req.json();
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const userId = session.user.id;

    // Get user's 2FA secret
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const twoFactorSecret = userData?.twoFactorSecret;
    const twoFactorEnabled = userData?.twoFactorEnabled;

    if (!twoFactorSecret || !twoFactorEnabled) {
      return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 });
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps in either direction for clock skew
    });

    if (!verified) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Disable 2FA and remove the secret
    await userRef.update({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorSetupAt: null,
      twoFactorEnabledAt: null,
      twoFactorDisabledAt: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true,
      message: '2FA has been disabled successfully'
    });

  } catch (error) {
    console.error('Error disabling 2FA:', error);
    return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 });
  }
} 