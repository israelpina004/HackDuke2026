import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import dbConnect, { withTimeout } from "@/lib/mongoose";
import CarePlan from "@/models/CarePlan";
import Message from "@/models/Message";
import User from "@/models/User";

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

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
  translations?: Map<string, string> | Record<string, string>;
  createdAt: Date;
};

type LeanUser = {
  auth0Id: string;
  name: string;
  preferredLanguage?: string;
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  zh: "Chinese",
  ko: "Korean",
  hi: "Hindi",
  ru: "Russian",
};

function stripFences(text: string) {
  return text.replace(/```(?:json|text)?\n?/g, "").replace(/```\n?/g, "").trim();
}

function getCachedTranslation(message: LeanMessage, language: string) {
  if (!message.translations) {
    return null;
  }

  if (message.translations instanceof Map) {
    return message.translations.get(language) || null;
  }

  return message.translations[language] || null;
}

async function translateMessagesBatch(messages: Array<{ id: string; content: string }>, targetLanguage: string) {
  if (!messages.length) {
    return new Map<string, string>();
  }

  if (!genAI) {
    throw new Error("Message translation is not configured.");
  }

  const targetLanguageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await withTimeout(
    model.generateContent(`Translate each message in the JSON array below into ${targetLanguageName}.
Preserve medical meaning, tone, and urgency.
Keep each id exactly unchanged.
If a message is already in ${targetLanguageName}, return it unchanged.
Return ONLY valid JSON as an array of objects with exactly these keys: id, translatedContent.

${JSON.stringify(messages)}`),
    15000
  );

  const payload = JSON.parse(stripFences(result.response.text())) as Array<{ id?: string; translatedContent?: string }>;
  const translations = new Map<string, string>();

  for (const item of payload) {
    if (item.id && typeof item.translatedContent === "string" && item.translatedContent.trim()) {
      translations.set(item.id, item.translatedContent.trim());
    }
  }

  return translations;
}

async function translateMessageToEnglish(content: string) {
  if (!genAI) {
    throw new Error("Message translation is not configured.");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await withTimeout(
    model.generateContent(`Translate the following care-team message into clear natural English.
Preserve the medical meaning, urgency, and tone.
If the message is already in English, return it unchanged.
Return ONLY the translated message text with no quotes or markdown.

Message:
${content}`),
    12000
  );

  const translated = stripFences(result.response.text());

  if (!translated) {
    throw new Error("Failed to translate message to English.");
  }

  return translated;
}

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

function serializeMessage(
  message: LeanMessage,
  userMap: Map<string, string>,
  currentUserId: string,
  viewerLanguage: string
) {
  const translatedContent =
    viewerLanguage !== "en"
      ? getCachedTranslation(message, viewerLanguage)
      : null;

  return {
    _id: message._id.toString(),
    senderId: message.senderId,
    senderName: userMap.get(message.senderId) || "Care Team",
    receiverId: message.receiverId,
    receiverName: userMap.get(message.receiverId) || "Care Team",
    content: translatedContent || message.content,
    originalContent: translatedContent ? message.content : undefined,
    isTranslated: Boolean(translatedContent),
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
      User.find({ auth0Id: { $in: userIds } }).select("auth0Id name preferredLanguage").lean(),
      5000
    )) as LeanUser[];

    const currentUser = users.find((user) => user.auth0Id === userId);
    const viewerLanguage = currentUser?.preferredLanguage || "en";

    if (viewerLanguage !== "en") {
      const missingTranslations = messages
        .filter((message) => !getCachedTranslation(message, viewerLanguage))
        .map((message) => ({ id: message._id.toString(), content: message.content }));

      if (missingTranslations.length > 0) {
        try {
          const translatedMessages = await translateMessagesBatch(missingTranslations, viewerLanguage);

          if (translatedMessages.size > 0) {
            const translationWrites = messages.flatMap((message) => {
              const translatedContent = translatedMessages.get(message._id.toString());
              if (!translatedContent) {
                return [];
              }

              return [{
                updateOne: {
                  filter: { _id: message._id },
                  update: { $set: { [`translations.${viewerLanguage}`]: translatedContent } },
                },
              }];
            });

            await Message.bulkWrite(
              translationWrites,
              { ordered: false }
            );

            for (const message of messages) {
              const translatedContent = translatedMessages.get(message._id.toString());
              if (!translatedContent) {
                continue;
              }

              const nextTranslations = message.translations instanceof Map
                ? Object.fromEntries(message.translations)
                : { ...(message.translations || {}) };
              nextTranslations[viewerLanguage] = translatedContent;
              message.translations = nextTranslations;
            }
          }
        } catch (translationError) {
          console.error("Error translating messages:", translationError);
        }
      }
    }

    const userMap = new Map(users.map((user) => [user.auth0Id, user.name]));

    return NextResponse.json({
      messages: messages.map((message) => serializeMessage(message, userMap, userId, viewerLanguage)),
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
    const translateToEnglish = body.translateToEnglish === true;
    const requestedRecipientId = typeof body.recipientId === "string" ? body.recipientId : undefined;
    const localizedContent = typeof body.localizedContent === "string" ? body.localizedContent.trim() : "";
    const sourceLanguage = typeof body.sourceLanguage === "string" ? body.sourceLanguage.trim() : "";
    const viewerLanguage = typeof body.viewerLanguage === "string" ? body.viewerLanguage.trim() : "en";

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

    const outboundContent = translateToEnglish ? await translateMessageToEnglish(content) : content;

    if (!outboundContent) {
      return NextResponse.json({ error: "Failed to translate message to English." }, { status: 500 });
    }

    if (outboundContent.length > 2000) {
      return NextResponse.json({ error: "Translated message is too long." }, { status: 400 });
    }

    // Run the write and the user lookup in parallel to cut latency
    const [createdMessage, users] = await withTimeout(
      Promise.all([
        Message.create({
          carePlanId: planId,
          senderId: userId,
          receiverId: recipientId,
          content: outboundContent,
          translations:
            translateToEnglish && sourceLanguage !== "en" && localizedContent
              ? { [sourceLanguage]: localizedContent }
              : {},
        }),
        User.find({ auth0Id: { $in: [userId, recipientId] } }).select("auth0Id name").lean() as Promise<LeanUser[]>,
      ]),
      10000
    );
    const userMap = new Map(users.map((user) => [user.auth0Id, user.name]));

    return NextResponse.json({
      message: serializeMessage(createdMessage as LeanMessage, userMap, userId, viewerLanguage),
    });
  } catch (error: unknown) {
    console.error("Error sending message:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}