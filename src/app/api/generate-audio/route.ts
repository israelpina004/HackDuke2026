import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { auth0 } from "@/lib/auth0";
import dbConnect from "@/lib/mongoose";
import CarePlan from "@/models/CarePlan";

export const runtime = "nodejs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = "FUfBrNit0NNZAwb58KWH";
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Spanish",
  zh: "Chinese",
  ko: "Korean",
  hi: "Hindi",
  ru: "Russian",
};

interface PlanMedication {
  name: string;
  dosage: string;
  frequency: string;
}

interface PlanRedFlag {
  issue: string;
}

interface PlanInstruction {
  instruction: string;
}

interface AudioPlan {
  _id?: string;
  patientName: string;
  medications?: PlanMedication[];
  redFlags?: PlanRedFlag[];
  careInstructions?: PlanInstruction[];
  notes?: string;
  audioBriefings?: Record<string, AudioBriefingCacheEntry>;
}

interface AudioBriefingCacheEntry {
  contentHash: string;
  script: string;
  audioBase64: string;
  mimeType: string;
  createdAt: string | Date;
}

function cleanScript(text: string) {
  return text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();
}

function buildContentHash(payload: object, language: string) {
  return createHash("sha256")
    .update(JSON.stringify({ language, payload }))
    .digest("hex");
}

function getCacheKey(language: string) {
  return `dailyBriefing.${language}`;
}

export async function POST(req: NextRequest) {
  try {
    if (!genAI) {
      return NextResponse.json({ error: "Missing Gemini API Key" }, { status: 500 });
    }

    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: "Missing ElevenLabs API Key" }, { status: 500 });
    }

    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId, language } = await req.json();

    if (!planId || !language) {
      return NextResponse.json({ error: "Missing planId or language" }, { status: 400 });
    }

    await dbConnect();

    const plan = await CarePlan.findOne({
      _id: planId,
      $or: [
        { coordinatorId: session.user.sub },
        { caregiverIds: session.user.sub },
      ],
    })
      .select("patientName medications redFlags careInstructions notes audioBriefings")
      .lean<AudioPlan | null>();

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const targetLanguage = LANGUAGE_LABELS[language] || language;
    const carePlanPayload = {
      patientName: plan.patientName,
      medications: (plan.medications || []).map((medication) => ({
        name: medication.name,
        dosage: medication.dosage,
        frequency: medication.frequency,
      })),
      redFlags: (plan.redFlags || []).map((flag) => flag.issue),
      careInstructions: (plan.careInstructions || []).map((instruction) => instruction.instruction),
      notes: plan.notes || "",
    };
    const contentHash = buildContentHash(carePlanPayload, language);
    const cacheKey = getCacheKey(language);
    const cachedBriefing = plan.audioBriefings?.[cacheKey];

    if (cachedBriefing && cachedBriefing.contentHash === contentHash) {
      const cachedAudioBuffer = Buffer.from(cachedBriefing.audioBase64, "base64");
      return new Response(cachedAudioBuffer, {
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": cachedBriefing.mimeType,
          "X-Audio-Cache": "HIT",
        },
      });
    }

    const prompt = `You are a warm, reliable care coordinator speaking directly to a family caregiver.

Write a conversational daily audio briefing in ${targetLanguage}. The entire response must be in ${targetLanguage}.

Use this structured care plan data:
${JSON.stringify(carePlanPayload, null, 2)}

Requirements:
- Keep the tone reassuring, natural, and specific.
- Mention the patient by name once near the beginning.
- Summarize the key medications, care instructions, and red flags to watch today.
- Include coordinator notes only if they add useful daily context.
- Keep it concise, about 90 to 140 words.
- Write plain spoken prose only. No markdown, no labels, no bullet points, no JSON.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const script = cleanScript(result.response.text());

    if (!script) {
      return NextResponse.json({ error: "Failed to generate script" }, { status: 500 });
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: script,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.8,
        },
      }),
    });

    if (!response.ok || !response.body) {
      const errorDetails = await response.text().catch(() => response.statusText);
      throw new Error(`ElevenLabs API error: ${errorDetails || response.statusText}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    await CarePlan.updateOne(
      { _id: planId },
      {
        $set: {
          [`audioBriefings.${cacheKey}`]: {
            contentHash,
            script,
            audioBase64: audioBuffer.toString("base64"),
            mimeType: "audio/mpeg",
            createdAt: new Date(),
          },
        },
      }
    );

    return new Response(audioBuffer, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "audio/mpeg",
        "X-Audio-Cache": "MISS",
      },
    });
  } catch (error: unknown) {
    console.error("Audio generation failed:", error);
    const message = error instanceof Error ? error.message : "Failed to generate audio";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}