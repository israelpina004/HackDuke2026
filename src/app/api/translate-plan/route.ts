import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import dbConnect from "@/lib/mongoose";
import CarePlan from "@/models/CarePlan";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

interface TranslationPlan {
  originalLanguage: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    confidence: "High" | "Medium" | "Low";
  }>;
  redFlags: Array<{
    issue: string;
    confidence: "High" | "Medium" | "Low";
  }>;
  careInstructions: Array<{
    instruction: string;
    confidence: "High" | "Medium" | "Low";
  }>;
  translations?: Map<string, unknown> | Record<string, unknown>;
}

function stripFences(text: string) {
  return text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId, targetLanguage } = await req.json();

    if (!planId || !targetLanguage) {
      return NextResponse.json({ error: "Missing planId or targetLanguage" }, { status: 400 });
    }

    await dbConnect();

    const plan = await CarePlan.findOne({
      _id: planId,
      $or: [
        { coordinatorId: session.user.sub },
        { caregiverIds: session.user.sub },
      ],
    })
      .select("medications redFlags careInstructions originalLanguage translations")
      .lean<TranslationPlan | null>();

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    if (targetLanguage === plan.originalLanguage) {
      return NextResponse.json({
        medications: plan.medications,
        redFlags: plan.redFlags,
        careInstructions: plan.careInstructions,
        cached: true,
      });
    }

    const cached = plan.translations instanceof Map
      ? plan.translations.get(targetLanguage)
      : plan.translations?.[targetLanguage];
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    const sourceData = {
      medications: plan.medications.map((medication) => ({
        name: medication.name,
        dosage: medication.dosage,
        frequency: medication.frequency,
        confidence: medication.confidence,
      })),
      redFlags: plan.redFlags.map((flag) => ({
        issue: flag.issue,
        confidence: flag.confidence,
      })),
      careInstructions: plan.careInstructions.map((instruction) => ({
        instruction: instruction.instruction,
        confidence: instruction.confidence,
      })),
    };

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Translate the following medical care plan JSON into the language with ISO code '${targetLanguage}'.
Keep the EXACT same JSON structure.
Only translate the human-readable text fields (name, dosage, frequency, issue, instruction).
Do NOT translate 'confidence' values — they must remain 'High', 'Medium', or 'Low'.
Return ONLY valid JSON, no markdown fences.

${JSON.stringify(sourceData)}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let translated: unknown;
    try {
      translated = JSON.parse(stripFences(text));
    } catch {
      return NextResponse.json({ error: "Failed to parse translation" }, { status: 500 });
    }

    await CarePlan.updateOne(
      { _id: planId },
      { $set: { [`translations.${targetLanguage}`]: translated } }
    );

    return NextResponse.json({ ...(translated as object), cached: false });
  } catch (error: unknown) {
    console.error("Translation error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
