import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get a sample of cached analyses for this user
    const cacheRef = adminDb.collection('analysis_cache');
    const userAnalyses = await cacheRef
      .where('userId', '==', userId)
      .limit(5)
      .get();

    const videoScans = new Map<string, any[]>();
    
    userAnalyses.docs.forEach(doc => {
      const data = doc.data();
      const videoId = data.video_id;
      
      if (videoId) {
        if (!videoScans.has(videoId)) {
          videoScans.set(videoId, []);
        }
        
        videoScans.get(videoId)!.push({
          scanId: doc.id,
          riskLevel: data.analysisResult?.riskLevel || data.analysisResult?.risk_level,
          riskScore: data.analysisResult?.riskScore || data.analysisResult?.risk_score,
          timestamp: data.timestamp?.toDate(),
          url: data.original_url
        });
      }
    });

    // Convert to array and find videos with multiple scans
    const videosWithMultipleScans = Array.from(videoScans.entries())
      .filter(([videoId, scans]) => scans.length > 1)
      .map(([videoId, scans]) => ({
        videoId,
        scanCount: scans.length,
        scans: scans.sort((a, b) => {
          if (!a.timestamp || !b.timestamp) return 0;
          return b.timestamp.getTime() - a.timestamp.getTime();
        })
      }));

    return NextResponse.json({ 
      message: 'Video scans test endpoint',
      userId,
      totalVideos: videoScans.size,
      videosWithMultipleScans: videosWithMultipleScans.slice(0, 3) // Return first 3 examples
    });

  } catch (error: any) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      details: error.message 
    }, { status: 500 });
  }
} 