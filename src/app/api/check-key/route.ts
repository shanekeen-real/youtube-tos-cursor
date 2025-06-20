import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  return NextResponse.json({
    api_key_present: !!apiKey,
    api_key_length: apiKey ? apiKey.length : 0,
    api_key_starts_with_hf: apiKey ? apiKey.startsWith('hf_') : false,
    api_key_preview: apiKey ? `${apiKey.substring(0, 10)}...` : 'Not found',
    environment_check: {
      NODE_ENV: process.env.NODE_ENV,
      has_env_file: 'Check manually in .env.local'
    }
  });
} 