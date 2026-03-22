import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import dbConnect from "@/lib/mongoose";
import CarePlan from "@/models/CarePlan";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await auth0.getSession();
    if (!session?.user?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await params;
    const body = await req.json();

    await dbConnect();

    // Verify the user is the Coordinator for this specific plan
    const plan = await CarePlan.findOne({
      _id: planId,
      coordinatorId: session.user.sub,
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found or unauthorized to edit" },
        { status: 403 }
      );
    }

    // Update the allowed editable fields
    // We intentionally ignore fields like inviteCode, caregiverIds, and documents
    plan.patientName = body.patientName || plan.patientName;
    plan.notes = body.notes !== undefined ? body.notes : plan.notes;
    
    // Completely overwrite the arrays with the new edited arrays
    if (body.medications) plan.medications = body.medications;
    if (body.redFlags) plan.redFlags = body.redFlags;
    if (body.careInstructions) plan.careInstructions = body.careInstructions;

    // Reset translation cache because the original source data has now changed
    plan.translations = new Map();

    await plan.save();

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    console.error("Error updating plan:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
