import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user's 2FA status
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const twoFactorEnabled = userData?.twoFactorEnabled || false;

    return NextResponse.json({
      twoFactorEnabled,
      email: userData?.email
    });

  } catch (error) {
    console.error('Error checking 2FA status:', error);
    return NextResponse.json({ error: 'Failed to check 2FA status' }, { status: 500 });
  }
} 