import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import dbConnect, { withTimeout } from "@/lib/mongoose";
import User from "@/models/User";
import { getServerT, LanguageCode } from "@/translations";
import DashboardHeader from "./DashboardHeader";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth0.getSession();

  // Protect Dashboard: Redirect to login if user isn't authenticated
  if (!session?.user) {
    redirect("/auth/login");
  }

  // Progressive Profiling: Intercept users who haven't completed onboarding
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value as LanguageCode) || "en";
  const t = getServerT(locale);

  let dbUser;
  try {
    await withTimeout(dbConnect(), 8000);
    dbUser = await withTimeout(User.findOne({ auth0Id: session.user.sub }).lean(), 5000);
  } catch (e) {
    console.error('[DashboardLayout] DB error:', (e as Error).message);
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
          <h1 className="text-xl font-bold text-slate-800 mb-2">{t("connectionError")}</h1>
          <p className="text-slate-500 mb-4">{t("unableToReachDatabase")}</p>
          <a href="/dashboard" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">{t("retry")}</a>
        </div>
      </div>
    );
  }

  if (!dbUser) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardHeader userName={session.user.name || session.user.email || "Caregiver"} />
      <main className="flex-1 flex flex-col p-6 w-full mx-auto max-w-[1600px]">
        {children}
      </main>
    </div>
  );
}
