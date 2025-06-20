import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'API key not found',
        solution: 'Add HUGGINGFACE_API_KEY to your .env.local file'
      });
    }

    // Test with a very basic, widely available model
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/distilbert-base-uncased",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          inputs: "Hello world"
        }),
      }
    );

    console.log('Simple model test - Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Simple model test - Error:', errorText);
      return NextResponse.json({ 
        error: 'Simple model test failed',
        status: response.status,
        statusText: response.statusText,
        details: errorText,
        api_key_format: apiKey.startsWith('hf_') ? 'Correct' : 'Incorrect (should start with hf_)'
      });
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Simple model test successful',
      model: 'distilbert-base-uncased',
      result: result
    });

  } catch (error) {
    console.error('Simple model test - Exception:', error);
    return NextResponse.json({ 
      error: 'Simple model test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 