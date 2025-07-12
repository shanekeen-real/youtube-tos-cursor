import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    // Generate a new TOTP secret
    const secret = speakeasy.generateSecret({
      name: `Yellow Dollar (${userEmail})`,
      issuer: 'Yellow Dollar',
      length: 32
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Store the secret temporarily (not yet enabled)
    const userRef = adminDb.collection('users').doc(userId);
    await userRef.update({
      twoFactorSecret: secret.base32,
      twoFactorEnabled: false,
      twoFactorSetupAt: new Date().toISOString()
    });

    return NextResponse.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      otpauthUrl: secret.otpauth_url
    });

  } catch (error) {
    console.error('Error setting up 2FA:', error);
    return NextResponse.json({ error: 'Failed to setup 2FA' }, { status: 500 });
  }
} 