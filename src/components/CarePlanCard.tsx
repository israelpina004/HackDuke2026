"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/translations/LanguageContext";
import { AlertTriangle, Building2, CalendarDays, Check, Copy, FileText, Heart, Image as ImageIcon, Loader2, MessageSquare, Phone, Pill, Sparkles, Users, Volume2, X } from "lucide-react";

interface ContactInfo {
  name?: string;
  phone?: string;
  facility?: string;
}

interface AudioErrorResponse {
  error?: string;
}

interface ExplanationResponse {
  explanation?: string;
  error?: string;
}

type SectionKey = "medications" | "redFlags" | "careInstructions";

interface ExplanationState {
  text: string | null;
  loading: boolean;
  error: string | null;
}

interface UncertainItemState {
  sectionLabel: string;
  confidence: string;
  summary: string;
}

const initialExplanationState: Record<SectionKey, ExplanationState> = {
  medications: { text: null, loading: false, error: null },
  redFlags: { text: null, loading: false, error: null },
  careInstructions: { text: null, loading: false, error: null },
};

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

interface TranslationPayload {
  medications: CarePlanData["medications"];
  redFlags: CarePlanData["redFlags"];
  careInstructions: CarePlanData["careInstructions"];
}

export default function CarePlanCard({ plan, currentUserId }: { plan: CarePlanData; currentUserId?: string }) {
  const { t, language } = useLanguage();
  const [showDocs, setShowDocs] = useState(false);
  const [copied, setCopied] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [explanations, setExplanations] = useState<Record<SectionKey, ExplanationState>>(initialExplanationState);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [translating, setTranslating] = useState(false);
  const [translated, setTranslated] = useState<TranslationPayload | null>(null);
  const [uncertainItem, setUncertainItem] = useState<UncertainItemState | null>(null);
  const [clarificationDraft, setClarificationDraft] = useState("");
  const [sendingClarification, setSendingClarification] = useState(false);
  const [clarificationError, setClarificationError] = useState<string | null>(null);
  const [clarificationSuccess, setClarificationSuccess] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<CarePlanData>(plan);
  const canEdit = currentUserId && currentUserId === plan.coordinatorId;
  const canRequestClarification = Boolean(currentUserId) && currentUserId !== plan.coordinatorId && Boolean(plan.coordinatorId);

  useEffect(() => {
    setExplanations(initialExplanationState);
  }, [language, plan._id]);

  useEffect(() => {
    if (isEditing) {
      setTranslated(null);
      return;
    }

    const originalLanguage = plan.originalLanguage || "en";
    if (language === originalLanguage) {
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
      .then(async (response) => response.json() as Promise<Partial<TranslationPayload>>)
      .then((data) => {
        if (!cancelled && data.medications && data.redFlags && data.careInstructions) {
          setTranslated({
            medications: data.medications,
            redFlags: data.redFlags,
            careInstructions: data.careInstructions,
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setTranslating(false);
        }
      });

    return () => {
      cancelled = true;
    };
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

  const meds = translated?.medications || plan.medications;
  const flags = translated?.redFlags || plan.redFlags;
  const instructions = translated?.careInstructions || plan.careInstructions;

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const buildClarificationDraft = (item: UncertainItemState) => {
    return `${item.sectionLabel}: ${item.summary}\n${t("clarificationConfidenceNote")} ${getConfidenceLabel(item.confidence, t)}.`;
  };

  const openUncertaintyModal = (item: UncertainItemState) => {
    setUncertainItem(item);
    setClarificationDraft(buildClarificationDraft(item));
    setClarificationError(null);
    setClarificationSuccess(false);
  };

  const closeUncertaintyModal = () => {
    setUncertainItem(null);
    setClarificationDraft("");
    setClarificationError(null);
    setClarificationSuccess(false);
    setSendingClarification(false);
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const response = await fetch(`/api/plan/${plan._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert(t("failedToSavePlan"));
      }
    } catch (error) {
      console.error(error);
      alert(t("errorSavingPlan"));
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
          if (payload.error) {
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

  const handleExplainSection = async (section: SectionKey) => {
    setExplanations((current) => ({
      ...current,
      [section]: { text: current[section].text, loading: true, error: null },
    }));

    try {
      const response = await fetch("/api/explain-plan-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan._id, language, section }),
      });
      const payload = (await response.json()) as ExplanationResponse;
      if (!response.ok || !payload.explanation) {
        throw new Error(payload.error || t("explanationError"));
      }

      setExplanations((current) => ({
        ...current,
        [section]: { text: payload.explanation || null, loading: false, error: null },
      }));
    } catch (error: unknown) {
      setExplanations((current) => ({
        ...current,
        [section]: {
          text: current[section].text,
          loading: false,
          error: error instanceof Error ? error.message : t("explanationError"),
        },
      }));
    }
  };

  const handleSendClarification = async () => {
    if (!uncertainItem || !clarificationDraft.trim()) {
      return;
    }

    setSendingClarification(true);
    setClarificationError(null);

    try {
      const response = await fetch(`/api/plan/${plan._id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: clarificationDraft.trim(),
          translateToEnglish: language !== "en",
          localizedContent: language !== "en" ? clarificationDraft.trim() : undefined,
          sourceLanguage: language,
          viewerLanguage: language,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || t("failedToSendClarification"));
      }

      setClarificationSuccess(true);
    } catch (error: unknown) {
      setClarificationError(error instanceof Error ? error.message : t("failedToSendClarification"));
    } finally {
      setSendingClarification(false);
    }
  };

  const handleExportCalendar = () => {
    const escIcs = (str: string) => str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
    const now = new Date();
    const dtstamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);

    const events: string[] = [];

    meds.forEach((med, i) => {
      const start = new Date(tomorrow);
      start.setHours(8 + i, 0, 0, 0);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + 30);
      const dtstart = start.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const dtend = end.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

      events.push(
        [
          "BEGIN:VEVENT",
          `UID:med-${i}-${now.getTime()}@handoff.care`,
          `DTSTAMP:${dtstamp}`,
          `DTSTART:${dtstart}`,
          `DTEND:${dtend}`,
          `SUMMARY:${escIcs(`${t("calendarExportMedication")}: ${med.name}`)}`,
          `DESCRIPTION:${escIcs(`${t("calendarExportDosage")}: ${med.dosage || "N/A"}\\n${t("calendarExportFrequency")}: ${med.frequency || "N/A"}`)}`,
          "RRULE:FREQ=DAILY",
          "BEGIN:VALARM",
          "TRIGGER:-PT15M",
          "ACTION:DISPLAY",
          `DESCRIPTION:${escIcs(med.name)}`,
          "END:VALARM",
          "END:VEVENT",
        ].join("\r\n")
      );
    });

    flags.forEach((flag, i) => {
      const start = new Date(tomorrow);
      start.setHours(9, 0, 0, 0);
      const dtstart = start.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const dtend = dtstart;
      events.push(
        [
          "BEGIN:VEVENT",
          `UID:flag-${i}-${now.getTime()}@handoff.care`,
          `DTSTAMP:${dtstamp}`,
          `DTSTART;VALUE=DATE:${dtstart.slice(0, 8)}`,
          `SUMMARY:${escIcs(`⚠ ${t("calendarExportRedFlag")}: ${flag.issue}`)}`,
          `DESCRIPTION:${escIcs(flag.issue)}`,
          "END:VEVENT",
        ].join("\r\n")
      );
    });

    instructions.forEach((inst, i) => {
      const start = new Date(tomorrow);
      start.setHours(10 + i, 0, 0, 0);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + 30);
      const dtstart = start.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const dtend = end.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

      events.push(
        [
          "BEGIN:VEVENT",
          `UID:care-${i}-${now.getTime()}@handoff.care`,
          `DTSTAMP:${dtstamp}`,
          `DTSTART:${dtstart}`,
          `DTEND:${dtend}`,
          `SUMMARY:${escIcs(`${t("calendarExportCareInstruction")}: ${inst.instruction.slice(0, 60)}`)}`,
          `DESCRIPTION:${escIcs(inst.instruction)}`,
          "RRULE:FREQ=DAILY",
          "BEGIN:VALARM",
          "TRIGGER:-PT15M",
          "ACTION:DISPLAY",
          `DESCRIPTION:${escIcs(inst.instruction)}`,
          "END:VALARM",
          "END:VEVENT",
        ].join("\r\n")
      );
    });

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Handoff Care//EN",
      "CALSCALE:GREGORIAN",
      ...events,
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `care-plan-${plan.patientName.replace(/\s+/g, "-").toLowerCase()}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
            {t("patient")}: {isEditing ? (
              <input
                value={editData.patientName}
                onChange={(event) => setEditData({ ...editData, patientName: event.target.value })}
                style={{ marginLeft: '0.5rem', appearance: 'none', border: '2px solid #cbd5e1', borderRadius: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '1rem', fontWeight: 600, width: '14rem', color: '#0f172a', backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
              />
            ) : plan.patientName}
          </h2>
          {plan.createdByRole === "Caregiver" && (
            <span style={{ fontSize: '0.75rem', fontWeight: 500, backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>
              {t("selfUploaded")}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!isEditing && (
            <a
              href={`/dashboard/plan/${plan._id}/messages`}
              style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '0.375rem 0.75rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
            >
              <MessageSquare size={16} />
              {t("openMessages")}
            </a>
          )}
          {plan.documents?.length > 0 && !isEditing && (
            <button
              onClick={() => setShowDocs(true)}
              style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f766e', backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', padding: '0.375rem 0.75rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
            >
              <FileText size={16} /> {t("viewDocuments")} ({plan.documents.length})
            </button>
          )}
          {canEdit && !isEditing && (
            <button
              onClick={() => {
                setEditData(plan);
                setIsEditing(true);
              }}
              style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0d9488', backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', padding: '0.375rem 1rem', borderRadius: '0.5rem', cursor: 'pointer' }}
            >
              {t("editPlan")}
            </button>
          )}
          {isEditing && (
            <>
              <button
                onClick={() => setIsEditing(false)}
                style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.375rem 1rem', borderRadius: '0.5rem', cursor: 'pointer' }}
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ fontSize: '0.875rem', fontWeight: 500, color: '#ffffff', backgroundColor: '#0d9488', padding: '0.375rem 1rem', borderRadius: '0.5rem', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1 }}
              >
                {saving ? "..." : t("savePlan")}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderRadius: '1rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={handleGenerateAudio}
            disabled={generatingAudio}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '0.5rem', border: '1px solid #99f6e4', backgroundColor: '#f0fdfa', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#0f766e', cursor: generatingAudio ? 'not-allowed' : 'pointer', opacity: generatingAudio ? 0.6 : 1 }}
          >
            {generatingAudio ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Volume2 size={16} />}
            {generatingAudio ? t("generatingAudio") : t("audioBriefing")}
          </button>

          <button
            onClick={handleExportCalendar}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '0.5rem', border: '1px solid #99f6e4', backgroundColor: '#f0fdfa', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#0f766e', cursor: 'pointer' }}
          >
            <CalendarDays size={16} />
            {t("exportToCalendar")}
          </button>

          {audioError && <p style={{ fontSize: '0.875rem', color: '#dc2626' }}>{audioError}</p>}
        </div>

        {audioUrl && <audio ref={audioRef} controls preload="metadata" src={audioUrl} style={{ width: '100%', maxWidth: '36rem' }} />}
      </div>

      {plan.inviteCode && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t("inviteCodeLabel")}:</span>
            <code style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0d9488', letterSpacing: '0.1em', fontSize: '0.875rem', backgroundColor: '#ffffff', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: '1px solid #e2e8f0' }}>
              {plan.inviteCode}
            </code>
            <button
              onClick={() => plan.inviteCode && copyCode(plan.inviteCode)}
              style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '0.5rem' }}
              title="Copy"
            >
              {copied ? <Check size={16} style={{ color: '#22c55e' }} /> : <Copy size={16} />}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', color: '#64748b' }}>
            <Users size={14} />
            <span>{plan.caregiverIds?.length || 0} {t("caregiversLabel")}</span>
          </div>
        </div>
      )}

      {plan.createdByRole === "Caregiver" && plan.contactInfo && <ContactCard contactInfo={plan.contactInfo} t={t} />}

          <SectionCard
            accentColor="#0d9488"
            icon={<Pill size={18} style={{ color: '#0d9488' }} />}
            title={t("medications")}
            translating={translating}
            isEditing={isEditing}
            canExplain={meds.length > 0}
            onExplain={() => handleExplainSection("medications")}
            explanation={explanations.medications}
            explainButtonStyle={{ borderColor: '#99f6e4', backgroundColor: '#f0fdfa', color: '#0f766e' }}
            explainLabel={t("explainElaborate")}
            addButton={isEditing ? (
              <button
                onClick={() => setEditData({ ...editData, medications: [...editData.medications, { name: "", dosage: "", frequency: "", confidence: "High" }] })}
                style={{ fontSize: '0.75rem', color: '#0d9488', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {t("addItem")}
              </button>
            ) : null}
          >
            {isEditing ? (
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', listStyle: 'none', margin: 0, padding: 0 }}>
                {editData.medications.map((medication, index) => (
                  <li key={index} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                    <input
                      style={{ appearance: 'none', border: '2px solid #cbd5e1', borderRadius: '0.25rem', padding: '0.25rem 0.375rem', fontSize: '0.875rem', fontWeight: 500, flex: '1 1 7.5rem', color: '#0f172a', backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                      value={medication.name}
                      onChange={(event) => {
                        const medications = [...editData.medications];
                        medications[index].name = event.target.value;
                        setEditData({ ...editData, medications });
                      }}
                      placeholder={t("medNamePlaceholder")}
                    />
                    <input
                      style={{ appearance: 'none', border: '2px solid #cbd5e1', borderRadius: '0.25rem', padding: '0.25rem 0.375rem', fontSize: '0.875rem', fontWeight: 500, width: '6rem', color: '#0f172a', backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                      value={medication.dosage}
                      onChange={(event) => {
                        const medications = [...editData.medications];
                        medications[index].dosage = event.target.value;
                        setEditData({ ...editData, medications });
                      }}
                      placeholder={t("dosagePlaceholder")}
                    />
                    <input
                      style={{ appearance: 'none', border: '2px solid #cbd5e1', borderRadius: '0.25rem', padding: '0.25rem 0.375rem', fontSize: '0.875rem', fontWeight: 500, width: '8rem', color: '#0f172a', backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                      value={medication.frequency}
                      onChange={(event) => {
                        const medications = [...editData.medications];
                        medications[index].frequency = event.target.value;
                        setEditData({ ...editData, medications });
                      }}
                      placeholder={t("frequencyPlaceholder")}
                    />
                    <button
                      onClick={() => {
                        const medications = [...editData.medications];
                        medications.splice(index, 1);
                        setEditData({ ...editData, medications });
                      }}
                      style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                    >
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : meds.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>\u2014</p>
            ) : (
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyle: 'none', margin: 0, padding: 0 }}>
                {meds.map((medication, index) => (
                  <li key={index} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <div style={{ flex: '1 1 0%', overflowWrap: 'break-word' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>{medication.name}</span>
                      <span style={{ color: '#475569', fontWeight: 500, marginLeft: '0.5rem', display: 'inline-block' }}>{medication.dosage} \u00b7 {medication.frequency}</span>
                    </div>
                    <div style={{ flexShrink: 0, marginTop: '0.125rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                      <ConfidenceBadge level={medication.confidence} t={t} />
                      {canRequestClarification && medication.confidence !== "High" && (
                        <button
                          type="button"
                          onClick={() =>
                            openUncertaintyModal({
                              sectionLabel: t("medications"),
                              confidence: medication.confidence,
                              summary: `${medication.name} ${medication.dosage} ${medication.frequency}`.trim(),
                            })
                          }
                          style={{ fontSize: '0.75rem', fontWeight: 500, color: '#0d9488', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {t("reviewThisItem")}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {(flags.length > 0 || isEditing) && (
            <SectionCard
              accentColor="#ef4444"
              icon={<AlertTriangle size={18} style={{ color: '#ef4444' }} />}
              title={t("redFlags")}
              isEditing={isEditing}
              canExplain={flags.length > 0}
              onExplain={() => handleExplainSection("redFlags")}
              explanation={explanations.redFlags}
              explainButtonStyle={{ borderColor: '#fecaca', backgroundColor: '#fef2f2', color: '#b91c1c' }}
              explainLabel={t("explainElaborate")}
              addButton={isEditing ? (
                <button
                  onClick={() => setEditData({ ...editData, redFlags: [...editData.redFlags, { issue: "", confidence: "High" }] })}
                  style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {t("addItem")}
                </button>
              ) : null}
            >
              {isEditing ? (
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', listStyle: 'none', margin: 0, padding: 0 }}>
                  {editData.redFlags.map((flag, index) => (
                    <li key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <input
                        style={{ appearance: 'none', border: '2px solid #cbd5e1', borderRadius: '0.25rem', padding: '0.25rem 0.375rem', fontSize: '0.875rem', fontWeight: 500, flex: '1 1 0%', color: '#0f172a', backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                        value={flag.issue}
                        onChange={(event) => {
                          const redFlags = [...editData.redFlags];
                          redFlags[index].issue = event.target.value;
                          setEditData({ ...editData, redFlags });
                        }}
                      />
                      <button
                        onClick={() => {
                          const redFlags = [...editData.redFlags];
                          redFlags.splice(index, 1);
                          setEditData({ ...editData, redFlags });
                        }}
                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                      >
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyle: 'none', margin: 0, padding: 0 }}>
                  {flags.map((flag, index) => (
                    <li key={index} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span style={{ fontWeight: 600, color: '#0f172a', display: 'block', fontSize: '1rem', flex: '1 1 0%', overflowWrap: 'break-word' }}>{flag.issue}</span>
                      <div style={{ flexShrink: 0, marginTop: '0.125rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                        <ConfidenceBadge level={flag.confidence} t={t} />
                        {canRequestClarification && flag.confidence !== "High" && (
                          <button
                            type="button"
                            onClick={() =>
                              openUncertaintyModal({
                                sectionLabel: t("redFlags"),
                                confidence: flag.confidence,
                                summary: flag.issue,
                              })
                            }
                            style={{ fontSize: '0.75rem', fontWeight: 500, color: '#0d9488', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {t("reviewThisItem")}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          )}

          {(instructions.length > 0 || isEditing) && (
            <SectionCard
              accentColor="#16a34a"
              icon={<Heart size={18} style={{ color: '#16a34a' }} />}
              title={t("careInstructions")}
              isEditing={isEditing}
              canExplain={instructions.length > 0}
              onExplain={() => handleExplainSection("careInstructions")}
              explanation={explanations.careInstructions}
              explainButtonStyle={{ borderColor: '#dcfce7', backgroundColor: '#f0fdf4', color: '#15803d' }}
              explainLabel={t("explainElaborate")}
              addButton={isEditing ? (
                <button
                  onClick={() => setEditData({ ...editData, careInstructions: [...editData.careInstructions, { instruction: "", confidence: "High" }] })}
                  style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {t("addItem")}
                </button>
              ) : null}
            >
              {isEditing ? (
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', listStyle: 'none', margin: 0, padding: 0 }}>
                  {editData.careInstructions.map((instruction, index) => (
                    <li key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <textarea
                        style={{ appearance: 'none', border: '2px solid #cbd5e1', borderRadius: '0.25rem', padding: '0.25rem 0.375rem', fontSize: '0.875rem', fontWeight: 500, flex: '1 1 0%', minHeight: '3.75rem', color: '#0f172a', backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                        value={instruction.instruction}
                        onChange={(event) => {
                          const careInstructions = [...editData.careInstructions];
                          careInstructions[index].instruction = event.target.value;
                          setEditData({ ...editData, careInstructions });
                        }}
                      />
                      <button
                        onClick={() => {
                          const careInstructions = [...editData.careInstructions];
                          careInstructions.splice(index, 1);
                          setEditData({ ...editData, careInstructions });
                        }}
                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', marginTop: '0.25rem' }}
                      >
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyle: 'none', margin: 0, padding: 0 }}>
                  {instructions.map((instruction, index) => (
                    <li key={index} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span style={{ fontWeight: 600, color: '#0f172a', display: 'block', fontSize: '1rem', flex: '1 1 0%', overflowWrap: 'break-word' }}>{instruction.instruction}</span>
                      <div style={{ flexShrink: 0, marginTop: '0.125rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                        <ConfidenceBadge level={instruction.confidence} t={t} />
                        {canRequestClarification && instruction.confidence !== "High" && (
                          <button
                            type="button"
                            onClick={() =>
                              openUncertaintyModal({
                                sectionLabel: t("careInstructions"),
                                confidence: instruction.confidence,
                                summary: instruction.instruction,
                              })
                            }
                            style={{ fontSize: '0.75rem', fontWeight: 500, color: '#0d9488', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {t("reviewThisItem")}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          )}

          {(plan.notes || isEditing) && (
            <div style={{ backgroundColor: '#fffbeb', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #fde68a', padding: '1.25rem', marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: 600, color: '#78350f', marginBottom: '0.75rem' }}>{t("notesTitle")}</h3>
              {isEditing ? (
                <textarea
                  style={{ appearance: 'none', width: '100%', backgroundColor: '#ffffff', border: '2px solid #fcd34d', borderRadius: '0.75rem', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 500, minHeight: '7.5rem', color: '#0f172a', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                  value={editData.notes || ""}
                  onChange={(event) => setEditData({ ...editData, notes: event.target.value })}
                  placeholder={t("notesPlaceholder")}
                />
              ) : (
                <div style={{ fontSize: '0.875rem', color: '#92400e', whiteSpace: 'pre-wrap' }}>{plan.notes}</div>
              )}
            </div>
          )}

      {showDocs && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '1rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '100%', maxWidth: '64rem', display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} style={{ color: '#0d9488' }} /> {t("viewDocuments")}
              </h3>
              <button
                onClick={() => setShowDocs(false)}
                style={{ padding: '0.5rem', color: '#94a3b8', background: 'none', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: '1 1 0%', overflowY: 'auto', padding: '1rem', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {plan.documents.map((doc, index) => (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
                    {doc.mimeType.startsWith("image/") ? <ImageIcon size={16} /> : <FileText size={16} />}
                    {t("document")} {index + 1}
                  </div>
                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '18.75rem' }}>
                    {doc.mimeType.startsWith("image/") ? (
                      <img
                        src={`/api/documents/${plan._id}/${index}`}
                        alt={`${t("document")} ${index + 1}`}
                        style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                      />
                    ) : (
                      <iframe
                        src={`/api/documents/${plan._id}/${index}`}
                        style={{ width: '100%', height: '70vh', border: 'none' }}
                        title={`${t("document")} ${index + 1}`}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {uncertainItem && (
        <UncertaintyResolutionModal
          item={uncertainItem}
          draft={clarificationDraft}
          canMessageCoordinator={canRequestClarification}
          sending={sendingClarification}
          error={clarificationError}
          success={clarificationSuccess}
          onDraftChange={(value) => {
            setClarificationDraft(value);
            setClarificationSuccess(false);
          }}
          onClose={closeUncertaintyModal}
          onSend={handleSendClarification}
          t={t}
        />
      )}
    </div>
  );
}

function SectionCard({
  accentColor,
  icon,
  title,
  translating,
  isEditing,
  canExplain,
  onExplain,
  explanation,
  explainButtonStyle,
  explainLabel,
  addButton,
  children,
}: {
  accentColor: string;
  icon: ReactNode;
  title: string;
  translating?: boolean;
  isEditing: boolean;
  canExplain: boolean;
  onExplain: () => void;
  explanation: ExplanationState;
  explainButtonStyle: Record<string, string>;
  explainLabel: string;
  addButton?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', borderTop: `4px solid ${accentColor}`, padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', gap: '0.75rem' }}>
        <h3 style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {icon} {title}
          {translating && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: '#94a3b8' }} />}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {!isEditing && (
            <button
              onClick={onExplain}
              disabled={explanation.loading || !canExplain}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', borderRadius: '0.5rem', border: '1px solid', padding: '0.375rem 0.75rem', fontSize: '0.75rem', fontWeight: 500, cursor: explanation.loading || !canExplain ? 'not-allowed' : 'pointer', opacity: explanation.loading || !canExplain ? 0.6 : 1, ...explainButtonStyle }}
            >
              {explanation.loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
              {explainLabel}
            </button>
          )}
          {addButton}
        </div>
      </div>
      {children}
      <ExplanationPanel explanation={explanation} />
    </div>
  );
}

function ExplanationPanel({ explanation }: { explanation: ExplanationState }) {
  const { t } = useLanguage();

  if (!explanation.loading && !explanation.error && !explanation.text) {
    return null;
  }

  return (
    <div style={{ marginTop: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '1rem' }}>
      {explanation.loading && (
        <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          {t("generatingExplanation")}
        </p>
      )}
      {explanation.error && !explanation.loading && <p style={{ fontSize: '0.875rem', color: '#dc2626' }}>{explanation.error}</p>}
      {explanation.text && !explanation.loading && (
        <p style={{ fontSize: '0.875rem', lineHeight: '1.75rem', color: '#334155', whiteSpace: 'pre-wrap' }}>{explanation.text}</p>
      )}
    </div>
  );
}

function ContactCard({ contactInfo, t }: { contactInfo: ContactInfo; t: (key: string) => string }) {
  const hasInfo = contactInfo.name || contactInfo.phone || contactInfo.facility;
  if (!hasInfo) {
    return <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.75rem', padding: '1rem', fontSize: '0.875rem', color: '#b45309' }}>{t("noCoordinator")}</div>;
  }

  return (
    <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem' }}>
      {contactInfo.facility && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
          <Building2 size={14} style={{ color: '#94a3b8' }} />
          <span style={{ fontWeight: 500 }}>{t("facility")}:</span> {contactInfo.facility}
        </div>
      )}
      {contactInfo.name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
          <span style={{ fontWeight: 500 }}>{t("contactDoctor")}:</span> {contactInfo.name}
        </div>
      )}
      {contactInfo.phone && (
        <a href={`tel:${contactInfo.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0d9488', fontWeight: 500, textDecoration: 'none' }}>
          <Phone size={14} /> {contactInfo.phone}
        </a>
      )}
    </div>
  );
}

function ConfidenceBadge({ level, t }: { level: string; t: (key: string) => string }) {
  const badgeStyles: Record<string, Record<string, string>> = {
    High: { backgroundColor: '#f0fdf4', color: '#15803d', borderColor: '#dcfce7' },
    Medium: { backgroundColor: '#fffbeb', color: '#b45309', borderColor: '#fde68a' },
    Low: { backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' },
  };
  const keys: Record<string, string> = {
    High: "highConfidence",
    Medium: "mediumConfidence",
    Low: "lowConfidence",
  };
  return (
    <span style={{ fontSize: '0.75rem', fontWeight: 500, padding: '0.125rem 0.5rem', borderRadius: '9999px', border: '1px solid', whiteSpace: 'nowrap', ...(badgeStyles[level] || badgeStyles.High) }}>
      {t(keys[level] || "highConfidence")}
    </span>
  );
}

function getConfidenceLabel(level: string, t: (key: string) => string) {
  const keys: Record<string, string> = {
    High: "highConfidence",
    Medium: "mediumConfidence",
    Low: "lowConfidence",
  };

  return t(keys[level] || "highConfidence");
}

function UncertaintyResolutionModal({
  item,
  draft,
  canMessageCoordinator,
  sending,
  error,
  success,
  onDraftChange,
  onClose,
  onSend,
  t,
}: {
  item: UncertainItemState;
  draft: string;
  canMessageCoordinator: boolean;
  sending: boolean;
  error: string | null;
  success: boolean;
  onDraftChange: (value: string) => void;
  onClose: () => void;
  onSend: () => void;
  t: (key: string) => string;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.7)', padding: '1rem', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
      <div style={{ width: '100%', maxWidth: '42rem', borderRadius: '1.5rem', backgroundColor: '#ffffff', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid #e2e8f0', padding: '1.25rem 1.5rem' }}>
          <div>
            <div style={{ marginBottom: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '9999px', border: '1px solid #fde68a', backgroundColor: '#fffbeb', padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 500, color: '#b45309' }}>
              <AlertTriangle size={14} />
              {t("confidenceNeedsReview")}
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>{t("uncertaintyModalTitle")}</h3>
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', lineHeight: '1.5rem', color: '#475569' }}>{t("uncertaintyModalBody")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ borderRadius: '0.5rem', padding: '0.5rem', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem 1.5rem' }}>
          <div style={{ borderRadius: '1rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '1rem' }}>
            <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>
              <span>{t("uncertaintyItemLabel")}</span>
              <ConfidenceBadge level={item.confidence} t={t} />
            </div>
            <p style={{ fontSize: '0.875rem', lineHeight: '1.5rem', color: '#334155' }}>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.sectionLabel}:</span> {item.summary}
            </p>
          </div>

            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{t("translateToEnglishHint")}</p>
          {canMessageCoordinator ? (
            <>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>{t("clarificationMessageLabel")}</label>
              <textarea
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                rows={5}
                placeholder={t("clarificationPlaceholder")}
                style={{ width: '100%', borderRadius: '1rem', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#0f172a', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
              />
              {error && <p style={{ fontSize: '0.875rem', color: '#dc2626' }}>{error}</p>}
              {success && <p style={{ fontSize: '0.875rem', color: '#16a34a' }}>{t("clarificationSent")}</p>}
            </>
          ) : (
            <div style={{ borderRadius: '1rem', border: '1px solid #fde68a', backgroundColor: '#fffbeb', padding: '1rem', fontSize: '0.875rem', color: '#92400e' }}>
              {t("noCoordinatorAvailable")}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', padding: '1rem 1.5rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ borderRadius: '0.75rem', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#334155', cursor: 'pointer' }}
          >
            {t("cancel")}
          </button>
          {canMessageCoordinator && (
            <button
              type="button"
              onClick={onSend}
              disabled={sending || !draft.trim()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '0.75rem', backgroundColor: sending || !draft.trim() ? '#99f6e4' : '#0d9488', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#ffffff', border: 'none', cursor: sending || !draft.trim() ? 'not-allowed' : 'pointer' }}
            >
              {sending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <MessageSquare size={16} />}
              {sending ? t("sendingMessage") : t("askCoordinator")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
