import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ScanQueueItem } from '@/types/queue';
import { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';
import * as Sentry from "@sentry/nextjs";

export async function POST(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/queue/process-background",
    },
    async () => {
      try {
        const { maxScans = 5 } = await req.json();
        
        console.log(`Starting background processing of up to ${maxScans} scans...`);
        
        let processedCount = 0;
        let hasMore = true;
        
        while (processedCount < maxScans && hasMore) {
          // Get the next pending scan
          const queueSnapshot = await adminDb.collection('scan_queue')
            .where('status', '==', 'pending')
            .limit(1)
            .get();
          
          if (queueSnapshot.empty) {
            console.log('No more pending scans to process');
            hasMore = false;
            break;
          }
          
          const queueDoc = queueSnapshot.docs[0];
          const queueItem = { id: queueDoc.id, ...queueDoc.data() } as ScanQueueItem;
          
          console.log(`Processing scan ${processedCount + 1}/${maxScans}: ${queueItem.id} for video ${queueItem.videoId}`);
          
          try {
            // Trigger processing of this specific scan
            const processResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/queue/process-next`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (processResponse.ok) {
              const processData = await processResponse.json();
              console.log(`Successfully processed scan: ${processData.message}`);
              processedCount++;
            } else {
              console.warn(`Failed to process scan ${queueItem.id}:`, await processResponse.text());
              // Continue with next scan even if this one failed
              processedCount++;
            }
            
            // Small delay between scans to prevent overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 1000));
            
          } catch (error) {
            console.error(`Error processing scan ${queueItem.id}:`, error);
            // Continue with next scan even if this one failed
            processedCount++;
          }
        }
        
        console.log(`Background processing completed. Processed ${processedCount} scans.`);
        
        return NextResponse.json({
          success: true,
          processedCount,
          hasMore,
          message: `Background processing completed. Processed ${processedCount} scans.`
        });
        
      } catch (error: unknown) {
        console.error('Error in background processing:', error);
        Sentry.captureException(error, {
          tags: { component: 'queue', action: 'process-background' }
        });

        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ 
          error: 'Failed to process background queue', 
          details: errorMessage 
        }, { status: 500 });
      }
    }
  );
}

export async function GET(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "GET /api/queue/process-background",
    },
    async () => {
      try {
        const { searchParams } = new URL(req.url);
        const maxScans = parseInt(searchParams.get('maxScans') || '5');
        
        console.log(`Starting background processing of up to ${maxScans} scans...`);
        
        let processedCount = 0;
        let hasMore = true;
        
        while (processedCount < maxScans && hasMore) {
          // Get the next pending scan
          const queueSnapshot = await adminDb.collection('scan_queue')
            .where('status', '==', 'pending')
            .limit(1)
            .get();
          
          if (queueSnapshot.empty) {
            console.log('No more pending scans to process');
            hasMore = false;
            break;
          }
          
          const queueDoc = queueSnapshot.docs[0];
          const queueItem = { id: queueDoc.id, ...queueDoc.data() } as ScanQueueItem;
          
          console.log(`Processing scan ${processedCount + 1}/${maxScans}: ${queueItem.id} for video ${queueItem.videoId}`);
          
          try {
            // Trigger processing of this specific scan
            const processResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/queue/process-next`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (processResponse.ok) {
              const processData = await processResponse.json();
              console.log(`Successfully processed scan: ${processData.message}`);
              processedCount++;
            } else {
              console.warn(`Failed to process scan ${queueItem.id}:`, await processResponse.text());
              // Continue with next scan even if this one failed
              processedCount++;
            }
            
            // Small delay between scans to prevent overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 1000));
            
          } catch (error) {
            console.error(`Error processing scan ${queueItem.id}:`, error);
            // Continue with next scan even if this one failed
            processedCount++;
          }
        }
        
        console.log(`Background processing completed. Processed ${processedCount} scans.`);
        
        return NextResponse.json({
          success: true,
          processedCount,
          hasMore,
          message: `Background processing completed. Processed ${processedCount} scans.`
        });
        
      } catch (error: unknown) {
        console.error('Error in background processing:', error);
        Sentry.captureException(error, {
          tags: { component: 'queue', action: 'process-background' }
        });

        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ 
          error: 'Failed to process background queue', 
          details: errorMessage 
        }, { status: 500 });
      }
    }
  );
} 