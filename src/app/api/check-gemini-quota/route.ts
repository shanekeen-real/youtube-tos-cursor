import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

// Branded types for better type safety
type GoogleApiKey = string & { readonly brand: unique symbol };
type ModelName = string & { readonly brand: unique symbol };

// Zod schemas for Gemini API responses and errors
const GeminiQuotaDetailsSchema = z.object({
  daily_limit: z.number().optional(),
  rate_limit: z.string().optional(),
  reset_time: z.string().optional(),
  retry_delay: z.string().nullable().optional(),
});

const GeminiQuotaErrorSchema = z.object({
  message: z.string().optional(),
  status: z.string().optional(),
  quotaValue: z.string().optional(),
  retryDelay: z.string().optional(),
});

const GeminiSuccessResponseSchema = z.object({
  status: z.literal('working'),
  message: z.string(),
  model: z.string(),
  response_length: z.number(),
  quota_info: GeminiQuotaDetailsSchema,
});

const GeminiQuotaExceededResponseSchema = z.object({
  status: z.literal('quota_exceeded'),
  error: z.string(),
  message: z.string(),
  suggestion: z.string(),
  quota_details: GeminiQuotaDetailsSchema,
  tracking_tips: z.array(z.string()),
});

const GeminiErrorResponseSchema = z.object({
  status: z.literal('error'),
  error: z.string(),
  message: z.string(),
});

const GeminiNoKeyResponseSchema = z.object({
  error: z.string(),
  status: z.literal('no_key'),
});

const GeminiFailureResponseSchema = z.object({
  error: z.string(),
  details: z.string(),
});

// Type definitions using Zod inferred types
type GeminiQuotaDetails = z.infer<typeof GeminiQuotaDetailsSchema>;
type GeminiQuotaError = z.infer<typeof GeminiQuotaErrorSchema>;
type GeminiSuccessResponse = z.infer<typeof GeminiSuccessResponseSchema>;
type GeminiQuotaExceededResponse = z.infer<typeof GeminiQuotaExceededResponseSchema>;
type GeminiErrorResponse = z.infer<typeof GeminiErrorResponseSchema>;
type GeminiNoKeyResponse = z.infer<typeof GeminiNoKeyResponseSchema>;
type GeminiFailureResponse = z.infer<typeof GeminiFailureResponseSchema>;

// Union type for all possible responses
type GeminiQuotaResponse = 
  | GeminiSuccessResponse 
  | GeminiQuotaExceededResponse 
  | GeminiErrorResponse 
  | GeminiNoKeyResponse 
  | GeminiFailureResponse;

// Type guards for runtime validation
function isValidGeminiQuotaError(error: unknown): error is GeminiQuotaError {
  return GeminiQuotaErrorSchema.safeParse(error).success;
}

function isQuotaExceededError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('429');
  }
  return false;
}

// Helper function to extract quota details from error message
function extractQuotaDetails(errorMessage: string): GeminiQuotaDetails {
  const defaultQuotaDetails: GeminiQuotaDetails = {
    daily_limit: 50,
    rate_limit: '15 requests per minute',
    reset_time: 'Midnight UTC daily',
    retry_delay: null,
  };

  try {
    // Parse the error message to extract retry delay
    const retryMatch = errorMessage.match(/"retryDelay":"([^"]+)"/);
    if (retryMatch) {
      defaultQuotaDetails.retry_delay = retryMatch[1];
    }

    // Extract quota value from the error
    const quotaMatch = errorMessage.match(/"quotaValue":"([^"]+)"/);
    if (quotaMatch) {
      defaultQuotaDetails.daily_limit = parseInt(quotaMatch[1]);
    }
  } catch (parseError) {
    console.log('Could not parse quota details from error message');
  }

  return defaultQuotaDetails;
}

export async function GET(req: NextRequest): Promise<NextResponse<GeminiQuotaResponse>> {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      const response: GeminiNoKeyResponse = {
        error: 'No Google API key found',
        status: 'no_key'
      };
      return NextResponse.json(response);
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    
    // Try a simple test request to see if we get quota info
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent('Hello');
      const response = await result.response;
      
      const successResponse: GeminiSuccessResponse = {
        status: 'working',
        message: 'Gemini API is working',
        model: 'gemini-2.0-flash',
        response_length: response.text().length,
        quota_info: {
          daily_limit: 50,
          rate_limit: '15 requests per minute',
          reset_time: 'Midnight UTC daily'
        }
      };
      
      return NextResponse.json(successResponse);
      
    } catch (error: unknown) {
      // Check if it's a quota error
      if (isQuotaExceededError(error)) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown quota error';
        const quotaDetails = extractQuotaDetails(errorMessage);

        const quotaExceededResponse: GeminiQuotaExceededResponse = {
          status: 'quota_exceeded',
          error: 'Daily quota exceeded',
          message: errorMessage,
          suggestion: 'Quota typically resets daily at midnight UTC',
          quota_details: quotaDetails,
          tracking_tips: [
            'Monitor your usage manually by counting API calls',
            'Set up alerts when approaching 40+ requests per day',
            'Consider using Claude 3 Haiku for higher limits (100/min, 5M tokens/month)',
            'Check Google Cloud Console for detailed usage metrics'
          ]
        };

        return NextResponse.json(quotaExceededResponse);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorResponse: GeminiErrorResponse = {
        status: 'error',
        error: errorMessage,
        message: 'Gemini API error occurred'
      };

      return NextResponse.json(errorResponse);
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const failureResponse: GeminiFailureResponse = {
      error: 'Failed to check Gemini quota',
      details: errorMessage
    };

    return NextResponse.json(failureResponse);
  }
} 