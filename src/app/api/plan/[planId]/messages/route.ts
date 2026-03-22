import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import dbConnect, { withTimeout } from "@/lib/mongoose";
import CarePlan from "@/models/CarePlan";
import Message from "@/models/Message";
import User from "@/models/User";

type LeanPlan = {
  _id: { toString(): string };
  coordinatorId: string;
  caregiverIds?: string[];
  createdByRole?: string;
};

type LeanMessage = {
  _id: { toString(): string };
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: Date;
};

type LeanUser = {
  auth0Id: string;
  name: string;
};

async function getAuthorizedPlan(planId: string, userId: string): Promise<LeanPlan | null> {
  await withTimeout(dbConnect(), 8000);
  return withTimeout(
    CarePlan.findOne({
      _id: planId,
      $or: [{ coordinatorId: userId }, { caregiverIds: userId }],
    })
      .select("coordinatorId caregiverIds createdByRole")
      .lean(),
    5000
  );
}

function isCoordinatorForPlan(plan: LeanPlan, userId: string) {
  return plan.coordinatorId === userId && plan.createdByRole !== "Caregiver";
}

function serializeMessage(message: LeanMessage, userMap: Map<string, string>) {
  return {
    _id: message._id.toString(),
    senderId: message.senderId,
    senderName: userMap.get(message.senderId) || "Care Team",
    receiverId: message.receiverId,
    receiverName: userMap.get(message.receiverId) || "Care Team",
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await auth0.getSession();
    const userId = session?.user?.sub;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await params;
    const plan = await getAuthorizedPlan(planId, userId);

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const isCoordinator = isCoordinatorForPlan(plan, userId);
    const caregiverIds = plan.caregiverIds || [];

    const messageFilter = isCoordinator
      ? {
          carePlanId: planId,
          $or: [{ senderId: userId }, { receiverId: userId }],
        }
      : {
          carePlanId: planId,
          $or: [
            { senderId: userId, receiverId: plan.coordinatorId },
            { senderId: plan.coordinatorId, receiverId: userId },
          ],
        };

    const messages = (await withTimeout(
      Message.find(messageFilter).sort({ createdAt: 1 }).lean(),
      5000
    )) as LeanMessage[];

    const recipientIds = isCoordinator
      ? caregiverIds.filter((id) => id !== userId)
      : plan.coordinatorId && plan.coordinatorId !== userId
        ? [plan.coordinatorId]
        : [];

    const userIds = Array.from(
      new Set([
        userId,
        plan.coordinatorId,
        ...caregiverIds,
        ...messages.flatMap((message) => [message.senderId, message.receiverId]),
      ].filter(Boolean))
    );

    const users = (await withTimeout(
      User.find({ auth0Id: { $in: userIds } }).select("auth0Id name").lean(),
      5000
    )) as LeanUser[];

    const userMap = new Map(users.map((user) => [user.auth0Id, user.name]));

    return NextResponse.json({
      messages: messages.map((message) => serializeMessage(message, userMap)),
      recipients: recipientIds.map((id) => ({ id, name: userMap.get(id) || "Care Team" })),
      isCoordinator,
    });
  } catch (error: unknown) {
    console.error("Error loading messages:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await auth0.getSession();
    const userId = session?.user?.sub;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await params;
    const plan = await getAuthorizedPlan(planId, userId);

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const body = await req.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const requestedRecipientId = typeof body.recipientId === "string" ? body.recipientId : undefined;

    if (!content) {
      return NextResponse.json({ error: "Message content is required." }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: "Message is too long." }, { status: 400 });
    }

    const isCoordinator = isCoordinatorForPlan(plan, userId);
    const caregiverIds = plan.caregiverIds || [];

    let recipientId: string | undefined;

    if (isCoordinator) {
      if (!requestedRecipientId || !caregiverIds.includes(requestedRecipientId)) {
        return NextResponse.json({ error: "Choose a caregiver to message." }, { status: 400 });
      }
      recipientId = requestedRecipientId;
    } else if (plan.coordinatorId && plan.coordinatorId !== userId) {
      recipientId = plan.coordinatorId;
    }

    if (!recipientId) {
      return NextResponse.json({ error: "No recipient is available for this care plan yet." }, { status: 400 });
    }

    // Run the write and the user lookup in parallel to cut latency
    const [createdMessage, users] = await withTimeout(
      Promise.all([
        Message.create({
          carePlanId: planId,
          senderId: userId,
          receiverId: recipientId,
          content,
        }),
        User.find({ auth0Id: { $in: [userId, recipientId] } }).select("auth0Id name").lean() as Promise<LeanUser[]>,
      ]),
      10000
    );
    const userMap = new Map(users.map((user) => [user.auth0Id, user.name]));

    return NextResponse.json({
      message: serializeMessage(createdMessage as LeanMessage, userMap),
    });
  } catch (error: unknown) {
    console.error("Error sending message:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}