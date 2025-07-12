import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const userId = session.user.id;

    // Clear the 2FA verification timestamp
    const userRef = adminDb.collection('users').doc(userId);
    await userRef.update({
      twoFactorVerifiedAt: null
    });

    return NextResponse.json({ 
      success: true,
      message: '2FA verification cleared'
    });

  } catch (error) {
    console.error('Error clearing 2FA verification:', error);
    return NextResponse.json({ error: 'Failed to clear 2FA verification' }, { status: 500 });
  }
} 