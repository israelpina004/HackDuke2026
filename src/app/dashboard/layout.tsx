import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
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
  await dbConnect();
  const dbUser = await User.findOne({ auth0Id: session.user.sub });
  if (!dbUser) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardHeader userName={session.user.name || session.user.email || "Caregiver"} />
      <main className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
