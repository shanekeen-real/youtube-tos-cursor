import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { ScanQueueItem } from '@/types/queue';
import { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';
import { withCache, cacheKeys, CacheManager } from '@/lib/cache';
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

        // Use cache with 60-second TTL
        const cacheKey = cacheKeys.userScans(userId, status || 'all', limit, offset);
        
        const result = await withCache(cacheKey, 60, async () => {
          // Build query with server-side sorting and pagination
          let query = adminDb.collection('scan_queue')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc'); // Server-side sorting

          // Apply status filter if specified
          if (status && status !== 'all' && status !== 'in-queue') {
            query = query.where('status', '==', status);
          }

          // Apply pagination
          query = query.limit(limit).offset(offset);

          // Get queue items with server-side sorting
          let queueSnapshot;
          try {
            queueSnapshot = await query.get();
          } catch (firebaseError: any) {
            if (firebaseError.code === 8 || firebaseError.message?.includes('RESOURCE_EXHAUSTED')) {
              console.warn('Firebase quota exceeded for user scans, returning empty results');
              return {
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
              };
            }
            throw firebaseError;
          }
          
          // Filter docs based on status
          let filteredDocs = queueSnapshot.docs;
          if (status === 'in-queue') {
            filteredDocs = queueSnapshot.docs.filter((doc: QueryDocumentSnapshot<DocumentData>) => {
              const data = doc.data();
              return data.status === 'pending' || data.status === 'processing';
            });
          } else if (status === 'completed') {
            filteredDocs = queueSnapshot.docs.filter((doc: QueryDocumentSnapshot<DocumentData>) => {
              const data = doc.data();
              return data.status === 'completed';
            });
          } else if (status === 'failed') {
            filteredDocs = queueSnapshot.docs.filter((doc: QueryDocumentSnapshot<DocumentData>) => {
              const data = doc.data();
              return data.status === 'failed';
            });
          }

          // Convert to queue items
          const queueItems = filteredDocs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
            id: doc.id,
            ...doc.data()
          })) as ScanQueueItem[];

          // Calculate stats and unread counts
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
              const allUserScansQuery = adminDb.collection('scan_queue')
                .where('userId', '==', userId);
              
              const allUserScansSnapshot = await allUserScansQuery.get();
              
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
                    if (!data.tabReadAt?.completed) {
                      unreadCounts.completed++;
                    }
                    break;
                  case 'failed':
                    stats.totalFailed++;
                    if (!data.tabReadAt?.failed) {
                      unreadCounts.failed++;
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

          return {
            success: true,
            queueItems,
            stats,
            unreadCounts,
            total: queueItems.length,
            hasMore: queueItems.length === limit
          };
        });

        return NextResponse.json(result);

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