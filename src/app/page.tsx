import { auth0 } from '@/lib/auth0';
import { cookies } from "next/headers";
import dbConnect, { withTimeout } from "@/lib/mongoose";
import User from "@/models/User";
import { translations, LanguageCode } from "@/translations";
import AppHeader from "@/components/AppHeader";

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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-50 relative">
      <AppHeader />

      <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full">
        <h1 className="text-3xl font-bold mb-4 text-slate-800">Handoff</h1>
        <p className="text-slate-600 font-medium mb-2">{t('landingTitle')}</p>
        <p className="text-slate-400 text-sm mb-8">{t('landingSubtitle')}</p>
        
        {!user ? (
          <div>
            <div className="flex flex-col gap-4">
              <a 
                href="/auth/login" 
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {t('getStarted')}
              </a>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-slate-600 mb-4">{t('welcomeBack')}</p>
            <h2 className="text-xl font-semibold text-slate-800 mb-6">{user?.name || user?.email}</h2>
            
            <div className="flex flex-col gap-3">
              <a 
                href="/dashboard" 
                className="bg-green-600 text-white text-center px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Dashboard
              </a>
              {canJoinPlan && (
                <a 
                  href="/link" 
                  className="bg-blue-100 text-blue-700 text-center px-6 py-3 rounded-lg font-medium hover:bg-blue-200 transition-colors"
                >
                  {t('joinPlan')}
                </a>
              )}
              <a 
                href="/auth/logout" 
                className="text-slate-500 hover:text-slate-800 transition-colors mt-4"
              >
                {t('logout')}
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}