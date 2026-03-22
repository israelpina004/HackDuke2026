import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import dbConnect, { withTimeout } from "@/lib/mongoose";
import User from "@/models/User";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth0.getSession();

  // Protect route: Redirect to login if unauthenticated
  if (!session?.user) {
    redirect("/auth/login");
  }

  // Guard: If user already has a profile in DB, they've been onboarded — send to dashboard
  try {
    await withTimeout(dbConnect(), 8000);
    const dbUser = await withTimeout(User.findOne({ auth0Id: session.user.sub }).lean(), 5000);
    if (dbUser) {
      redirect("/dashboard");
    }
  } catch (e) {
    console.error('[OnboardingLayout] DB error:', (e as Error).message);
    // Allow onboarding to proceed even if DB check fails
  }

  return <>{children}</>;
}

