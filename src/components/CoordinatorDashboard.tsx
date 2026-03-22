"use client";

import { useState, useRef } from "react";
import { useLanguage } from "@/translations/LanguageContext";
import { Upload, Copy, Check, FileText, Users } from "lucide-react";

interface CarePlanSummary {
  _id: string;
  patientName: string;
  inviteCode: string;
  caregiverIds: string[];
  medications: { name: string }[];
  createdAt: string;
}

export default function CoordinatorDashboard({ plans: initialPlans }: { plans: CarePlanSummary[] }) {
  const { t, language } = useLanguage();
  const [plans, setPlans] = useState<CarePlanSummary[]>(initialPlans);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setSuccessMsg("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("targetLanguage", language);

    try {
      const res = await fetch("/api/parse-pdf", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      setPlans((prev) => [data.carePlan, ...prev]);
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
    <div className="flex flex-col gap-6">
      {/* Upload Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{t("yourPlans")}</h1>
        <label className="cursor-pointer inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors active:scale-[0.98]">
          <Upload size={18} />
          {uploading ? t("uploading") : t("createPlan")}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {successMsg && (
        <div className="bg-green-50 text-green-700 text-sm font-medium py-3 px-4 rounded-lg border border-green-100">
          {successMsg}
        </div>
      )}

      {/* Plans List */}
      {plans.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-500">{t("noPlansCoord")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <div key={plan._id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{t("patient")}</p>
                  <h3 className="text-lg font-bold text-slate-800">{plan.patientName}</h3>
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-500">
                  <Users size={14} />
                  <span>{plan.caregiverIds.length}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                <span className="text-xs font-medium text-slate-500">{t("inviteCodeLabel")}:</span>
                <code className="font-mono font-bold text-blue-600 tracking-widest text-sm flex-1">{plan.inviteCode}</code>
                <button
                  onClick={() => copyCode(plan.inviteCode, plan._id)}
                  className="text-slate-400 hover:text-blue-600 transition-colors"
                  title="Copy"
                >
                  {copiedId === plan._id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>

              <p className="text-xs text-slate-400">
                {plan.medications.length} {t("medications")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
