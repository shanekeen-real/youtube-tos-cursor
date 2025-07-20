import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';

// Type definitions for Claude API responses
interface ClaudeContentBlock {
  type: string;
  text?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { channelData } = await req.json();
    if (!channelData || !channelData.title) {
      return NextResponse.json({ error: 'Missing channel data' }, { status: 400 });
    }

    // Compose a prompt for a concise channel summary
    const prompt = `
      You are an expert YouTube analyst. Given the following channel information, write a concise, insightful summary (2-3 sentences) that describes the channel's content, style, and audience. Highlight any unique aspects or strengths. Avoid generic statements. Do not mention that you are an AI or that this is an analysis.

      Channel Title: ${channelData.title}
      Description: ${channelData.description || ''}
      Subscribers: ${channelData.subscriberCount || channelData.statistics?.subscriberCount || 0}
      Videos: ${channelData.videoCount || channelData.statistics?.videoCount || 0}
      Views: ${channelData.viewCount || channelData.statistics?.viewCount || 0}
    `;

    // Try Gemini first
    try {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      const summary = result.response.text();
      return NextResponse.json({ summary });
    } catch (geminiError: unknown) {
      // If Gemini fails, try Claude
      const errorMessage = geminiError instanceof Error ? geminiError.message : 'Unknown Gemini error';
      console.error('Gemini failed, falling back to Claude:', errorMessage);
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY as string });
        const message = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 4000,
          temperature: 0.1,
          messages: [{ role: 'user', content: prompt }],
        });
        // Join all text blocks from the response
        const summary = message.content
          .filter((c: ClaudeContentBlock) => c.type === 'text' && typeof c.text === 'string')
          .map((c: ClaudeContentBlock) => c.text)
          .join('');
        return NextResponse.json({ summary });
      } catch (claudeError: unknown) {
        const claudeErrorMessage = claudeError instanceof Error ? claudeError.message : 'Unknown Claude error';
        console.error('Claude fallback also failed:', claudeErrorMessage);
        return NextResponse.json({ error: 'Both Gemini and Claude failed: ' + claudeErrorMessage }, { status: 500 });
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error generating channel summary:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 