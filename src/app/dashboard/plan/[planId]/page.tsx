import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import dbConnect, { withTimeout } from "@/lib/mongoose";
import CarePlan from "@/models/CarePlan";
import CarePlanCard from "@/components/CarePlanCard";
import PlanTabs from "@/components/PlanTabs";
import { getServerT, LanguageCode } from "@/translations";
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

  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value as LanguageCode) || "en";
  const t = getServerT(locale);

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
      <div style={{ width: '100%', marginLeft: 'auto', marginRight: 'auto', padding: '2rem' }}>
        <a href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#64748b', textDecoration: 'none', marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> {t("backToDashboard")}
        </a>
        <div style={{ backgroundColor: '#ffffff', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>{t("connectionError")}</h1>
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>{t("unableToLoadPlan")}</p>
          <a href={`/dashboard/plan/${planId}`} style={{ display: 'inline-block', backgroundColor: '#0d9488', color: '#ffffff', padding: '0.5rem 1rem', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 500 }}>{t("retry")}</a>
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
    <div style={{ width: '100%', marginLeft: 'auto', marginRight: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <a 
        href="/dashboard"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#64748b', textDecoration: 'none' }}
      >
        <ArrowLeft size={16} /> {t("backToDashboard")}
      </a>

      <PlanTabs planId={planId} activeTab="overview" />
      
      <CarePlanCard plan={serialized} currentUserId={session.user.sub} />
    </div>
  );
}
