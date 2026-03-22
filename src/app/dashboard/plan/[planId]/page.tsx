import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import dbConnect, { withTimeout } from "@/lib/mongoose";
import CarePlan from "@/models/CarePlan";
import CarePlanCard from "@/components/CarePlanCard";
import PlanTabs from "@/components/PlanTabs";
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

  let plan;
  try {
    await withTimeout(dbConnect(), 8000);
    
    // Find the specific plan, verifying the user is authorized to see it
    plan = await withTimeout(
      CarePlan.findOne({
        _id: planId,
        $or: [
          { coordinatorId: session.user.sub },
          { caregiverIds: session.user.sub },
        ],
      })
        .select("-documents.data -audioBriefings -explanationCache")
        .lean(),
      5000
    );
  } catch (e) {
    console.error('[PlanPage] DB error:', (e as Error).message);
    return (
      <div className="w-full mx-auto space-y-6 p-8">
        <a href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={16} /> Back to Dashboard
        </a>
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <h1 className="text-xl font-bold text-slate-800 mb-2">Connection Error</h1>
          <p className="text-slate-500 mb-4">Unable to load this care plan. Please try again.</p>
          <a href={`/dashboard/plan/${planId}`} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Retry</a>
        </div>
      </div>
    );
  }

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
      <a 
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </a>

      <PlanTabs planId={planId} activeTab="overview" />
      
      <CarePlanCard plan={serialized} currentUserId={session.user.sub} />
    </div>
  );
}
