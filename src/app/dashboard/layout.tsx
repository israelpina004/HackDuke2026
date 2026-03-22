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
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '2rem', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '28rem', border: '1px solid #e2e8f0' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>{t("connectionError")}</h1>
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>{t("unableToReachDatabase")}</p>
          <a href="/dashboard" style={{ display: 'inline-block', backgroundColor: '#0d9488', color: '#ffffff', padding: '0.5rem 1rem', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 500 }}>{t("retry")}</a>
        </div>
      </div>
    );
  }

  if (!dbUser) {
    redirect("/onboarding");
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <DashboardHeader userName={session.user.name || session.user.email || "Caregiver"} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', width: '100%', maxWidth: '100rem', marginLeft: 'auto', marginRight: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
