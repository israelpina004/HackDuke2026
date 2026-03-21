import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { auth0 } from "@/lib/auth0";

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, phone, role } = await req.json();

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required." }, { status: 400 });
    }

    await dbConnect();
    
    // Check if user already exists
    const existingUser = await User.findOne({ auth0Id: session.user.sub });
    if (existingUser) {
      return NextResponse.json({ success: true, message: "Profile already complete.", user: existingUser });
    }

    // Create the new user profile
    const newUser = await User.create({
      auth0Id: session.user.sub,
      name,
      phone,
      role: role || 'Caregiver'
    });

    return NextResponse.json({
      success: true,
      message: "Profile completed successfully.",
      user: newUser
    });
  } catch (error: any) {
    console.error("Error saving user profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
