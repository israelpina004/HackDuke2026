"use client";

import { useLanguage } from "@/translations/LanguageContext";
import { ClipboardList, ArrowRight, Pill, AlertTriangle, Heart } from "lucide-react";
import Link from "next/link";

interface CarePlanData {
  _id: string;
  patientName: string;
  medications: { name: string; dosage: string; frequency: string; confidence: string }[];
  redFlags: { issue: string; confidence: string }[];
  careInstructions: { instruction: string; confidence: string }[];
}

export default function CaregiverDashboard({ plans }: { plans: CarePlanData[] }) {
  const { t } = useLanguage();

  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-20">
        <ClipboardList className="h-16 w-16 text-slate-300" />
        <p className="text-slate-500 text-lg text-center">{t("noPlansCaregiver")}</p>
        <Link
          href="/link"
          className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors active:scale-[0.98]"
        >
          {t("joinPlanBtn")} <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {plans.map((plan) => (
        <div key={plan._id} className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-slate-800">
            {t("patient")}: {plan.patientName}
          </h2>

          {/* Medications */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-blue-500 p-5">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Pill size={18} className="text-blue-500" /> {t("medications")}
            </h3>
            {plan.medications.length === 0 ? (
              <p className="text-sm text-slate-400">—</p>
            ) : (
              <ul className="space-y-2">
                {plan.medications.map((med, i) => (
                  <li key={i} className="flex items-start justify-between text-sm">
                    <div>
                      <span className="font-medium text-slate-700">{med.name}</span>
                      <span className="text-slate-400 ml-2">{med.dosage} · {med.frequency}</span>
                    </div>
                    <ConfidenceBadge level={med.confidence} t={t} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Red Flags */}
          {plan.redFlags.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-red-500 p-5">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500" /> {t("redFlags")}
              </h3>
              <ul className="space-y-2">
                {plan.redFlags.map((flag, i) => (
                  <li key={i} className="flex items-start justify-between text-sm">
                    <span className="text-slate-700">{flag.issue}</span>
                    <ConfidenceBadge level={flag.confidence} t={t} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Care Instructions */}
          {plan.careInstructions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-green-500 p-5">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Heart size={18} className="text-green-500" /> {t("careInstructions")}
              </h3>
              <ul className="space-y-2">
                {plan.careInstructions.map((ci, i) => (
                  <li key={i} className="flex items-start justify-between text-sm">
                    <span className="text-slate-700">{ci.instruction}</span>
                    <ConfidenceBadge level={ci.confidence} t={t} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ConfidenceBadge({ level, t }: { level: string; t: (key: string) => string }) {
  const styles: Record<string, string> = {
    High: "bg-green-50 text-green-700 border-green-200",
    Medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
    Low: "bg-red-50 text-red-700 border-red-200",
  };
  const keys: Record<string, string> = {
    High: "highConfidence",
    Medium: "mediumConfidence",
    Low: "lowConfidence",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${styles[level] || styles.High}`}>
      {t(keys[level] || "highConfidence")}
    </span>
  );
}
