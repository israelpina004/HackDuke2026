export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Welcome to your Care Dashboard</h1>
        <p className="text-slate-500">
          This is a placeholder for the Dashboard view. Here we will display the Care Plan details, medication schedules, and the ElevenLabs daily briefing player.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-blue-500">
          <h2 className="font-semibold text-slate-800 mb-1">Medications</h2>
          <p className="text-sm text-slate-500">View upcoming scheduled doses.</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-red-500">
          <h2 className="font-semibold text-slate-800 mb-1">Red Flags</h2>
          <p className="text-sm text-slate-500">Critical symptoms to monitor.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-green-500">
          <h2 className="font-semibold text-slate-800 mb-1">Audio Briefing</h2>
          <p className="text-sm text-slate-500">Listen to today's medical summary.</p>
        </div>
      </div>
    </div>
  );
}
