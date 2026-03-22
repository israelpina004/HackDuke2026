import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dbConnect from "@/lib/mongoose";
import CarePlan from "@/models/CarePlan";
import { auth0 } from "@/lib/auth0";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

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

    // Check if translation already cached
    const plan = await CarePlan.findOne({
      _id: planId,
      $or: [
        { coordinatorId: session.user.sub },
        { caregiverIds: session.user.sub },
      ],
    }).select('medications redFlags careInstructions originalLanguage translations');

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // If requesting the original language, just return the stored data
    if (targetLanguage === plan.originalLanguage) {
      return NextResponse.json({
        medications: plan.medications,
        redFlags: plan.redFlags,
        careInstructions: plan.careInstructions,
        cached: true,
      });
    }

    // Check cache
    const cached = plan.translations?.get(targetLanguage);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    // Build a compact JSON representation of the plan for Gemini
    const sourceData = {
      medications: plan.medications.map((m: any) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        confidence: m.confidence,
      })),
      redFlags: plan.redFlags.map((r: any) => ({
        issue: r.issue,
        confidence: r.confidence,
      })),
      careInstructions: plan.careInstructions.map((c: any) => ({
        instruction: c.instruction,
        confidence: c.confidence,
      })),
    };

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Translate the following medical care plan JSON into the language with ISO code '${targetLanguage}'.
Keep the EXACT same JSON structure. Only translate the human-readable text fields (name, dosage, frequency, issue, instruction).
Do NOT translate 'confidence' values — they must remain 'High', 'Medium', or 'Low'.
Return ONLY valid JSON, no markdown fences.

${JSON.stringify(sourceData)}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let translated;
    try {
      // Strip markdown fences if present
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      translated = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Failed to parse translation" }, { status: 500 });
    }

    // Cache the translation in MongoDB
    await CarePlan.updateOne(
      { _id: planId },
      { $set: { [`translations.${targetLanguage}`]: translated } }
    );

    return NextResponse.json({ ...translated, cached: false });
  } catch (error: any) {
    console.error("Translation error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
