"use client";

import { LANGUAGES } from "@/translations";
import { useLanguage } from "@/translations/LanguageContext";
import { Globe } from "lucide-react";

export default function LanguageSwitcher() {
  const { language } = useLanguage();

  const handleLanguageChange = (newLanguage: string) => {
    // Set a cookie that lasts for 1 year
    document.cookie = `NEXT_LOCALE=${newLanguage}; path=/; max-age=31536000`;
    window.location.reload(); // Full reload to reconstruct Server Components with new cookie
  };

  return (
    <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20">
      <Globe size={16} className="text-white opacity-80" />
      <select
        value={language}
        onChange={(e) => handleLanguageChange(e.target.value)}
        className="bg-transparent text-white text-sm font-medium focus:outline-none appearance-none cursor-pointer pr-4"
        style={{ WebkitAppearance: "none", MozAppearance: "none" }}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code} className="text-slate-800">
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}
