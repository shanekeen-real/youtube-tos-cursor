import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    
    console.log('Debug: Starting analysis for text:', text.substring(0, 100) + '...');
    
    // Test Hugging Face API directly
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli",
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          inputs: text,
          parameters: {
            candidate_labels: [
              'demonetization risk',
              'copyright violation',
              'community guidelines violation',
              'advertiser-friendly content',
              'age-restricted content',
              'spam or misleading content'
            ]
          }
        }),
      }
    );

    console.log('Debug: Hugging Face response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Debug: Hugging Face error:', errorText);
      return NextResponse.json({ 
        error: 'Hugging Face API error', 
        status: response.status,
        details: errorText
      });
    }

    const result = await response.json();
    console.log('Debug: Hugging Face result:', result);
    
    return NextResponse.json({
      success: true,
      result: result
    });

  } catch (error) {
    console.error('Debug: Exception caught:', error);
    return NextResponse.json({ 
      error: 'Debug test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 