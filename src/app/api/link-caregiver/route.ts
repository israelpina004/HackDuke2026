import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import CarePlan from "@/models/CarePlan";
import { auth0 } from "@/lib/auth0";

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { inviteCode } = await req.json();

    if (!inviteCode || typeof inviteCode !== "string") {
      return NextResponse.json({ error: "Invite code is required." }, { status: 400 });
    }

    await dbConnect();

    // Look for a Care Plan with the matching invite code
    const plan = await CarePlan.findOne({ inviteCode: inviteCode.toUpperCase() });

    if (!plan) {
      return NextResponse.json({ error: "Invalid invite code. Try again." }, { status: 404 });
    }

    const caregiverId = session.user.sub;

    // Check if user is already linked
    if (plan.caregiverIds.includes(caregiverId)) {
      return NextResponse.json({ 
        success: true, 
        message: "You are already linked to this plan.", 
        planId: plan._id 
      });
    }

    // Link the user by adding their Auth0 ID to the array
    plan.caregiverIds.push(caregiverId);
    await plan.save();

    return NextResponse.json({
      success: true,
      message: "Successfully joined the care plan.",
      planId: plan._id
    });
  } catch (error: any) {
    console.error("Error linking caregiver:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
