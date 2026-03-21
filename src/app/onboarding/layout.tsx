import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";

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

  return <>{children}</>;
}
