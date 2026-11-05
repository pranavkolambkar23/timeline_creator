import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

type UploadedFile = {
    base64: string;
    mimeType: string;
    name?: string;
};

type AiImportBody = {
    prompt?: string;
    files?: UploadedFile[];
};

type ProviderResult = {
    provider: string;
    model: string;
    text: string;
};

const GEMINI_MODELS = [
    process.env.GEMINI_MODEL,
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3-flash-preview",
    "gemini-flash-lite-latest",
    "gemini-flash-latest",
].filter(Boolean) as string[];

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_TEXT_MODELS = [
    process.env.GROQ_TEXT_MODEL,
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
].filter(Boolean) as string[];

const GROQ_VISION_MODELS = [
    process.env.GROQ_VISION_MODEL,
    "qwen/qwen3.8-27b",
].filter(Boolean) as string[];

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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
      "date": "Use one supported format: YYYY-MM-DD, DD-MM-YYYY, MM-YYYY, YYYY, c. YYYY, 17th century, YYYY BCE, c. YYYY BCE, or 5th century BCE",
      "locationStr": "City, Country or precise location name (e.g. Paris, France)"
    }
  ]
}
Use the most historically accurate date precision available. Do not invent an exact day for year-only, month-only, approximate, BCE, or century-level dates. Use c. only when the date is approximate. Date ranges are not supported: choose the most meaningful single date for the event. If an event has no usable date position, omit that event.
If location is unknown, leave empty string.
Ensure the output is 100% valid JSON parseable by JSON.parse().`;

function cleanAiJson(responseText: string) {
    return responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
}

function normalizeBase64Data(file: UploadedFile) {
    return file.base64.split(",")[1] || file.base64;
}

function buildGeminiParts(prompt?: string, files: UploadedFile[] = []) {
    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
        { text: systemInstruction },
    ];

    if (prompt) {
        parts.push({ text: `User request: ${prompt}` });
    }

    for (const file of files) {
        parts.push({
            inlineData: {
                data: normalizeBase64Data(file),
                mimeType: file.mimeType,
            },
        });
    }

    return parts;
}

async function generateWithGemini(prompt?: string, files: UploadedFile[] = []): Promise<ProviderResult> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured in environment variables");
    }

    const parts = buildGeminiParts(prompt, files);
    let lastError: unknown = null;

    for (const modelName of GEMINI_MODELS) {
        try {
            console.log(`[AI Import] Attempting Gemini generation with: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(parts);
            const text = result.response.text();

            if (text) {
                console.log(`[AI Import] Success using Gemini model: ${modelName}`);
                return { provider: "gemini", model: modelName, text };
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`[AI Import] Gemini model ${modelName} failed. Error:`, message);
            lastError = error;
        }
    }

    const lastMessage = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`All Gemini models are currently busy or unavailable. Last error: ${lastMessage}`);
}

function buildGroqUserContent(modelSupportsVision: boolean, prompt?: string, files: UploadedFile[] = []) {
    const imageFiles = files.filter((file) => file.mimeType.startsWith("image/"));
    const nonImageFiles = files.filter((file) => !file.mimeType.startsWith("image/"));

    if (!modelSupportsVision || imageFiles.length === 0) {
        const textParts: string[] = [];
        if (prompt) {
            textParts.push(`User request: ${prompt}`);
        } else {
            textParts.push("Extract a timeline from the provided request.");
        }

        if (files.length > 0) {
            const unsupported = files.map((f) => f.name || f.mimeType).join(", ");
            textParts.push(`Note: The following uploaded files could not be directly processed by this text model fallback: ${unsupported}. Extract timeline events based on the user prompt.`);
        }

        return textParts.join("\n\n");
    }

    const content: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
    > = [
        { type: "text", text: prompt ? `User request: ${prompt}` : "Extract a timeline from the provided files." },
    ];

    for (const file of imageFiles) {
        const data = normalizeBase64Data(file);
        content.push({
            type: "image_url",
            image_url: {
                url: `data:${file.mimeType};base64,${data}`,
            },
        });
    }

    if (nonImageFiles.length > 0) {
        const unsupported = nonImageFiles.map((f) => f.name || f.mimeType).join(", ");
        content.push({
            type: "text",
            text: `The following uploaded files could not be sent to the Groq fallback because they are not images: ${unsupported}. Use only the readable prompt text and image uploads.`,
        });
    }

    return content;
}

async function generateWithGroq(prompt?: string, files: UploadedFile[] = []): Promise<ProviderResult> {
    if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is not configured in environment variables");
    }

    const hasImages = files.some((file) => file.mimeType.startsWith("image/"));
    const candidateModels = hasImages
        ? [...new Set([...GROQ_VISION_MODELS, ...GROQ_TEXT_MODELS])]
        : GROQ_TEXT_MODELS;

    let lastError: unknown = null;

    for (const modelName of candidateModels) {
        try {
            console.log(`[AI Import] Attempting Groq fallback with: ${modelName}`);
            const modelSupportsVision = GROQ_VISION_MODELS.includes(modelName);
            const userContent = buildGroqUserContent(modelSupportsVision, prompt, files);

            const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [
                        { role: "system", content: systemInstruction },
                        { role: "user", content: userContent },
                    ],
                    temperature: 0.2,
                    max_completion_tokens: 4096,
                    response_format: { type: "json_object" },
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Groq model ${modelName} returned (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            const text = data?.choices?.[0]?.message?.content;

            if (typeof text !== "string" || !text.trim()) {
                throw new Error(`Groq model ${modelName} returned an empty response`);
            }

            console.log(`[AI Import] Success using Groq fallback: ${modelName}`);
            return { provider: "groq", model: modelName, text };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`[AI Import] Groq model ${modelName} failed. Error:`, message);
            lastError = error;
        }
    }

    const lastMessage = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`All Groq fallback models failed. Last error: ${lastMessage}`);
}

async function generateTimelineJson(prompt?: string, files: UploadedFile[] = []) {
    const errors: string[] = [];

    try {
        return await generateWithGemini(prompt, files);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("[AI Import] Gemini provider failed. Trying Groq fallback.", message);
        errors.push(message);
    }

    try {
        return await generateWithGroq(prompt, files);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(message);
        throw new Error(`All AI providers are currently unavailable. ${errors.join(" | ")}`);
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json() as AiImportBody;
        const prompt = body.prompt?.trim();
        const files = Array.isArray(body.files) ? body.files : [];

        if (!prompt && files.length === 0) {
            return NextResponse.json({ error: "Please provide a prompt or upload documents." }, { status: 400 });
        }

        const result = await generateTimelineJson(prompt, files);
        const cleanJson = cleanAiJson(result.text);

        try {
            const parsedJson = JSON.parse(cleanJson);
            return NextResponse.json(parsedJson);
        } catch {
            console.error(`[AI Import] Failed to parse JSON from ${result.provider}/${result.model}:`, cleanJson);
            return NextResponse.json({ error: "AI returned invalid format", raw: cleanJson }, { status: 500 });
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to process AI request";
        console.error("AI IMPORT ERROR:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
