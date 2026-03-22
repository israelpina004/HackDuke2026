"use client";

import { Activity } from "lucide-react";
import { useLanguage } from "@/translations/LanguageContext";

export default function AppHeader({ isLoggedIn }: { isLoggedIn?: boolean }) {
  const { t } = useLanguage();

  return (
    <header style={{ width: '100%', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(226,232,240,0.6)' }}>
      <div style={{ maxWidth: '72rem', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '1.5rem', paddingRight: '1.5rem', height: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Brand */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <Activity style={{ height: '1.5rem', width: '1.5rem', color: '#0d9488' }} />
          <span style={{ fontWeight: 600, fontSize: '1.125rem', letterSpacing: '-0.025em', color: '#0f172a' }}>
            Handoff
          </span>
        </a>

        {/* Nav action */}
        {isLoggedIn ? (
          <a
            href="/dashboard"
            style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f766e', textDecoration: 'none' }}
          >
            Dashboard &rarr;
          </a>
        ) : (
          <a
            href="/auth/login"
            style={{ fontSize: '0.875rem', fontWeight: 500, padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: '#0d9488', color: '#ffffff', textDecoration: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            {t("getStarted")}
          </a>
        )}
      </div>
    </header>
  );
}
