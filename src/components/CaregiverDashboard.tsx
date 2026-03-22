"use client";

import { useState, useRef } from "react";
import { useLanguage } from "@/translations/LanguageContext";
import { ClipboardList, ArrowRight, Upload } from "lucide-react";
import Link from "next/link";
import CarePlanCard, { CarePlanData } from "./CarePlanCard";

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
    <div className="flex flex-col gap-6">
      {/* Top Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">{t("welcome")}</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/link"
            className="inline-flex items-center gap-2 bg-white text-blue-600 font-semibold px-4 py-2.5 rounded-xl border border-blue-200 hover:bg-blue-50 transition-colors text-sm"
          >
            {t("joinPlanBtn")} <ArrowRight size={16} />
          </Link>
          <label className="cursor-pointer inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors active:scale-[0.98] text-sm">
            <Upload size={16} />
            {uploading ? t("uploading") : t("uploadDocs")}
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
      </div>

      {successMsg && (
        <div className="bg-green-50 text-green-700 text-sm font-medium py-3 px-4 rounded-lg border border-green-100">
          {successMsg}
        </div>
      )}

      {/* Empty State */}
      {plans.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-6 py-20">
          <ClipboardList className="h-16 w-16 text-slate-300" />
          <p className="text-slate-500 text-lg text-center">{t("noPlansCaregiver")}</p>
        </div>
      )}

      {/* Plans */}
      {plans.map((plan) => (
        <CarePlanCard key={plan._id} plan={plan} />
      ))}
    </div>
  );
}
