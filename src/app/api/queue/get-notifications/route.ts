import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';
import { withCache, cacheKeys, CacheManager } from '@/lib/cache';
import * as Sentry from "@sentry/nextjs";

export async function GET(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "GET /api/queue/get-notifications",
    },
    async () => {
      let session = null;
      try {
        session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const unreadOnly = searchParams.get('unreadOnly') === 'true';
        const limit = parseInt(searchParams.get('limit') || '10');

        // Use cache with 30-second TTL
        const cacheKey = cacheKeys.notifications(userId, unreadOnly, limit);
        
        const result = await withCache(cacheKey, 30, async () => {
          // Build query
          let query = adminDb.collection('scan_notifications')
            .where('userId', '==', userId);

          if (unreadOnly) {
            query = query.where('read', '==', false);
          }

          // Get notifications with server-side sorting
          let notificationsSnapshot;
          try {
            notificationsSnapshot = await query
              .orderBy('createdAt', 'desc') // Server-side sorting
              .limit(limit) // Server-side limiting
              .get();
          } catch (firebaseError: any) {
            // Handle Firebase quota exceeded errors gracefully
            if (firebaseError.code === 8 || firebaseError.message?.includes('RESOURCE_EXHAUSTED')) {
              console.warn('Firebase quota exceeded for notifications, returning empty results');
              return {
                success: true,
                notifications: [],
                unreadCount: 0,
                total: 0
              };
            }
            throw firebaseError; // Re-throw other errors
          }
          
          // Use server-sorted notifications directly
          const limitedDocs = notificationsSnapshot.docs;
          
          const notifications = limitedDocs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
            id: doc.id,
            ...doc.data()
          }));

          return {
            success: true,
            notifications,
            totalCount: notifications.length,
            unreadCount: notifications.filter((n: { read: boolean }) => !n.read).length
          };
        });

        return NextResponse.json(result);

      } catch (error: unknown) {
        console.error('Error fetching notifications:', error);
        Sentry.captureException(error, {
          tags: { component: 'queue', action: 'get-notifications' }
        });

        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ 
          error: 'Failed to fetch notifications', 
          details: errorMessage 
        }, { status: 500 });
      }
    }
  );
}

export async function PUT(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "PUT /api/queue/get-notifications",
    },
    async () => {
      let session = null;
      try {
        session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { notificationIds } = await req.json();

        if (!notificationIds || !Array.isArray(notificationIds)) {
          return NextResponse.json({ error: 'Notification IDs array is required' }, { status: 400 });
        }

        // Mark notifications as read
        const batch = adminDb.batch();
        
        for (const notificationId of notificationIds) {
          const notificationRef = adminDb.collection('scan_notifications').doc(notificationId);
          batch.update(notificationRef, { read: true });
        }

        await batch.commit();

        return NextResponse.json({
          success: true,
          message: `Marked ${notificationIds.length} notifications as read`
        });

      } catch (error: unknown) {
        console.error('Error marking notifications as read:', error);
        Sentry.captureException(error, {
          tags: { component: 'queue', action: 'mark-notifications-read' }
        });

        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ 
          error: 'Failed to mark notifications as read', 
          details: errorMessage 
        }, { status: 500 });
      }
    }
  );
} 