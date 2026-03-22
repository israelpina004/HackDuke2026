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
    <nav className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;

        return (
          <a
            key={tab.key}
            href={tab.href}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {tab.icon}
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}