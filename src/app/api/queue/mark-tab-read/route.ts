import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp, QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';
import { CacheManager } from '@/lib/cache';
import * as Sentry from "@sentry/nextjs";

export async function POST(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/queue/mark-tab-read",
    },
    async () => {
      try {
        const session = await auth();
        const userId = session?.user?.id;
        
        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tabName } = await req.json();
        
        if (!tabName || !['completed', 'failed', 'pending', 'processing'].includes(tabName)) {
          return NextResponse.json({ error: 'Invalid tab name' }, { status: 400 });
        }

        // Update all user's scans to mark this tab as read
        const batch = adminDb.batch();
        const userScansQuery = adminDb.collection('scan_queue')
          .where('userId', '==', userId);
        
        const userScansSnapshot = await userScansQuery.get();
        
        userScansSnapshot.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          const data = doc.data();
          const tabReadAt = data.tabReadAt || {};
          tabReadAt[tabName] = Timestamp.now();
          
          batch.update(doc.ref, {
            tabReadAt
          });
        });

        await batch.commit();

        // Invalidate cache for this user
        const cache = CacheManager.getInstance();
        await cache.invalidate(`user_scans:${userId}`);
        await cache.invalidate(`notifications:${userId}`);

        return NextResponse.json({
          success: true,
          message: `Marked ${tabName} tab as read`
        });

      } catch (error: unknown) {
        console.error('Error marking tab as read:', error);
        Sentry.captureException(error, {
          tags: { component: 'queue', action: 'mark-tab-read' }
        });

        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ 
          error: 'Failed to mark tab as read', 
          details: errorMessage 
        }, { status: 500 });
      }
    }
  );
}
