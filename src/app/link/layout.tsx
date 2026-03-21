import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/mongoose";
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
  await dbConnect();
  const dbUser = await User.findOne({ auth0Id: session.user.sub });
  if (!dbUser) {
    redirect("/onboarding");
  }

  return <>{children}</>;
}
