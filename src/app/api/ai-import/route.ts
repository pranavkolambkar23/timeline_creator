import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, files } = body;

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "GEMINI_API_KEY is not configured in environment variables" }, { status: 500 });
        }

        const parts: any[] = [];

        // Add the strict system prompt for JSON generation
        const systemInstruction = `You are a strict JSON data extraction assistant for a travel and history timeline app.
Extract chronological events and general timeline details from the user's prompt and provided documents/images.
Return ONLY a valid JSON object, with NO markdown formatting, NO \`\`\`json wrappers, and NO extra text.
The object must exactly match this structure:
{
  "title": "A highly relevant, catchy name for the overall timeline (e.g., 'Paris & Lyon Adventure 2026' or 'A History of the Printing Press')",
  "description": "A summary describing the overall journey, history, or sequence of events",
  "category": "One of these exact options: General, History, Technology, Science, Art, Sports. Choose the best matching category.",
  "tags": ["2 to 4 short relevant tags/keywords, e.g. ['travel', 'france', 'railway'] or ['science', 'renaissance']"],
  "events": [
    {
      "title": "Short event title (e.g. Arrive in Paris)",
      "description": "Details about the event, flight numbers, activities",
      "date": "YYYY-MM-DD",
      "locationStr": "City, Country or precise location name (e.g. Paris, France)"
    }
  ]
}
If a date is not specific, estimate a logical YYYY-MM-DD based on context or leave empty string.
If location is unknown, leave empty string.
Ensure the output is 100% valid JSON parseable by JSON.parse().`;

        parts.push({ text: systemInstruction });

        if (prompt) {
            parts.push({ text: `User request: ${prompt}` });
        }

        if (files && files.length > 0) {
            files.forEach((file: { base64: string, mimeType: string }) => {
                parts.push({
                    inlineData: {
                        data: file.base64.split(',')[1] || file.base64, // remove data:image/jpeg;base64, prefix if present
                        mimeType: file.mimeType
                    }
                });
            });
        }

        // Multi-model fallback sequence to bypass 503 / 429 errors seamlessly
        let result = null;
        let lastError = null;
        const modelsToTry = [
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-2.0-flash",
            "gemini-flash-latest"
        ];

        for (const modelName of modelsToTry) {
            try {
                console.log(`[AI Import] Attempting generation with: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                result = await model.generateContent(parts);
                if (result) {
                    console.log(`[AI Import] Success using: ${modelName}`);
                    break;
                }
            } catch (err: any) {
                console.warn(`[AI Import] Model ${modelName} failed or busy. Error:`, err.message || err);
                lastError = err;
            }
        }

        if (!result) {
            throw new Error(`All Gemini models are currently busy or unavailable. Last error: ${lastError?.message || lastError}`);
        }

        const responseText = result.response.text();
        
        // Clean markdown backticks if Gemini still includes them despite instructions
        let cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        let jsonArray;
        try {
            jsonArray = JSON.parse(cleanJson);
        } catch (parseError) {
            console.error("Failed to parse JSON from AI:", cleanJson);
            return NextResponse.json({ error: "AI returned invalid format", raw: cleanJson }, { status: 500 });
        }

        return NextResponse.json(jsonArray);
    } catch (error: any) {
        console.error("AI IMPORT ERROR:", error);
        return NextResponse.json({ error: error.message || "Failed to process AI request" }, { status: 500 });
    }
}
