import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  return NextResponse.json({
    api_key_present: !!apiKey,
    api_key_length: apiKey ? apiKey.length : 0,
    api_key_starts_with_hf: apiKey ? apiKey.startsWith('hf_') : false,
    api_key_preview: apiKey ? `${apiKey.substring(0, 10)}...` : 'Not found',
    node_env: process.env.NODE_ENV,
    all_env_vars: {
      HUGGINGFACE_API_KEY: apiKey ? 'Present' : 'Missing',
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Present' : 'Missing',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'Present' : 'Missing'
    }
  });
} 