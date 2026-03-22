"use client";

import { createContext, useContext, ReactNode } from "react";
import { translations, LanguageCode } from "./index";

interface LanguageContextType {
  language: LanguageCode;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ 
  children, 
  language 
}: { 
  children: ReactNode; 
  language: string 
}) {
  const code = (language as LanguageCode) || "en";
  
  const t = (key: string) => {
    return translations[code]?.[key] || translations["en"]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language: code, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
