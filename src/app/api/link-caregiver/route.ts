import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import CarePlan from "@/models/CarePlan";
import { auth0 } from "@/lib/auth0";
import User from "@/models/User";

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

    const dbUser = await User.findOne({ auth0Id: session.user.sub }).select("role").lean<{ role?: string } | null>();
    if (!dbUser) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }
    if (dbUser.role === "Coordinator") {
      return NextResponse.json({ error: "Coordinators cannot join a care plan." }, { status: 403 });
    }

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
