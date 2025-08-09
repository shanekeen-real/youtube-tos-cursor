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
        const skipStats = searchParams.get('skipStats') === 'true';

        // Build query with server-side sorting and pagination
        let query = adminDb.collection('scan_queue')
          .where('userId', '==', userId)
          .orderBy('createdAt', 'desc'); // Server-side sorting

        // Apply status filter if specified
        if (status && status !== 'all' && status !== 'in-queue') {
          // For specific statuses like 'pending', 'processing', 'completed', etc.
          query = query.where('status', '==', status);
        }
        // Note: 'in-queue' is a logical grouping that includes multiple statuses,
        // so we don't apply a Firestore filter for it - we'll filter client-side

        // Apply pagination
        query = query.limit(limit).offset(offset);

        // Get queue items with server-side sorting
        let queueSnapshot;
        try {
          queueSnapshot = await query.get();
        } catch (firebaseError: any) {
          // Handle Firebase quota exceeded errors gracefully
          if (firebaseError.code === 8 || firebaseError.message?.includes('RESOURCE_EXHAUSTED')) {
            console.warn('Firebase quota exceeded for user scans, returning empty results');
            return NextResponse.json({
              success: true,
              queueItems: [],
              stats: {
                totalPending: 0,
                totalProcessing: 0,
                totalCompleted: 0,
                totalFailed: 0,
                totalCancelled: 0
              },
              total: 0,
              hasMore: false
            });
          }
          throw firebaseError; // Re-throw other errors
        }
        
        // Debug logging
        console.log('API Debug - Status:', status, 'Total docs:', queueSnapshot.docs.length);
        console.log('API Debug - Sample doc statuses:', queueSnapshot.docs.slice(0, 3).map((doc: QueryDocumentSnapshot<DocumentData>) => doc.data().status));
        
        // Use server-sorted docs directly
        let filteredDocs = queueSnapshot.docs;
        if (status === 'in-queue') {
          // For "In Queue" tab: only show active scans (exclude completed, cancelled, failed)
          filteredDocs = queueSnapshot.docs.filter((doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data();
            // Only show pending and processing scans in "In Queue" tab
            return data.status === 'pending' || data.status === 'processing';
          });
        } else if (status === 'all') {
          // For "all" status: show all scans (no filtering)
          filteredDocs = queueSnapshot.docs;
        } else if (status === 'completed') {
          // For "Completed" tab: show ALL completed scans regardless of archived status
          console.log('API Debug - Filtering for completed scans');
          filteredDocs = queueSnapshot.docs.filter((doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data();
            return data.status === 'completed';
          });
          console.log('API Debug - Completed scans found:', filteredDocs.length);
        } else if (status === 'cancelled') {
          // For "Cancelled" tab: show ALL cancelled scans regardless of archived status
          filteredDocs = queueSnapshot.docs.filter((doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data();
            return data.status === 'cancelled';
          });
        } else if (status === 'failed') {
          // For "Failed" tab: show ALL failed scans regardless of archived status
          filteredDocs = queueSnapshot.docs.filter((doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data();
            return data.status === 'failed';
          });
        } else if (status === 'pending') {
          // For "Pending" tab: show only pending scans
          filteredDocs = queueSnapshot.docs.filter((doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data();
            return data.status === 'pending';
          });
        } else if (status === 'processing') {
          // For "Processing" tab: show only processing scans
          filteredDocs = queueSnapshot.docs.filter((doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data();
            return data.status === 'processing';
          });
        }
        
        // Apply pagination in memory
        const paginatedDocs = filteredDocs.slice(offset, offset + limit);
        
        const queueItems: ScanQueueItem[] = paginatedDocs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          ...doc.data()
        } as ScanQueueItem));

        // Calculate stats and unread counts - need to fetch ALL user scans for accurate stats, not just paginated results
        const { stats, unreadCounts } = skipStats ? {
          stats: {
            totalPending: 0,
            totalProcessing: 0,
            totalCompleted: 0,
            totalFailed: 0,
            totalCancelled: 0
          },
          unreadCounts: {
            completed: 0,
            failed: 0,
            pending: 0,
            processing: 0
          }
        } : await (async () => {
          const stats = {
            totalPending: 0,
            totalProcessing: 0,
            totalCompleted: 0,
            totalFailed: 0,
            totalCancelled: 0
          };

          const unreadCounts = {
            completed: 0,
            failed: 0,
            pending: 0,
            processing: 0
          };

          try {
            // Fetch ALL user scans for accurate stats calculation (no pagination)
            const allUserScansQuery = adminDb.collection('scan_queue')
              .where('userId', '==', userId);
            
            const allUserScansSnapshot = await allUserScansQuery.get();
            
            // Calculate stats and unread counts from ALL user scans
            allUserScansSnapshot.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
              const data = doc.data();
              
              switch (data.status) {
                case 'pending':
                  stats.totalPending++;
                  break;
                case 'processing':
                  stats.totalProcessing++;
                  break;
                case 'completed':
                  stats.totalCompleted++;
                  // Check if this completed scan is unread
                  if (!data.tabReadAt?.completed) {
                    unreadCounts.completed++;
                    console.log('Debug: Found unread completed scan:', doc.id, 'tabReadAt:', data.tabReadAt);
                  }
                  break;
                case 'failed':
                  stats.totalFailed++;
                  // Check if this failed scan is unread
                  if (!data.tabReadAt?.failed) {
                    unreadCounts.failed++;
                    console.log('Debug: Found unread failed scan:', doc.id, 'tabReadAt:', data.tabReadAt);
                  }
                  break;
                case 'cancelled':
                  stats.totalCancelled++;
                  break;
              }
            });
          } catch (statsError) {
            console.warn('Failed to calculate stats, using zeros:', statsError);
          }
          
          return { stats, unreadCounts };
        })();

        console.log('Debug: Final unread counts:', unreadCounts);
        return NextResponse.json({
          success: true,
          queueItems,
          stats,
          unreadCounts,
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