"use client";

import { useState, useRef } from "react";
import { useLanguage } from "@/translations/LanguageContext";
import { ClipboardList, ArrowRight, Upload } from "lucide-react";
import { CarePlanData } from "./CarePlanCard";

export default function CaregiverDashboard({ plans: initialPlans }: { plans: CarePlanData[] }) {
  const { t, language } = useLanguage();
  const [plans, setPlans] = useState<CarePlanData[]>(initialPlans);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    setSuccessMsg("");

    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      formData.append("files", fileList[i]);
    }
    formData.append("targetLanguage", language);
    formData.append("createdByRole", "Caregiver");

    try {
      const res = await fetch("/api/parse-pdf", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      const newPlan: CarePlanData = {
        _id: data.carePlan._id,
        patientName: data.carePlan.patientName,
        coordinatorId: data.carePlan.coordinatorId || "",
        createdByRole: "Caregiver",
        contactInfo: data.carePlan.contactInfo,
        medications: data.carePlan.medications || [],
        redFlags: data.carePlan.redFlags || [],
        careInstructions: data.carePlan.careInstructions || [],
        documents: (data.carePlan.documents || []).map((d: any) => ({ mimeType: d.mimeType })),
      };
      setPlans((prev) => [newPlan, ...prev]);
      setSuccessMsg(t("planCreated"));
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{t("welcome")}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <a
            href="/link"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#ffffff', color: '#0d9488', fontWeight: 600, padding: '0.625rem 1rem', borderRadius: '0.75rem', border: '1px solid #99f6e4', textDecoration: 'none', fontSize: '0.875rem' }}
          >
            {t("joinPlanBtn")} <ArrowRight size={16} />
          </a>
          <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0d9488', color: '#ffffff', fontWeight: 600, padding: '0.625rem 1rem', borderRadius: '0.75rem', fontSize: '0.875rem' }}>
            <Upload size={16} />
            {uploading ? t("uploading") : t("uploadDocs")}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.heic,image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {successMsg && (
        <div style={{ backgroundColor: '#f0fdf4', color: '#15803d', fontSize: '0.875rem', fontWeight: 500, padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #dcfce7' }}>
          {successMsg}
        </div>
      )}

      {/* Empty State */}
      {plans.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', paddingTop: '5rem', paddingBottom: '5rem' }}>
          <ClipboardList style={{ height: '4rem', width: '4rem', color: '#cbd5e1' }} />
          <p style={{ color: '#64748b', fontSize: '1.125rem', textAlign: 'center' }}>{t("noPlansCaregiver")}</p>
        </div>
      )}

      {/* Plans */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
        {plans.map((plan) => (
          <div key={plan._id} style={{ backgroundColor: '#ffffff', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: '1 1 300px', minWidth: '280px', maxWidth: '420px' }}>
            <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.025em' }}>{plan.patientName}</h3>
                  {plan.createdByRole === "Caregiver" ? (
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '0.125rem 0.5rem', borderRadius: '9999px', marginTop: '0.5rem', display: 'inline-block' }}>
                      {t("selfUploaded")}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, backgroundColor: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4', padding: '0.125rem 0.5rem', borderRadius: '9999px', marginTop: '0.5rem', display: 'inline-block' }}>
                      {t("linkedPlan")}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', padding: '0.75rem' }}>
              <a 
                href={`/dashboard/plan/${plan._id}`}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#334155', fontWeight: 500, borderRadius: '0.5rem', fontSize: '0.875rem', textDecoration: 'none' }}
              >
                {t("viewPlan")} <ArrowRight size={16} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
