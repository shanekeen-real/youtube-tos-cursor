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

    // Test with a simpler model first
    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/bart-large-mnli",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          inputs: "This video contains explicit content.",
          parameters: {
            candidate_labels: ["safe", "unsafe"]
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ 
        error: 'API request failed',
        status: response.status,
        statusText: response.statusText,
        details: errorText,
        api_key_format: apiKey.startsWith('hf_') ? 'Correct' : 'Incorrect (should start with hf_)'
      });
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Simple AI test successful',
      result: result
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 