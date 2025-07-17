import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(req: NextRequest) {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({
        error: 'No Google API key found',
        status: 'no_key'
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    
    // Try a simple test request to see if we get quota info
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent('Hello');
      const response = await result.response;
      
      return NextResponse.json({
        status: 'working',
        message: 'Gemini API is working',
        model: 'gemini-2.0-flash',
        response_length: response.text().length,
        quota_info: {
          daily_limit: 50,
          rate_limit: '15 requests per minute',
          reset_time: 'Midnight UTC daily'
        }
      });
      
    } catch (error: any) {
      // Check if it's a quota error
      if (error.message && error.message.includes('429')) {
        // Extract quota details from the error message
        let quotaDetails = {
          daily_limit: 50,
          rate_limit: '15 requests per minute',
          reset_time: 'Midnight UTC daily',
          retry_delay: null
        };

        try {
          // Parse the error message to extract retry delay
          const retryMatch = error.message.match(/"retryDelay":"([^"]+)"/);
          if (retryMatch) {
            quotaDetails.retry_delay = retryMatch[1];
          }

          // Extract quota value from the error
          const quotaMatch = error.message.match(/"quotaValue":"([^"]+)"/);
          if (quotaMatch) {
            quotaDetails.daily_limit = parseInt(quotaMatch[1]);
          }
        } catch (parseError) {
          console.log('Could not parse quota details from error message');
        }

        return NextResponse.json({
          status: 'quota_exceeded',
          error: 'Daily quota exceeded',
          message: error.message,
          suggestion: 'Quota typically resets daily at midnight UTC',
          quota_details: quotaDetails,
          tracking_tips: [
            'Monitor your usage manually by counting API calls',
            'Set up alerts when approaching 40+ requests per day',
            'Consider using Claude 3 Haiku for higher limits (100/min, 5M tokens/month)',
            'Check Google Cloud Console for detailed usage metrics'
          ]
        });
      }
      
      return NextResponse.json({
        status: 'error',
        error: error.message || 'Unknown error',
        message: 'Gemini API error occurred'
      });
    }

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check Gemini quota',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 