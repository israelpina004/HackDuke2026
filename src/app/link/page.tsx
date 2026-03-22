"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ArrowRight } from "lucide-react";
import { useLanguage } from "@/translations/LanguageContext";
import AppHeader from "@/components/AppHeader";

export default function LinkCaregiverPage() {
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
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
        router.push("/dashboard");
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <AppHeader />

      <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-100 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-blue-50 blur-3xl"></div>
        
        <div className="relative">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
              <KeyRound size={28} strokeWidth={2.5} />
            </div>
          </div>
          
          <h1 className="text-3xl font-extrabold text-slate-800 text-center mb-2 tracking-tight">{t('linkTitle')}</h1>
          <p className="text-slate-500 text-center mb-8 leading-relaxed">
            {t('linkSubtitle')}
          </p>
          
          <form onSubmit={handleLink} className="flex flex-col gap-5">
            <div>
              <input
                id="inviteCode"
                type="text"
                maxLength={6}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder={t('inviteCodePlaceholder')}
                className="appearance-none w-full px-5 py-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 uppercase tracking-[0.3em] font-medium text-xl text-center text-slate-900 placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-normal transition-all duration-200"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm py-3 px-4 rounded-lg flex items-center justify-center border border-red-100">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 text-green-700 text-sm font-medium py-3 px-4 rounded-lg flex items-center justify-center border border-green-100">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || inviteCode.length < 6}
              className="group w-full bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 py-4 rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 disabled:opacity-50 disabled:hover:shadow-none disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
            >
              {loading ? (
                <span className="animate-pulse">{t('verifying')}</span>
              ) : (
                <>
                  {t('connectBtn')} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
      
      <p className="mt-8 text-sm text-slate-400">
        {t('requiresAuth')}
      </p>
    </div>
  );
}
