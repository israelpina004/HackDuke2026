"use client";

import { useState, useRef } from "react";
import { useLanguage } from "@/translations/LanguageContext";
import { Upload, FileText, Copy, Check, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
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
            accept=".pdf,.jpg,.jpeg,.png,.heic,image/*"
            multiple
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div key={plan._id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className="p-5 flex-1 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">{plan.patientName}</h3>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                      <Users size={14} /> {plan.caregiverIds?.length || 0} Caregivers connected
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 mt-auto">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t("inviteCodeLabel")}:</span>
                  <code className="font-mono font-bold text-blue-600 tracking-widest text-sm flex-1">{plan.inviteCode}</code>
                  <button
                    onClick={(e) => { e.preventDefault(); plan.inviteCode && copyCode(plan.inviteCode, plan._id); }}
                    className="text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {copiedId === plan._id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-50 border-t border-slate-100 p-3">
                <Link 
                  href={`/dashboard/plan/${plan._id}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium rounded-lg transition-colors text-sm"
                >
                  {t("viewPlan") || "View Full Plan"} <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
