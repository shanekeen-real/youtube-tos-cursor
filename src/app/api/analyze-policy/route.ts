import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    });

    // The Master Prompt - The new brain of the application
    const prompt = `
      Act as an expert YouTube policy analyst. Your task is to analyze the following text content and provide a detailed risk assessment based on YouTube's community guidelines and advertiser-friendly policies.

      The user's content to analyze is:
      ---
      "${text}"
      ---

      Based on this content, perform the following actions:

      1.  **Calculate an Overall Risk Score:** Provide a numerical score from 0 (no risk) to 100 (high risk). This score should reflect the content's likelihood of being demonetized or removed. A score of 0-34 is LOW risk, 35-69 is MEDIUM risk, and 70-100 is HIGH risk.

      2.  **Identify the Risk Level:** Based on the score, classify the risk as "LOW", "MEDIUM", or "HIGH".

      3.  **Provide a Flagged Section:** Write a concise, one-sentence summary of the single most significant risk found in the text.

      4.  **Create Risk Highlights:** Identify up to 4 specific policy areas that are at risk. For each highlight, provide the category (e.g., "Hate Speech," "Graphic Violence," "Misinformation"), a risk level ("high", "medium", or "low"), and a confidence score (0-100).

      5.  **Generate Actionable Suggestions:** Provide at least 2-3 specific, actionable suggestions for how the user can improve their content to reduce the identified risks. Each suggestion should have a title and a descriptive text.

      Please return your analysis **only** as a valid JSON object, with no other text or explanation. The JSON object must follow this exact structure:
      {
        "risk_score": <number>,
        "risk_level": "<string>",
        "flagged_section": "<string>",
        "highlights": [
          {
            "category": "<string>",
            "risk": "<string>",
            "score": <number>
          }
        ],
        "suggestions": [
          {
            "title": "<string>",
            "text": "<string>"
          }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let jsonString = response.text();

    // The model may return a JSON object wrapped in markdown or with trailing text.
    // This function extracts the clean JSON string.
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    } else {
      // If we can't find a JSON object, throw an error.
      throw new Error("No valid JSON object found in the AI's response.");
    }
    
    // The response from the AI should be a JSON string. We parse it here.
    const analysisResult = JSON.parse(jsonString);

    return NextResponse.json({
      ...analysisResult,
      mode: 'free',
      source: 'gemini-pro'
    });

  } catch (error) {
    console.error('Gemini API error:', error);
    // This is a common error if the AI's response isn't perfect JSON.
    // We log it for debugging.
    return NextResponse.json({
      error: 'AI analysis failed',
      details: error instanceof Error ? error.message : 'The AI returned an invalid response. Please try again.'
    }, { status: 500 });
  }
} 