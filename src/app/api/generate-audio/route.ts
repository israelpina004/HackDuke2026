import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dbConnect from "@/lib/mongoose";
import CarePlan from "@/models/CarePlan";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = "FUfBrNit0NNZAwb58KWH"; // The voice ID from the user's previously working file

export async function POST(req: NextRequest) {
  try {
    const { planId, language } = await req.json();

    if (!planId || !language) {
      return NextResponse.json({ error: "Missing planId or language" }, { status: 400 });
    }

    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: "Missing ElevenLabs API Key" }, { status: 500 });
    }

    await dbConnect();

    // 1. Fetch CarePlan Data
    const plan = await CarePlan.findById(planId).lean();
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // 2. Generate Script via Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
You are a warm, empathetic AI assistant for a family caregiver. You are generating a brief daily audio briefing script.
The script MUST be spoken in this specific language code: "${language}" (e.g., 'en' for English, 'es' for Spanish, 'zh' for Chinese, etc. Translate all content to this language).

Here is the structured care plan data for the patient "${plan.patientName}":
Medications: ${JSON.stringify(plan.medications)}
Red Flags: ${JSON.stringify(plan.redFlags)}
Instructions: ${JSON.stringify(plan.careInstructions)}
Coordinator Notes: ${plan.notes || "None"}

Write a natural, conversational script (around 30-45 seconds of speaking time). 
Start with a friendly greeting confirming the patient's name.
Highlight the medications, instructions, and any red flags they must watch out for today.
Do NOT use Markdown formatting (no asterisks, no bullet points). Write it as purely spoken text with natural punctuation for pauses. 
Keep it clear, reassuring, and concise.`;

    const result = await model.generateContent(prompt);
    const script = result.response.text();

    if (!script) {
      return NextResponse.json({ error: "Failed to generate script" }, { status: 500 });
    }

    // 3. Generate Audio via ElevenLabs (Using eleven_multilingual_v2 to support all 6 languages)
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: script,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
        let errorDetails = "";
        try {
            const errJson = await response.json();
            errorDetails = JSON.stringify(errJson);
        } catch(e) {
            errorDetails = response.statusText;
        }
      throw new Error(`ElevenLabs API error: ${errorDetails}`);
    }

    // Return the audio stream directly to the client
    return new NextResponse(response.body, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error: any) {
    console.error("Audio generation failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate audio" },
      { status: 500 }
    );
  }
}