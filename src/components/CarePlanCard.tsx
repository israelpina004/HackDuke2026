"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/translations/LanguageContext";
import { Pill, AlertTriangle, Heart, Building2, Phone, FileText, Image as ImageIcon, X, Copy, Check, Users, Loader2 } from "lucide-react";

interface ContactInfo {
  name?: string;
  phone?: string;
  facility?: string;
}

export interface CarePlanData {
  _id: string;
  patientName: string;
  inviteCode?: string;
  caregiverIds?: string[];
  createdByRole: string;
  originalLanguage?: string;
  contactInfo?: ContactInfo;
  medications: { name: string; dosage: string; frequency: string; confidence: string }[];
  redFlags: { issue: string; confidence: string }[];
  careInstructions: { instruction: string; confidence: string }[];
  documents: { mimeType: string }[];
}

export default function CarePlanCard({ plan }: { plan: CarePlanData }) {
  const { t, language } = useLanguage();
  const [showDocs, setShowDocs] = useState(false);
  const [copied, setCopied] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translated, setTranslated] = useState<{
    medications: CarePlanData["medications"];
    redFlags: CarePlanData["redFlags"];
    careInstructions: CarePlanData["careInstructions"];
  } | null>(null);

  // Auto-translate when language changes
  useEffect(() => {
    const origLang = plan.originalLanguage || "en";
    if (language === origLang) {
      setTranslated(null);
      return;
    }
    let cancelled = false;
    setTranslating(true);
    fetch("/api/translate-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan._id, targetLanguage: language }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.medications) {
          setTranslated({
            medications: data.medications,
            redFlags: data.redFlags,
            careInstructions: data.careInstructions,
          });
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setTranslating(false); });
    return () => { cancelled = true; };
  }, [language, plan._id, plan.originalLanguage]);

  // Use translated data if available, otherwise original
  const meds = translated?.medications || plan.medications;
  const flags = translated?.redFlags || plan.redFlags;
  const instructions = translated?.careInstructions || plan.careInstructions;

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-800">
            {t("patient")}: {plan.patientName}
          </h2>
          {plan.createdByRole === "Caregiver" && (
            <span className="text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
              {t("selfUploaded")}
            </span>
          )}
        </div>
        
        {plan.documents?.length > 0 && (
          <button
            onClick={() => setShowDocs(true)}
            className="text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors"
          >
            <FileText size={16} /> {t("viewDocuments")} ({plan.documents.length})
          </button>
        )}
      </div>

      {/* Invite Code (for Coordinators) */}
      {plan.inviteCode && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t("inviteCodeLabel")}:</span>
            <code className="font-mono font-bold text-blue-600 tracking-widest text-sm bg-white px-2 py-1 rounded border border-slate-200">
              {plan.inviteCode}
            </code>
            <button
              onClick={() => plan.inviteCode && copyCode(plan.inviteCode)}
              className="text-slate-400 hover:text-blue-600 transition-colors ml-2"
              title="Copy"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>
          <div className="flex items-center gap-1 text-sm text-slate-500">
            <Users size={14} />
            <span>{plan.caregiverIds?.length || 0} Caregivers</span>
          </div>
        </div>
      )}

      {/* Contact Info */}
      {plan.createdByRole === "Caregiver" && plan.contactInfo && (
        <ContactCard contactInfo={plan.contactInfo} t={t} />
      )}

      {/* Medications */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-blue-500 p-5">
        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Pill size={18} className="text-blue-500" /> {t("medications")}
          {translating && <Loader2 size={14} className="animate-spin text-slate-400" />}
        </h3>
        {meds?.length === 0 ? (
          <p className="text-sm text-slate-400">—</p>
        ) : (
          <ul className="space-y-2">
            {meds?.map((med, i) => (
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
      {flags?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-red-500 p-5">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" /> {t("redFlags")}
          </h3>
          <ul className="space-y-2">
            {flags.map((flag, i) => (
              <li key={i} className="flex items-start justify-between text-sm">
                <span className="text-slate-700">{flag.issue}</span>
                <ConfidenceBadge level={flag.confidence} t={t} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Care Instructions */}
      {instructions?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-green-500 p-5">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Heart size={18} className="text-green-500" /> {t("careInstructions")}
          </h3>
          <ul className="space-y-2">
            {instructions.map((ci, i) => (
              <li key={i} className="flex items-start justify-between text-sm">
                <span className="text-slate-700">{ci.instruction}</span>
                <ConfidenceBadge level={ci.confidence} t={t} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Document Viewer Modal */}
      {showDocs && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 lg:p-12 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl flex flex-col max-h-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <FileText size={20} className="text-blue-600" /> {t("viewDocuments")}
              </h3>
              <button
                onClick={() => setShowDocs(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 flex flex-col gap-8">
              {plan.documents.map((doc, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    {doc.mimeType.startsWith('image/') ? <ImageIcon size={16} /> : <FileText size={16} />}
                    {t("document")} {i + 1}
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex items-center justify-center min-h-[300px]">
                    {doc.mimeType.startsWith('image/') ? (
                      <img 
                        src={`/api/documents/${plan._id}/${i}`} 
                        alt={`Document ${i+1}`}
                        className="max-w-full h-auto object-contain"
                      />
                    ) : (
                      <iframe 
                        src={`/api/documents/${plan._id}/${i}`} 
                        className="w-full h-[70vh] border-0"
                        title={`Document ${i+1}`}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContactCard({ contactInfo, t }: { contactInfo: ContactInfo; t: (key: string) => string }) {
  const hasInfo = contactInfo.name || contactInfo.phone || contactInfo.facility;
  if (!hasInfo) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
        {t("noCoordinator")}
      </div>
    );
  }
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap gap-4 text-sm">
      {contactInfo.facility && (
        <div className="flex items-center gap-2 text-slate-600">
          <Building2 size={14} className="text-slate-400" />
          <span className="font-medium">{t("facility")}:</span> {contactInfo.facility}
        </div>
      )}
      {contactInfo.name && (
        <div className="flex items-center gap-2 text-slate-600">
          <span className="font-medium">{t("contactDoctor")}:</span> {contactInfo.name}
        </div>
      )}
      {contactInfo.phone && (
        <a href={`tel:${contactInfo.phone}`} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium">
          <Phone size={14} /> {contactInfo.phone}
        </a>
      )}
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
