import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/mongoose";
import CarePlan from "@/models/CarePlan";
import CarePlanCard from "@/components/CarePlanCard";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PlanMedication {
  name: string;
  dosage: string;
  frequency: string;
  confidence: string;
}

interface PlanRedFlag {
  issue: string;
  confidence: string;
}

interface PlanInstruction {
  instruction: string;
  confidence: string;
}

interface PlanDocument {
  mimeType?: string;
}

export default async function PlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const session = await auth0.getSession();
  if (!session?.user) redirect("/");

  const { planId } = await params;

  await dbConnect();
  
  // Find the specific plan, verifying the user is authorized to see it
  const plan = await CarePlan.findOne({
    _id: planId,
    $or: [
      { coordinatorId: session.user.sub },
      { caregiverIds: session.user.sub },
    ],
  })
    .select("-documents.data")
    .lean();

  if (!plan) {
    redirect("/dashboard");
  }

  const serialized = {
    _id: plan._id.toString(),
    patientName: plan.patientName,
    inviteCode: plan.inviteCode,
    caregiverIds: plan.caregiverIds || [],
    coordinatorId: plan.coordinatorId || "",
    createdByRole: plan.createdByRole || "Coordinator",
    originalLanguage: plan.originalLanguage || "en",
    contactInfo: plan.contactInfo || {},
    medications: (plan.medications || []).map((m: PlanMedication) => ({
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      confidence: m.confidence,
    })),
    redFlags: (plan.redFlags || []).map((r: PlanRedFlag) => ({
      issue: r.issue,
      confidence: r.confidence,
    })),
    careInstructions: (plan.careInstructions || []).map((c: PlanInstruction) => ({
      instruction: c.instruction,
      confidence: c.confidence,
    })),
    documents: (plan.documents || []).map((d: PlanDocument) => ({
      mimeType: d.mimeType || "application/pdf",
    })),
    notes: plan.notes || "",
  };

  return (
    <div className="w-full mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link 
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>
      
      <CarePlanCard plan={serialized} currentUserId={session.user.sub} />
    </div>
  );
}
