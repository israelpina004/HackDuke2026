"use client";

import { FileText, MessageSquare } from "lucide-react";
import { useLanguage } from "@/translations/LanguageContext";

export default function PlanTabs({
  planId,
  activeTab,
}: {
  planId: string;
  activeTab: "overview" | "messages";
}) {
  const { t } = useLanguage();

  const tabs = [
    {
      key: "overview" as const,
      href: `/dashboard/plan/${planId}`,
      label: t("overviewTab"),
      icon: <FileText size={16} />,
    },
    {
      key: "messages" as const,
      href: `/dashboard/plan/${planId}/messages`,
      label: t("messagesTab"),
      icon: <MessageSquare size={16} />,
    },
  ];

  return (
    <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', padding: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;

        return (
          <a
            key={tab.key}
            href={tab.href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: '0.75rem',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: 'none',
              backgroundColor: isActive ? '#0d9488' : 'transparent',
              color: isActive ? '#ffffff' : '#475569',
            }}
          >
            {tab.icon}
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}