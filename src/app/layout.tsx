import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/translations/LanguageContext";
import { cookies } from "next/headers";
import { LanguageCode } from "@/translations";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Handoff — Bridging Hospital to Home",
  description:
    "AI-powered discharge planning that bridges the gap between the hospital and the home. Multilingual care plans your family can actually understand.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value as LanguageCode) || "en";

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider language={locale}>
          <div
            style={{
              position: "fixed",
              zIndex: 9999,
              bottom: "24px",
              right: "24px",
            }}
          >
            <LanguageSwitcher />
          </div>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
