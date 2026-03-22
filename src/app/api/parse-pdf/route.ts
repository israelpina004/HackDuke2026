import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import dbConnect from "@/lib/mongoose";
import CarePlan from "@/models/CarePlan";
import { auth0 } from "@/lib/auth0";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

function generateInviteCode(): string {
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
          frequency: { type: SchemaType.STRING, description: "Frequency instructions (e.g., twice daily)" },
          confidence: { type: SchemaType.STRING, description: "'High', 'Medium', or 'Low' confidence level" }
        },
        required: ["name", "dosage", "frequency", "confidence"],
      },
    },
    careInstructions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          instruction: { type: SchemaType.STRING, description: "A non-medication care instruction (e.g., 'Elevate leg', 'Drink water')" },
          confidence: { type: SchemaType.STRING, description: "'High', 'Medium', or 'Low' confidence level" }
        },
        required: ["instruction", "confidence"]
      },
      description: "Any general non-medication instructions for the patient's recovery.",
    },
    redFlags: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          issue: { type: SchemaType.STRING, description: "The red flag symptom or warning" },
          confidence: { type: SchemaType.STRING, description: "'High', 'Medium', or 'Low' confidence level" }
        },
        required: ["issue", "confidence"]
      },
      description: "Any severe symptoms or conditions requiring urgent attention",
    },
    calendarEvents: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING, description: "Summary of the event, e.g., 'Take Tylenol (50mg)'" },
          start: { type: SchemaType.STRING, description: "ISO 8601 string for start date/time" },
          end: { type: SchemaType.STRING, description: "ISO 8601 string for end date/time" },
          allDay: { type: SchemaType.BOOLEAN, description: "True if all day, False if specific time" }
        },
        required: ["title", "start", "end", "allDay"]
      },
      description: "Derived calendar events logically mapping the medication frequencies into actionable time slots for the NEXT 48 hours. DO NOT use relative days.",
    },
    contactInfo: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, description: "Doctor or provider name if found, otherwise empty string" },
        phone: { type: SchemaType.STRING, description: "Contact phone number if found, otherwise empty string" },
        facility: { type: SchemaType.STRING, description: "Hospital or clinic name if found, otherwise empty string" },
      },
      required: ["name", "phone", "facility"],
      description: "Contact information for the discharging doctor, provider, or facility extracted from the document.",
    },
  },
  required: ["patientName", "medications", "careInstructions", "redFlags", "calendarEvents", "contactInfo"],
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const targetLanguage = (formData.get("targetLanguage") as string) || "en";
    const createdByRole = (formData.get("createdByRole") as string) || "Coordinator";

    // Support both single "file" and multiple "files" uploads
    const files: File[] = [];
    const singleFile = formData.get("file") as File | null;
    const multiFiles = formData.getAll("files") as File[];

    if (singleFile) files.push(singleFile);
    if (multiFiles.length > 0) files.push(...multiFiles);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    // Convert all files to Gemini inline data parts
    const fileParts = await Promise.all(
      files.map(async (f) => {
        const buffer = await f.arrayBuffer();
        return {
          inlineData: {
            data: Buffer.from(buffer).toString("base64"),
            mimeType: f.type,
          },
        };
      })
    );

    const prompt = `You are an expert medical transcriptionist. You are receiving one or more pages/images of a patient's discharge document. Treat ALL uploaded files as parts of the SAME document.

Extract:
- Patient name
- All medications (name, dosage, frequency) with confidence levels
- Care instructions with confidence levels
- Red flags / warning signs with confidence levels
- Calendar events for the next 48 hours based on medication frequencies
- Contact information (doctor name, phone number, hospital/facility name) if visible anywhere in the document

For every extracted point, classify confidence as 'High', 'Medium', or 'Low' based on legibility. If contact info is not found, return empty strings.

CRITICAL TRANSLATION REQUIREMENT: You MUST translate and output ALL extracted medical JSON data, symptom descriptions, medication instructions, and calendar event titles into the language corresponding to this ISO code: '${targetLanguage}'. Do not use English unless the targetLanguage is 'en'.`;

    const result = await model.generateContent([prompt, ...fileParts]);
    const text = result.response.text();
    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI output as JSON" }, { status: 500 });
    }

    await dbConnect();
    const inviteCode = generateInviteCode();

    const isCaregiver = createdByRole === "Caregiver";

    const newCarePlan = await CarePlan.create({
      coordinatorId: isCaregiver ? "" : session.user.sub,
      createdByRole: isCaregiver ? "Caregiver" : "Coordinator",
      caregiverIds: isCaregiver ? [session.user.sub] : [],
      inviteCode,
      originalLanguage: targetLanguage,
      patientName: parsedData.patientName || "Unknown",
      medications: parsedData.medications || [],
      careInstructions: parsedData.careInstructions || [],
      redFlags: parsedData.redFlags || [],
      calendarEvents: parsedData.calendarEvents || [],
      contactInfo: parsedData.contactInfo || {},
      documents: fileParts.map(p => ({
        data: p.inlineData.data,
        mimeType: p.inlineData.mimeType
      })),
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
