import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import dbConnect, { withTimeout } from "@/lib/mongoose";
import CarePlan from "@/models/CarePlan";
import MessagePanel from "@/components/MessagePanel";
import PlanTabs from "@/components/PlanTabs";
import { ArrowLeft } from "lucide-react";

export default async function PlanMessagesPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const session = await auth0.getSession();
  if (!session?.user) redirect("/");

  const { planId } = await params;

  let plan;
  try {
    await withTimeout(dbConnect(), 8000);

    plan = await withTimeout(
      CarePlan.findOne({
        _id: planId,
        $or: [
          { coordinatorId: session.user.sub },
          { caregiverIds: session.user.sub },
        ],
      })
        .select("patientName")
        .lean(),
      5000
    );
  } catch (e) {
    console.error("[PlanMessagesPage] DB error:", (e as Error).message);
    return (
      <div className="w-full mx-auto space-y-6 p-8">
        <a href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={16} /> Back to Dashboard
        </a>
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <h1 className="text-xl font-bold text-slate-800 mb-2">Connection Error</h1>
          <p className="text-slate-500 mb-4">Unable to load this conversation. Please try again.</p>
          <a href={`/dashboard/plan/${planId}/messages`} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Retry</a>
        </div>
      </div>
    );
  }

  if (!plan) {
    redirect("/dashboard");
  }

  return (
    <div className="w-full mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <a
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </a>

      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">{plan.patientName}</h1>
        <PlanTabs planId={planId} activeTab="messages" />
      </div>

      <MessagePanel planId={planId} currentUserId={session.user.sub} />
    </div>
  );
}