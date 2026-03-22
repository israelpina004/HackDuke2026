"use client";

import { useState } from "react";
import { KeyRound, ArrowRight, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/translations/LanguageContext";
import AppHeader from "@/components/AppHeader";

export default function LinkCaregiverPage() {
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { t } = useLanguage();

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/link-caregiver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t('failedLink'));
      }

      setSuccess(t('successLink'));
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      <AppHeader />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ width: '100%', maxWidth: '28rem' }}>
          <a
            href="/dashboard"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#64748b', textDecoration: 'none', marginBottom: '1.5rem' }}
          >
            <ArrowLeft size={16} /> {t("backToDashboard")}
          </a>

          <div style={{ backgroundColor: '#ffffff', padding: '2.5rem', borderRadius: '1.5rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', position: 'relative', overflow: 'hidden' }}>
            {/* Decorative background element */}
            <div style={{ position: 'absolute', top: 0, right: 0, marginRight: '-4rem', marginTop: '-4rem', width: '8rem', height: '8rem', borderRadius: '9999px', backgroundColor: '#f0fdfa', filter: 'blur(48px)', WebkitFilter: 'blur(48px)' }} />

            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div style={{ height: '4rem', width: '4rem', backgroundColor: '#f0fdfa', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488' }}>
                  <KeyRound size={28} strokeWidth={2.5} />
                </div>
              </div>

              <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>{t('linkTitle')}</h1>
              <p style={{ color: '#64748b', textAlign: 'center', marginBottom: '2rem', lineHeight: 1.6 }}>
                {t('linkSubtitle')}
              </p>

              <form onSubmit={handleLink} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <input
                    id="inviteCode"
                    type="text"
                    maxLength={6}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder={t('inviteCodePlaceholder')}
                    style={{ width: '100%', padding: '1rem 1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 500, fontSize: '1.25rem', textAlign: 'center', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                {error && (
                  <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '0.875rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fecaca' }}>
                    {error}
                  </div>
                )}
                {success && (
                  <div style={{ backgroundColor: '#f0fdf4', color: '#15803d', fontSize: '0.875rem', fontWeight: 500, padding: '0.75rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #dcfce7' }}>
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || inviteCode.length < 6}
                  style={{ width: '100%', backgroundColor: '#0d9488', color: '#ffffff', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', borderRadius: '0.75rem', border: 'none', cursor: loading || inviteCode.length < 6 ? 'not-allowed' : 'pointer', opacity: loading || inviteCode.length < 6 ? 0.5 : 1, fontSize: '1rem' }}
                >
                  {loading ? (
                    <span>{t('verifying')}</span>
                  ) : (
                    <>
                      {t('connectBtn')} <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
        
        <p style={{ marginTop: '2rem', fontSize: '0.875rem', color: '#94a3b8' }}>
          {t('requiresAuth')}
        </p>
      </div>
    </div>
  );
}
