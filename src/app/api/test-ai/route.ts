import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    
    // Test Hugging Face API with the bart-large-mnli model
    const response = await fetch(
      "https://api-inference.huggingface.co/models/navteca/bart-large-mnli",
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          inputs: text || "This video contains explicit content and may not be suitable for all advertisers.",
          parameters: {
            candidate_labels: [
              "demonetization risk",
              "copyright violation", 
              "community guidelines violation",
              "advertiser-friendly content",
              "age-restricted content",
              "spam or misleading content"
            ]
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ 
        error: 'Hugging Face API error', 
        status: response.status,
        details: errorText,
        api_key_present: !!process.env.HUGGINGFACE_API_KEY
      });
    }

    const result = await response.json();
    
    return NextResponse.json({
      message: 'AI test successful',
      api_key_present: !!process.env.HUGGINGFACE_API_KEY,
      model: 'navteca/bart-large-mnli',
      result: result,
      test_text: text || "This video contains explicit content and may not be suitable for all advertisers."
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'AI test failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      api_key_present: !!process.env.HUGGINGFACE_API_KEY
    });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'AI test endpoint ready',
    api_key_present: !!process.env.HUGGINGFACE_API_KEY,
    model: 'navteca/bart-large-mnli',
    usage: 'Send POST request with { "text": "your policy text here" }'
  });
} 