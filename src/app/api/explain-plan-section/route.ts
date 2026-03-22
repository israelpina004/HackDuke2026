import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { auth0 } from "@/lib/auth0";
import dbConnect from "@/lib/mongoose";
import CarePlan from "@/models/CarePlan";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Spanish",
  zh: "Chinese",
  ko: "Korean",
  hi: "Hindi",
  ru: "Russian",
};

const SECTION_LABELS = {
  medications: "Medications",
  redFlags: "Red Flags",
  careInstructions: "Care Instructions",
} as const;

type SectionKey = keyof typeof SECTION_LABELS;

interface ExplanationPlan {
  patientName: string;
  medications: Array<{ name: string; dosage: string; frequency: string; confidence: string }>;
  redFlags: Array<{ issue: string; confidence: string }>;
  careInstructions: Array<{ instruction: string; confidence: string }>;
  notes?: string;
  explanationCache?: Record<string, ExplanationCacheEntry>;
}

interface ExplanationCacheEntry {
  contentHash: string;
  explanation: string;
  createdAt: string | Date;
}

function cleanText(text: string) {
  return text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();
}

function getCacheKey(section: SectionKey, language: string) {
  return `${section}.${language}`;
}

function buildContentHash(section: SectionKey, language: string, plan: ExplanationPlan) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        section,
        language,
        patientName: plan.patientName,
        medications: plan.medications,
        redFlags: plan.redFlags,
        careInstructions: plan.careInstructions,
        notes: plan.notes || "",
      })
    )
    .digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId, language, section } = await req.json();

    if (!planId || !language || !section || !(section in SECTION_LABELS)) {
      return NextResponse.json({ error: "Missing or invalid planId, language, or section" }, { status: 400 });
    }

    await dbConnect();

    const plan = await CarePlan.findOne({
      _id: planId,
      $or: [
        { coordinatorId: session.user.sub },
        { caregiverIds: session.user.sub },
      ],
    })
      .select("patientName medications redFlags careInstructions notes explanationCache")
      .lean<ExplanationPlan | null>();

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const sectionKey = section as SectionKey;
    const cacheKey = getCacheKey(sectionKey, language);
    const contentHash = buildContentHash(sectionKey, language, plan);
    const cached = plan.explanationCache?.[cacheKey];

    if (cached && cached.contentHash === contentHash) {
      return NextResponse.json({ explanation: cached.explanation, cached: true });
    }

    const sectionPayload = {
      medications: plan.medications,
      redFlags: plan.redFlags,
      careInstructions: plan.careInstructions,
    }[sectionKey];

    const targetLanguage = LANGUAGE_LABELS[language] || language;
    const prompt = `You are helping a caregiver understand one section of a post-discharge care plan.

Write the response in ${targetLanguage}.

Patient context:
${JSON.stringify({
  patientName: plan.patientName,
  medications: plan.medications,
  redFlags: plan.redFlags,
  careInstructions: plan.careInstructions,
  coordinatorNotes: plan.notes || "",
}, null, 2)}

Focus section: ${SECTION_LABELS[sectionKey]}
Section content:
${JSON.stringify(sectionPayload, null, 2)}

Requirements:
- Explain what this section means for the caregiver in plain, practical language.
- Use the broader patient context when it helps clarify why these instructions matter.
- Do not invent a diagnosis or details not supported by the plan.
- Keep it concise, warm, and actionable.
- Use plain prose only. No bullets, no markdown.
- End with this exact final sentence: If you are still unsure about these instructions, please contact your coordinator/doctor/nurse.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const explanation = cleanText(result.response.text());

    if (!explanation) {
      return NextResponse.json({ error: "Failed to generate explanation" }, { status: 500 });
    }

    await CarePlan.updateOne(
      { _id: planId },
      {
        $set: {
          [`explanationCache.${cacheKey}`]: {
            contentHash,
            explanation,
            createdAt: new Date(),
          },
        },
      }
    );

    return NextResponse.json({ explanation, cached: false });
  } catch (error: unknown) {
    console.error("Explain section error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}