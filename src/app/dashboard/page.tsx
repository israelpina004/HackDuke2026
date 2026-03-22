import { auth0 } from "@/lib/auth0";
import { cookies } from "next/headers";
import dbConnect, { withTimeout } from "@/lib/mongoose";
import User from "@/models/User";
import CarePlan from "@/models/CarePlan";
import { getServerT, LanguageCode } from "@/translations";
import CoordinatorDashboard from "@/components/CoordinatorDashboard";
import CaregiverDashboard from "@/components/CaregiverDashboard";

export default async function DashboardPage() {
  const session = await auth0.getSession();
  if (!session?.user) return null;

  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value as LanguageCode) || "en";
  const t = getServerT(locale);

  let dbUser;
  try {
    await withTimeout(dbConnect(), 8000);
    dbUser = await withTimeout(User.findOne({ auth0Id: session.user.sub }).lean(), 5000);
  } catch (e) {
    console.error('[DashboardPage] DB error:', (e as Error).message);
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: '28rem', border: '1px solid #e2e8f0' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>{t("connectionError")}</h1>
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>{t("unableToLoadDashboard")}</p>
          <a href="/dashboard" style={{ display: 'inline-block', backgroundColor: '#0d9488', color: '#ffffff', padding: '0.5rem 1rem', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 500 }}>{t("retry")}</a>
        </div>
      </div>
    );
  }
  if (!dbUser) return null;

  try {
    if (dbUser.role === "Coordinator") {
      const plans = await withTimeout(
        CarePlan.find({ coordinatorId: session.user.sub })
          .select('-documents.data -audioBriefings -explanationCache -translations')
          .sort({ createdAt: -1 })
          .lean(),
        5000
      );

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

    // Caregiver: fetch plans they are linked to OR self-created
    const plans = await withTimeout(
      CarePlan.find({
        $or: [
          { caregiverIds: session.user.sub },
          { coordinatorId: session.user.sub, createdByRole: "Caregiver" },
        ],
      })
        .select('-documents.data -audioBriefings -explanationCache -translations')
        .sort({ createdAt: -1 })
        .lean(),
      5000
    );

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
  } catch (e) {
    console.error('[DashboardPage] query error:', (e as Error).message);
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: '28rem', border: '1px solid #e2e8f0' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>{t("errorLoadingPlans")}</h1>
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>{t("somethingWentWrong")}</p>
          <a href="/dashboard" style={{ display: 'inline-block', backgroundColor: '#0d9488', color: '#ffffff', padding: '0.5rem 1rem', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 500 }}>{t("retry")}</a>
        </div>
      </div>
    );
  }
}
