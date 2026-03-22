"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/translations/LanguageContext";
import { Pill, AlertTriangle, Heart, Building2, Phone, FileText, Image as ImageIcon, X, Copy, Check, Users, Loader2, Volume2 } from "lucide-react";

interface ContactInfo {
  name?: string;
  phone?: string;
  facility?: string;
}

interface AudioErrorResponse {
  error?: string;
}

export interface CarePlanData {
  _id: string;
  patientName: string;
  inviteCode?: string;
  caregiverIds?: string[];
  coordinatorId: string;
  createdByRole: string;
  originalLanguage?: string;
  contactInfo?: ContactInfo;
  notes?: string;
  medications: { name: string; dosage: string; frequency: string; confidence: string }[];
  redFlags: { issue: string; confidence: string }[];
  careInstructions: { instruction: string; confidence: string }[];
  documents: { mimeType: string }[];
}

export default function CarePlanCard({ plan, currentUserId }: { plan: CarePlanData; currentUserId?: string }) {
  const { t, language } = useLanguage();
  const [showDocs, setShowDocs] = useState(false);
  const [copied, setCopied] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Translation State
  const [translating, setTranslating] = useState(false);
  const [translated, setTranslated] = useState<{
    medications: CarePlanData["medications"];
    redFlags: CarePlanData["redFlags"];
    careInstructions: CarePlanData["careInstructions"];
  } | null>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<CarePlanData>(plan);
  const canEdit = currentUserId && (currentUserId === plan.coordinatorId);

  // Auto-translate only if we are NOT in edit mode (we edit the raw original language!)
  useEffect(() => {
    if (isEditing) {
      setTranslated(null);
      return;
    }
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
  }, [isEditing, language, plan._id, plan.originalLanguage]);

  useEffect(() => {
    if (!audioUrl || !audioRef.current) {
      return;
    }

    audioRef.current.play().catch(() => {});
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Use translated data if available, otherwise original
  const meds = translated?.medications || plan.medications;
  const flags = translated?.redFlags || plan.redFlags;
  const instructions = translated?.careInstructions || plan.careInstructions;

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/plan/${plan._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        window.location.reload(); // Quick refresh to re-render server component with new data
      } else {
        alert("Failed to save plan. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving plan.");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAudio = async () => {
    setGeneratingAudio(true);
    setAudioError(null);

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    try {
      const response = await fetch("/api/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan._id, language }),
      });

      if (!response.ok) {
        let message = t("audioError");
        try {
          const payload = (await response.json()) as AudioErrorResponse;
          if (payload?.error) {
            message = payload.error;
          }
        } catch {}
        throw new Error(message);
      }

      const blob = await response.blob();
      const nextAudioUrl = URL.createObjectURL(blob);
      setAudioUrl(nextAudioUrl);
    } catch (error: unknown) {
      setAudioError(error instanceof Error ? error.message : t("audioError"));
    } finally {
      setGeneratingAudio(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-800">
            {t("patient")}: {isEditing ? (
              <input 
                value={editData.patientName} 
                onChange={e => setEditData({...editData, patientName: e.target.value})}
                className="ml-2 appearance-none border-2 border-slate-300 rounded px-2 py-1 text-base font-semibold w-56 text-slate-900 bg-white shadow-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
              />
            ) : plan.patientName}
          </h2>
          {plan.createdByRole === "Caregiver" && (
            <span className="text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
              {t("selfUploaded")}
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          {plan.documents?.length > 0 && !isEditing && (
            <button
              onClick={() => setShowDocs(true)}
              className="text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors"
            >
              <FileText size={16} /> {t("viewDocuments")} ({plan.documents.length})
            </button>
          )}
          {canEdit && !isEditing && (
            <button
              onClick={() => { setEditData(plan); setIsEditing(true); }}
              className="text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-1.5 rounded-lg transition-colors"
            >
              {t("editPlan") || "Edit Plan"}
            </button>
          )}
          {isEditing && (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-4 py-1.5 rounded-lg transition-colors"
              >
                {t("cancel") || "Cancel"}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "..." : (t("savePlan") || "Save Plan")}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleGenerateAudio}
            disabled={generatingAudio}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generatingAudio ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Volume2 size={16} />
            )}
            {generatingAudio ? t("generatingAudio") : t("audioBriefing")}
          </button>

          {audioError && (
            <p className="text-sm text-red-600">{audioError}</p>
          )}
        </div>

        {audioUrl && (
          <audio
            ref={audioRef}
            controls
            preload="metadata"
            src={audioUrl}
            className="w-full max-w-xl"
          />
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
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Pill size={18} className="text-blue-500" /> {t("medications")}
            {translating && <Loader2 size={14} className="animate-spin text-slate-400" />}
          </h3>
          {isEditing && (
            <button 
              onClick={() => setEditData({...editData, medications: [...editData.medications, { name: "New Med", dosage: "", frequency: "", confidence: "High" }]})}
              className="text-xs text-blue-600 font-medium hover:underline"
            >
              + Add
            </button>
          )}
        </div>
        
        {isEditing ? (
          <ul className="space-y-3">
            {editData.medications.map((med, i) => (
              <li key={i} className="flex flex-wrap gap-2 items-start border-b border-slate-100 pb-3">
                <input className="appearance-none border-2 border-slate-300 rounded px-2 py-1.5 text-sm font-medium flex-1 min-w-[120px] text-slate-900 bg-white shadow-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-400" value={med.name} onChange={e => {
                  const m = [...editData.medications]; m[i].name = e.target.value; setEditData({...editData, medications: m});
                }} placeholder="Name" />
                <input className="appearance-none border-2 border-slate-300 rounded px-2 py-1.5 text-sm font-medium w-24 text-slate-900 bg-white shadow-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-400" value={med.dosage} onChange={e => {
                  const m = [...editData.medications]; m[i].dosage = e.target.value; setEditData({...editData, medications: m});
                }} placeholder="Dosage" />
                <input className="appearance-none border-2 border-slate-300 rounded px-2 py-1.5 text-sm font-medium w-32 text-slate-900 bg-white shadow-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-400" value={med.frequency} onChange={e => {
                  const m = [...editData.medications]; m[i].frequency = e.target.value; setEditData({...editData, medications: m});
                }} placeholder="Frequency" />
                <button onClick={() => {
                  const m = [...editData.medications]; m.splice(i, 1); setEditData({...editData, medications: m});
                }} className="text-red-500 hover:text-red-700 p-1"><X size={16}/></button>
              </li>
            ))}
          </ul>
        ) : meds?.length === 0 ? (
          <p className="text-sm text-slate-400">—</p>
        ) : (
          <ul className="space-y-2">
            {meds?.map((med, i) => (
              <li key={i} className="flex gap-4 items-start justify-between text-sm">
                <div className="flex-1 break-words">
                  <span className="font-bold text-slate-900 text-base">{med.name}</span>
                  <span className="text-slate-600 font-medium ml-2 inline-block">{med.dosage} · {med.frequency}</span>
                </div>
                <div className="shrink-0 mt-0.5">
                  <ConfidenceBadge level={med.confidence} t={t} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Red Flags */}
      {(flags?.length > 0 || isEditing) && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-red-500 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" /> {t("redFlags")}
            </h3>
            {isEditing && (
              <button 
                onClick={() => setEditData({...editData, redFlags: [...editData.redFlags, { issue: "New red flag", confidence: "High" }]})}
                className="text-xs text-red-600 font-medium hover:underline"
              >
                + Add
              </button>
            )}
          </div>
          
          {isEditing ? (
            <ul className="space-y-3">
              {editData.redFlags.map((flag, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <input className="appearance-none border-2 border-slate-300 rounded px-2 py-1.5 text-sm font-medium flex-1 text-slate-900 bg-white shadow-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-400" value={flag.issue} onChange={e => {
                    const f = [...editData.redFlags]; f[i].issue = e.target.value; setEditData({...editData, redFlags: f});
                  }} />
                  <button onClick={() => {
                    const f = [...editData.redFlags]; f.splice(i, 1); setEditData({...editData, redFlags: f});
                  }} className="text-red-500 hover:text-red-700 p-1"><X size={16}/></button>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-2">
              {flags.map((flag, i) => (
                <li key={i} className="flex gap-4 items-start justify-between text-sm">
                  <span className="font-semibold text-slate-900 block text-base flex-1 break-words">{flag.issue}</span>
                  <div className="shrink-0 mt-0.5">
                    <ConfidenceBadge level={flag.confidence} t={t} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Care Instructions */}
      {(instructions?.length > 0 || isEditing) && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-green-500 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Heart size={18} className="text-green-500" /> {t("careInstructions")}
            </h3>
            {isEditing && (
              <button 
                onClick={() => setEditData({...editData, careInstructions: [...editData.careInstructions, { instruction: "New instruction", confidence: "High" }]})}
                className="text-xs text-green-600 font-medium hover:underline"
              >
                + Add
              </button>
            )}
          </div>
          
          {isEditing ? (
            <ul className="space-y-3">
              {editData.careInstructions.map((ci, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <textarea className="appearance-none border-2 border-slate-300 rounded px-2 py-1.5 text-sm font-medium flex-1 min-h-[60px] text-slate-900 bg-white shadow-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-400" value={ci.instruction} onChange={e => {
                    const c = [...editData.careInstructions]; c[i].instruction = e.target.value; setEditData({...editData, careInstructions: c});
                  }} />
                  <button onClick={() => {
                    const c = [...editData.careInstructions]; c.splice(i, 1); setEditData({...editData, careInstructions: c});
                  }} className="text-red-500 hover:text-red-700 p-1 mt-1"><X size={16}/></button>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-2">
              {instructions.map((ci, i) => (
                <li key={i} className="flex gap-4 items-start justify-between text-sm">
                  <span className="font-semibold text-slate-900 block text-base flex-1 break-words">{ci.instruction}</span>
                  <div className="shrink-0 mt-0.5">
                    <ConfidenceBadge level={ci.confidence} t={t} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Notes Section */}
      {(plan.notes || isEditing) && (
        <div className="bg-amber-50 rounded-2xl shadow-sm border border-amber-200 p-5 mb-4">
          <h3 className="font-semibold text-amber-900 mb-3">{t("notesTitle") || "Coordinator Notes"}</h3>
          {isEditing ? (
            <textarea
              className="appearance-none w-full bg-white border-2 border-amber-300 rounded-xl p-3 text-sm font-medium focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 min-h-[120px] text-slate-900 shadow-sm placeholder:text-amber-700/50"
              value={editData.notes || ""}
              onChange={e => setEditData({ ...editData, notes: e.target.value })}
              placeholder={t("notesPlaceholder") || "Add any specific manual notes for the caregiver here..."}
            />
          ) : (
            <div className="text-sm text-amber-800 whitespace-pre-wrap">
              {plan.notes}
            </div>
          )}
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
