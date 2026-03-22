import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import CarePlan from "@/models/CarePlan";
import { auth0 } from "@/lib/auth0";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string; docIndex: string }> }
) {
  try {
    const { planId, docIndex } = await params;
    const session = await auth0.getSession();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await dbConnect();
    
    // Find the care plan, selecting ONLY the documents array to save memory
    const plan = await CarePlan.findOne({
      _id: planId,
      $or: [
        { coordinatorId: session.user.sub },
        { caregiverIds: session.user.sub },
      ]
    }).select('documents');

    if (!plan) {
      return new NextResponse("Care plan not found or unauthorized", { status: 404 });
    }

    const index = parseInt(docIndex, 10);
    const doc = plan.documents?.[index];

    if (!doc || !doc.data || !doc.mimeType) {
      return new NextResponse("Document not found", { status: 404 });
    }

    // Convert Base64 back to binary Buffer
    const buffer = Buffer.from(doc.data, "base64");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": doc.mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving document:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
