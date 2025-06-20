import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' });
    }

    // Use the EXACT same pattern that worked before
    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/bart-large-mnli",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          inputs: "This video contains explicit content and may not be suitable for all advertisers.",
          parameters: {
            candidate_labels: ["violence", "inappropriate content", "safe content"]
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ 
        error: 'API failed',
        status: response.status,
        details: errorText
      });
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      result: result
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 