import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  // Mock response for Free Scan
  return NextResponse.json({
    risk_score: 73,
    flagged_section: 'Section 4.3 - High demonetization risk detected',
    highlights: [
      { section: 'Section 4.3', risk: 'high', text: 'High demonetization risk detected.' },
    ],
    mode: 'free',
  });
} 