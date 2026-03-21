import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

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
      <header className="bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold">C</div>
          <span className="font-bold text-xl text-slate-800 tracking-tight">Care Handoff</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600 hidden md:inline-block">
            {session.user.name || session.user.email}
          </span>
          <a href="/auth/logout" className="text-sm font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">
            Log Out
          </a>
        </div>
      </header>
      <main className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
