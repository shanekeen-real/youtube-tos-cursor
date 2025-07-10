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

    // Get a sample of cached analyses for this user (without orderBy to avoid index requirement)
    const cacheRef = adminDb.collection('analysis_cache');
    const userAnalyses = await cacheRef
      .where('userId', '==', userId)
      .limit(10)
      .get();

    const analyses = userAnalyses.docs.map((doc: any) => {
      const data = doc.data();
      return {
        videoId: data.video_id,
        riskLevel: data.analysisResult?.riskLevel || data.analysisResult?.risk_level,
        riskScore: data.analysisResult?.riskScore || data.analysisResult?.risk_score,
        timestamp: data.timestamp?.toDate(),
        url: data.original_url
      };
    });

    // Sort by timestamp in memory
    analyses.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    return NextResponse.json({ 
      message: 'Risk levels test endpoint',
      userId,
      analysesCount: analyses.length,
      analyses: analyses.slice(0, 5) // Return only the 5 most recent
    });

  } catch (error: any) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      details: error.message 
    }, { status: 500 });
  }
} 