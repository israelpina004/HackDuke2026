import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import dbConnect from "@/lib/mongoose";
import CarePlan from "@/models/CarePlan";
import { auth0 } from "@/lib/auth0";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

function generateInviteCode(): string {
  // Generate a random 6-character alphanumeric code
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    patientName: {
      type: SchemaType.STRING,
      description: "Name of the patient. Use 'Unknown' if not found.",
    },
    medications: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING, description: "Name of the medication" },
          dosage: { type: SchemaType.STRING, description: "Dosage (e.g., 50mg)" },
          frequency: { type: SchemaType.STRING, description: "Frequency (e.g., twice daily)" },
        },
        required: ["name", "dosage", "frequency"],
      },
    },
    redFlags: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Any severe symptoms or conditions requiring urgent attention",
    },
  },
  required: ["patientName", "medications", "redFlags"],
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const generativePart = {
      inlineData: {
        data: Buffer.from(buffer).toString("base64"),
        mimeType: file.type, // Make sure it's application/pdf or image type
      },
    };

    const prompt = "You are an expert medical transcriptionist. Extract the patient's name, all their medications (with dosage and frequency), and any 'red flags' or warning signs that require immediate action, from the provided medical discharge document.";

    // Call Gemini 1.5 Flash to process the medical document
    const result = await model.generateContent([prompt, generativePart]);
    const text = result.response.text();
    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch (err) {
      return NextResponse.json({ error: "Failed to parse AI output as JSON" }, { status: 500 });
    }

    // Connect to database to save the extracted care plan
    await dbConnect();
    const inviteCode = generateInviteCode();

    const newCarePlan = await CarePlan.create({
      coordinatorId: session.user.sub, // The Auth0 ID of the Coordinator
      caregiverIds: [],
      inviteCode,
      patientName: parsedData.patientName || "Unknown",
      medications: parsedData.medications || [],
      redFlags: parsedData.redFlags || [],
    });

    return NextResponse.json({
      success: true,
      carePlan: newCarePlan,
      parsedData,
    });
  } catch (error: any) {
    console.error("Error parsing document:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
