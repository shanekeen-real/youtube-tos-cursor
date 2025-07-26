import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';
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

        // Build query
        let query = adminDb.collection('scan_notifications')
          .where('userId', '==', userId);

        if (unreadOnly) {
          query = query.where('read', '==', false);
        }

        // Get notifications - sort by createdAt descending
        const notificationsSnapshot = await query.get();
        
        // Sort in memory by createdAt descending
        const sortedDocs = notificationsSnapshot.docs.sort((a: QueryDocumentSnapshot<DocumentData>, b: QueryDocumentSnapshot<DocumentData>) => {
          const aData = a.data();
          const bData = b.data();
          const aTime = aData.createdAt?.toMillis?.() || 0;
          const bTime = bData.createdAt?.toMillis?.() || 0;
          return bTime - aTime; // Descending order (newest first)
        });
        
        // Apply limit
        const limitedDocs = sortedDocs.slice(0, limit);
        
        const notifications = limitedDocs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          ...doc.data()
        }));

        return NextResponse.json({
          success: true,
          notifications,
          totalCount: notifications.length,
          unreadCount: notifications.filter(n => !n.read).length
        });

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