"use client";

import { useLanguage } from "@/translations/LanguageContext";
import { Activity, LogOut } from "lucide-react";

export default function DashboardHeader({ userName }: { userName: string }) {
  const { t } = useLanguage();

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(226,232,240,0.6)' }}>
      <div style={{ maxWidth: '100rem', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '1.5rem', paddingRight: '1.5rem', height: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Brand */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <Activity style={{ height: '1.5rem', width: '1.5rem', color: '#0d9488' }} />
          <span style={{ fontWeight: 600, fontSize: '1.125rem', letterSpacing: '-0.025em', color: '#0f172a' }}>
            Handoff
          </span>
        </a>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>
            {userName}
          </span>
          <div style={{ width: '1px', height: '1.25rem', backgroundColor: '#e2e8f0' }} />
          <a
            href="/auth/logout"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#64748b', padding: '0.375rem 0.75rem', borderRadius: '0.5rem', textDecoration: 'none' }}
          >
            <LogOut style={{ height: '0.875rem', width: '0.875rem' }} />
            {t('logout')}
          </a>
        </div>
      </div>
    </header>
  );
}
