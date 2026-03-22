"use client";

import { Activity } from "lucide-react";

export default function AppHeader() {
  return (
    <div className="absolute top-8 left-8 flex items-center gap-2">
      <Activity className="h-6 w-6 text-blue-600" />
      <span className="font-bold text-lg text-slate-800">Handoff</span>
    </div>
  );
}
