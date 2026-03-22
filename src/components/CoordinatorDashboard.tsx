"use client";

import { useState, useRef } from "react";
import { useLanguage } from "@/translations/LanguageContext";
import { Upload, FileText, Copy, Check, Users, ArrowRight } from "lucide-react";
import { CarePlanData } from "./CarePlanCard";

export default function CoordinatorDashboard({ plans: initialPlans }: { plans: CarePlanData[] }) {
  const { t, language } = useLanguage();
  const [plans, setPlans] = useState<CarePlanData[]>(initialPlans);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
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
    formData.append("createdByRole", "Coordinator");

    try {
      const res = await fetch("/api/parse-pdf", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      const newPlan: CarePlanData = {
        ...data.carePlan,
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

  const copyCode = (code: string, planId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(planId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Upload Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{t("yourPlans")}</h1>
        <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0d9488', color: '#ffffff', fontWeight: 600, padding: '0.625rem 1.25rem', borderRadius: '0.75rem', fontSize: '0.875rem' }}>
          <Upload size={18} />
          {uploading ? t("uploading") : t("createPlan")}
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

      {successMsg && (
        <div style={{ backgroundColor: '#f0fdf4', color: '#15803d', fontSize: '0.875rem', fontWeight: 500, padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #dcfce7' }}>
          {successMsg}
        </div>
      )}

      {/* Plans List */}
      {plans.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', padding: '3rem', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <FileText style={{ marginLeft: 'auto', marginRight: 'auto', height: '3rem', width: '3rem', color: '#cbd5e1', marginBottom: '1rem' }} />
          <p style={{ color: '#64748b' }}>{t("noPlansCoord")}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
          {plans.map((plan) => (
            <div key={plan._id} style={{ backgroundColor: '#ffffff', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: '1 1 300px', minWidth: '280px', maxWidth: '420px' }}>
              <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.025em' }}>{plan.patientName}</h3>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                      <Users size={14} /> {plan.caregiverIds?.length || 0} {t("caregiversConnected")}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', border: '1px solid #f1f5f9', marginTop: 'auto' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t("inviteCodeLabel")}:</span>
                  <code style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0d9488', letterSpacing: '0.1em', fontSize: '0.875rem', flex: 1 }}>{plan.inviteCode}</code>
                  <button
                    onClick={(e) => { e.preventDefault(); plan.inviteCode && copyCode(plan.inviteCode, plan._id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.25rem' }}
                  >
                    {copiedId === plan._id ? <Check size={16} style={{ color: '#22c55e' }} /> : <Copy size={16} />}
                  </button>
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
      )}
    </div>
  );
}
