"use client";

import { LANGUAGES } from "@/translations";
import { useLanguage } from "@/translations/LanguageContext";
import { Globe } from "lucide-react";

const FLAG_MAP: Record<string, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
  zh: "🇨🇳",
  ko: "🇰🇷",
  hi: "🇮🇳",
  ru: "🇷🇺",
};

const SHORT_MAP: Record<string, string> = {
  en: "EN",
  es: "ES",
  zh: "中文",
  ko: "한",
  hi: "हि",
  ru: "РУ",
};

export default function LanguageSwitcher() {
  const { language } = useLanguage();

  const handleLanguageChange = (newLanguage: string) => {
    document.cookie = `NEXT_LOCALE=${newLanguage}; path=/; max-age=31536000`;
    window.location.reload();
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        backgroundColor: "#ffffff",
        padding: "0.5rem 0.75rem",
        borderRadius: "9999px",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 20px rgba(0,0,0,0.12), 0 0 0 1px rgba(13,148,136,0.08)",
      }}
    >
      <Globe size={16} style={{ color: "#0d9488", flexShrink: 0 }} />
      <span
        style={{
          fontSize: "0.9375rem",
          lineHeight: 1,
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {FLAG_MAP[language] || "🌐"}
      </span>
      <select
        value={language}
        onChange={(e) => handleLanguageChange(e.target.value)}
        style={{
          backgroundColor: "transparent",
          color: "#0f172a",
          fontSize: "0.8125rem",
          fontWeight: 600,
          outline: "none",
          appearance: "none",
          WebkitAppearance: "none",
          cursor: "pointer",
          paddingRight: "1rem",
          border: "none",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2364748b'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0 center",
        }}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code} style={{ color: "#0f172a" }}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}
