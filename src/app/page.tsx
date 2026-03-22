import { auth0 } from '@/lib/auth0';
import { cookies } from "next/headers";
import dbConnect, { withTimeout } from "@/lib/mongoose";
import User from "@/models/User";
import { translations, LanguageCode } from "@/translations";
import AppHeader from "@/components/AppHeader";
import { Activity, Globe, MessageSquare, Brain, CalendarCheck, Upload, Sparkles, Share2, ArrowRight } from "lucide-react";

export default async function Home() {
  console.log('[Home] rendering...');
  const session = await auth0.getSession();
  const user = session?.user;
  console.log('[Home] session:', !!session, 'user:', !!user);
  
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value as LanguageCode) || "en";
  const t = (key: string) => translations[locale]?.[key] || translations["en"]?.[key] || key;
  let canJoinPlan = false;

  if (user?.sub) {
    try {
      await withTimeout(dbConnect(), 8000);
      const dbUser = await withTimeout(
        User.findOne({ auth0Id: user.sub }).select("role").lean<{ role?: string } | null>(),
        5000
      );
      canJoinPlan = dbUser?.role === "Caregiver";
    } catch (error) {
      console.error("[Home] role lookup failed:", (error as Error).message);
    }
  }

  const features = [
    { icon: Globe, title: t('featureTranslateTitle'), desc: t('featureTranslateDesc') },
    { icon: MessageSquare, title: t('featureMessagingTitle'), desc: t('featureMessagingDesc') },
    { icon: Brain, title: t('featureAiTitle'), desc: t('featureAiDesc') },
    { icon: CalendarCheck, title: t('featureCalendarTitle'), desc: t('featureCalendarDesc') },
  ];

  const steps = [
    { num: "01", icon: Upload, title: t('howStep1Title'), desc: t('howStep1Desc') },
    { num: "02", icon: Sparkles, title: t('howStep2Title'), desc: t('howStep2Desc') },
    { num: "03", icon: Share2, title: t('howStep3Title'), desc: t('howStep3Desc') },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      <AppHeader isLoggedIn={!!user} />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', backgroundColor: '#ffffff' }}>
        {/* Background Image & Overlay */}
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundSize: 'cover', backgroundPosition: 'top', backgroundRepeat: 'no-repeat', opacity: 0.15, backgroundImage: 'url("https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=2850&q=80")' }}
        />
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), rgba(255,255,255,0.8), #f8fafc)' }} />

        {/* Background decorations */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.4, zIndex: 0, backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div style={{ position: 'absolute', top: '-6rem', right: '-6rem', width: '24rem', height: '24rem', borderRadius: '9999px', backgroundColor: 'rgba(204,251,241,0.5)', filter: 'blur(64px)', WebkitFilter: 'blur(64px)', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: '-8rem', left: '-8rem', width: '20rem', height: '20rem', borderRadius: '9999px', backgroundColor: 'rgba(153,246,228,0.3)', filter: 'blur(64px)', WebkitFilter: 'blur(64px)', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 10, maxWidth: '64rem', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '5rem', paddingBottom: '6rem', textAlign: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f0fdfa', color: '#0f766e', fontSize: '0.875rem', fontWeight: 500, padding: '0.375rem 1rem', borderRadius: '9999px', border: '1px solid #99f6e4', marginBottom: '2rem' }}>
              <Activity style={{ height: '0.875rem', width: '0.875rem' }} />
              <span>AI-Powered Discharge Planning</span>
            </div>

            <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#020617', letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: '1.5rem', maxWidth: '48rem', marginLeft: 'auto', marginRight: 'auto' }}>
              {t('heroHeadline')}
            </h1>

            <p style={{ fontSize: '1.125rem', color: '#64748b', maxWidth: '42rem', marginLeft: 'auto', marginRight: 'auto', marginBottom: '2.5rem', lineHeight: 1.75 }}>
              {t('heroSubheadline')}
            </p>

            {/* CTA Buttons */}
            {!user ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <a
                  href="/auth/login"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0d9488', color: '#ffffff', fontWeight: 500, padding: '0.875rem 1.75rem', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', textDecoration: 'none', fontSize: '1rem' }}
                >
                  {t('heroCta')}
                  <ArrowRight style={{ height: '1rem', width: '1rem' }} />
                </a>
                <a
                  href="#how-it-works"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 500, padding: '0.875rem 1.75rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', textDecoration: 'none', fontSize: '1rem' }}
                >
                  {t('heroSecondaryCta')}
                </a>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <a
                  href="/dashboard"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0d9488', color: '#ffffff', fontWeight: 500, padding: '0.875rem 1.75rem', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', textDecoration: 'none', fontSize: '1rem' }}
                >
                  Dashboard
                  <ArrowRight style={{ height: '1rem', width: '1rem' }} />
                </a>
                {canJoinPlan && (
                  <a
                    href="/link"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#0f766e', fontWeight: 500, padding: '0.875rem 1.75rem', borderRadius: '0.75rem', border: '1px solid #99f6e4', backgroundColor: '#f0fdfa', textDecoration: 'none', fontSize: '1rem' }}
                  >
                    {t('joinPlan')}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section style={{ paddingTop: '5rem', paddingBottom: '5rem', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '72rem', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
            {features.map((f) => (
              <div key={f.title} style={{ padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', flex: '1 1 220px', minWidth: '220px' }}>
                <div style={{ height: '2.75rem', width: '2.75rem', borderRadius: '0.75rem', backgroundColor: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <f.icon style={{ height: '1.25rem', width: '1.25rem', color: '#0d9488' }} />
                </div>
                <h3 style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof / Stat ──────────────────────────── */}
      <section style={{ paddingTop: '4rem', paddingBottom: '4rem', backgroundColor: '#0f172a', color: '#ffffff' }}>
        <div style={{ maxWidth: '48rem', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '1.5rem', paddingRight: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '3rem', fontWeight: 700, color: '#2dd4bf', marginBottom: '1rem' }}>40%</p>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', lineHeight: 1.3 }}>{t('socialProofHeadline')}</h2>
          <p style={{ color: '#cbd5e1', fontSize: '1.125rem', lineHeight: 1.7 }}>{t('socialProofBody')}</p>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────── */}
      <section id="how-it-works" style={{ paddingTop: '5rem', paddingBottom: '5rem', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '64rem', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#020617', textAlign: 'center', marginBottom: '4rem', letterSpacing: '-0.025em' }}>
            {t('howItWorksTitle')}
          </h2>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center' }}>
            {steps.map((s) => (
              <div key={s.num} style={{ position: 'relative', textAlign: 'center', flex: '1 1 250px', minWidth: '250px', maxWidth: '340px' }}>
                <span style={{ fontSize: '3.75rem', fontWeight: 700, color: '#f1f5f9', position: 'absolute', top: '-0.5rem', left: '-0.25rem', userSelect: 'none' }}>{s.num}</span>
                <div style={{ position: 'relative', paddingTop: '2.5rem' }}>
                  <div style={{ display: 'inline-flex', height: '3rem', width: '3rem', borderRadius: '0.75rem', backgroundColor: '#f0fdfa', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    <s.icon style={{ height: '1.375rem', width: '1.375rem', color: '#0d9488' }} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>{s.title}</h3>
                  <p style={{ color: '#64748b', lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────── */}
      {!user && (
        <section style={{ paddingTop: '4rem', paddingBottom: '4rem', background: 'linear-gradient(to bottom right, #0d9488, #0f766e)' }}>
          <div style={{ maxWidth: '48rem', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '1.5rem', paddingRight: '1.5rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ffffff', marginBottom: '1rem' }}>{t('heroHeadline')}</h2>
            <p style={{ color: '#ccfbf1', marginBottom: '2rem', fontSize: '1.125rem' }}>{t('heroSubheadline')}</p>
            <a
              href="/auth/login"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#ffffff', color: '#0f766e', fontWeight: 600, padding: '1rem 2rem', borderRadius: '0.75rem', textDecoration: 'none', fontSize: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
            >
              {t('heroCta')}
              <ArrowRight style={{ height: '1rem', width: '1rem' }} />
            </a>
          </div>
        </section>
      )}

      {/* ── Footer ───────────────────────────────────────── */}
      <footer style={{ paddingTop: '2.5rem', paddingBottom: '2.5rem', backgroundColor: '#020617', color: '#94a3b8' }}>
        <div style={{ maxWidth: '72rem', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '1.5rem', paddingRight: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity style={{ height: '1.25rem', width: '1.25rem', color: '#14b8a6' }} />
            <span style={{ fontWeight: 600, color: '#ffffff' }}>Handoff</span>
          </div>
          <p style={{ fontSize: '0.875rem' }}>{t('footerTagline')}</p>
          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>&copy; {new Date().getFullYear()} Handoff</p>
        </div>
      </footer>
    </div>
  );
}