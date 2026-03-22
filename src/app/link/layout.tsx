import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import dbConnect, { withTimeout } from "@/lib/mongoose";
import User from "@/models/User";

export default async function LinkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth0.getSession();

  // Protect route: Redirect to login if unauthenticated
  if (!session?.user) {
    redirect("/auth/login");
  }

  // Progressive Profiling: Intercept users who haven't completed onboarding
  try {
    await withTimeout(dbConnect(), 8000);
    const dbUser = await withTimeout(User.findOne({ auth0Id: session.user.sub }).lean(), 5000);
    if (!dbUser) {
      redirect("/onboarding");
    }
  } catch (e) {
    console.error('[LinkLayout] DB error:', (e as Error).message);
    // Allow link page to render; the API call will validate the user
  }

  return <>{children}</>;
}
