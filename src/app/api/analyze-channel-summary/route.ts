import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';

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
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-04-17' });
      const result = await model.generateContent(prompt);
      const summary = result.response.text();
      return NextResponse.json({ summary });
    } catch (geminiError: any) {
      // If Gemini fails, try Claude
      console.error('Gemini failed, falling back to Claude:', geminiError);
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
          .filter((c: any) => c.type === 'text' && typeof c.text === 'string')
          .map((c: any) => c.text)
          .join('');
        return NextResponse.json({ summary });
      } catch (claudeError: any) {
        console.error('Claude fallback also failed:', claudeError);
        return NextResponse.json({ error: 'Both Gemini and Claude failed: ' + (claudeError.message || 'Unknown error') }, { status: 500 });
      }
    }
  } catch (error: any) {
    console.error('Error generating channel summary:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
} 