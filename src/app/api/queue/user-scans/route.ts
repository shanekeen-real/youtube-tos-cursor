import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { ScanQueueItem } from '@/types/queue';
import { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';
import * as Sentry from "@sentry/nextjs";

export async function GET(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "GET /api/queue/user-scans",
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
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Build query - simplified to avoid index requirements
        let query = adminDb.collection('scan_queue')
          .where('userId', '==', userId);

        // Filter by status if provided
        if (status && status !== 'all' && status !== 'active') {
          query = query.where('status', '==', status);
        }

        // Get queue items - we'll sort in memory to avoid index requirements
        const queueSnapshot = await query.get();
        
        // Sort in memory by createdAt descending
        const sortedDocs = queueSnapshot.docs.sort((a: QueryDocumentSnapshot<DocumentData>, b: QueryDocumentSnapshot<DocumentData>) => {
          const aData = a.data();
          const bData = b.data();
          const aTime = aData.createdAt?.toMillis?.() || 0;
          const bTime = bData.createdAt?.toMillis?.() || 0;
          return bTime - aTime; // Descending order
        });
        
        // Filter out completed scans for 'active' status
        let filteredDocs = sortedDocs;
        if (status === 'active') {
          filteredDocs = sortedDocs.filter((doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data();
            return data.status !== 'completed';
          });
        }
        
        // Apply pagination in memory
        const paginatedDocs = filteredDocs.slice(offset, offset + limit);
        
        const queueItems: ScanQueueItem[] = paginatedDocs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          ...doc.data()
        } as ScanQueueItem));

        // Get queue stats
        const statsQuery = adminDb.collection('scan_queue').where('userId', '==', userId);
        const statsSnapshot = await statsQuery.get();
        
        const stats = {
          totalPending: 0,
          totalProcessing: 0,
          totalCompleted: 0,
          totalFailed: 0,
          totalCancelled: 0
        };

        statsSnapshot.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          const data = doc.data();
          // For 'active' status, exclude completed scans from stats
          if (status === 'active' && data.status === 'completed') {
            return;
          }
          
          switch (data.status) {
            case 'pending':
              stats.totalPending++;
              break;
            case 'processing':
              stats.totalProcessing++;
              break;
            case 'completed':
              stats.totalCompleted++;
              break;
            case 'failed':
              stats.totalFailed++;
              break;
            case 'cancelled':
              stats.totalCancelled++;
              break;
          }
        });

        return NextResponse.json({
          success: true,
          queueItems,
          stats,
          total: queueItems.length,
          hasMore: queueItems.length === limit
        });

      } catch (error: unknown) {
        console.error('Error fetching user scans:', error);
        Sentry.captureException(error, {
          tags: { component: 'queue', action: 'get-user-scans' },
          extra: { userId: session?.user?.id }
        });

        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ 
          error: 'Failed to fetch scan queue', 
          details: errorMessage 
        }, { status: 500 });
      }
    }
  );
} 