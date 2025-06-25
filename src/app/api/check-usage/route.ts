import { NextRequest, NextResponse } from 'next/server';
import { usageTracker } from '@/lib/usage-tracker';

export async function GET(req: NextRequest) {
  try {
    const usage = usageTracker.getUsageSummary();
    
    return NextResponse.json({
      status: 'success',
      usage: usage,
      limits: {
        gemini: {
          daily_limit: 50,
          rate_limit: '15 requests per minute',
          reset_time: 'Midnight UTC daily'
        },
        claude: {
          daily_limit: '5M tokens per month',
          rate_limit: '100 requests per minute',
          reset_time: 'Monthly'
        }
      },
      current_time: new Date().toISOString(),
      next_reset: {
        gemini: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z', // Next midnight UTC
        note: 'Gemini quota resets daily at midnight UTC'
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get usage statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 