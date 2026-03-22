import { auth0 } from "@/lib/auth0";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import CarePlan from "@/models/CarePlan";
import CoordinatorDashboard from "@/components/CoordinatorDashboard";
import CaregiverDashboard from "@/components/CaregiverDashboard";

export default async function DashboardPage() {
  const session = await auth0.getSession();
  if (!session?.user) return null;

  await dbConnect();
  const dbUser = await User.findOne({ auth0Id: session.user.sub });
  if (!dbUser) return null;

  if (dbUser.role === "Coordinator") {
    // Fetch all plans this coordinator owns, excluding the large Base64 document payload
    const plans = await CarePlan.find({ coordinatorId: session.user.sub })
      .select('-documents.data')
      .sort({ createdAt: -1 })
      .lean();

    const serialized = plans.map((p: any) => ({
      _id: p._id.toString(),
      patientName: p.patientName,
      inviteCode: p.inviteCode,
      caregiverIds: p.caregiverIds || [],
      coordinatorId: p.coordinatorId || "",
      createdByRole: p.createdByRole || "Coordinator",
      originalLanguage: p.originalLanguage || "en",
      contactInfo: p.contactInfo || {},
      medications: (p.medications || []).map((m: any) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        confidence: m.confidence,
      })),
      redFlags: (p.redFlags || []).map((r: any) => ({
        issue: r.issue,
        confidence: r.confidence,
      })),
      careInstructions: (p.careInstructions || []).map((c: any) => ({
        instruction: c.instruction,
        confidence: c.confidence,
      })),
      documents: (p.documents || []).map((d: any) => ({
        mimeType: d.mimeType || 'application/pdf',
      })),
      createdAt: p.createdAt?.toISOString?.() || "",
    }));

    return <CoordinatorDashboard plans={serialized} />;
  }

  // Caregiver: fetch plans they are linked to OR self-created, excluding Base64 payload
  const plans = await CarePlan.find({
    $or: [
      { caregiverIds: session.user.sub },
      { coordinatorId: session.user.sub, createdByRole: "Caregiver" },
    ],
  })
    .select('-documents.data')
    .sort({ createdAt: -1 })
    .lean();

  const serialized = plans.map((p: any) => ({
    _id: p._id.toString(),
    patientName: p.patientName,
    coordinatorId: p.coordinatorId || "",
    createdByRole: p.createdByRole || "Coordinator",
    originalLanguage: p.originalLanguage || "en",
    contactInfo: p.contactInfo || {},
    medications: (p.medications || []).map((m: any) => ({
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      confidence: m.confidence,
    })),
    redFlags: (p.redFlags || []).map((r: any) => ({
      issue: r.issue,
      confidence: r.confidence,
    })),
    careInstructions: (p.careInstructions || []).map((c: any) => ({
      instruction: c.instruction,
      confidence: c.confidence,
    })),
    documents: (p.documents || []).map((d: any) => ({
      mimeType: d.mimeType || 'application/pdf',
    })),
  }));

  return <CaregiverDashboard plans={serialized} />;
}
