"use client";

import { useLanguage } from "@/translations/LanguageContext";
import { Activity } from "lucide-react";

export default function DashboardHeader({ userName }: { userName: string }) {
  const { t } = useLanguage();

  return (
    <header className="bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center sticky top-0 z-10">
      <a href="/dashboard" className="flex items-center gap-2 transition-colors hover:text-slate-900">
        <Activity className="h-6 w-6 text-blue-600" />
        <span className="font-bold text-lg text-slate-800">Handoff</span>
      </a>
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-slate-600 hidden md:inline-block">
          {userName}
        </span>
        <a href="/auth/logout" className="text-sm font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">
          {t('logout')}
        </a>
      </div>
    </header>
  );
}
