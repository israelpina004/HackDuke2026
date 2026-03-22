"use client";

import { useState, useRef } from "react";
import { useLanguage } from "@/translations/LanguageContext";
import { Upload, FileText } from "lucide-react";
import CarePlanCard, { CarePlanData } from "./CarePlanCard";

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
        <div className="flex flex-col gap-10">
          {plans.map((plan) => (
            <div key={plan._id} className="pb-10 border-b border-slate-200 last:border-0 last:pb-0">
              <CarePlanCard plan={plan} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
