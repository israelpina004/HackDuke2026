"use client";

import { Activity } from "lucide-react";

export default function AppHeader() {
  return (
    <a
      href="/dashboard"
      className="absolute top-8 left-8 flex items-center gap-2 transition-colors hover:text-slate-900"
    >
      <Activity className="h-6 w-6 text-blue-600" />
      <span className="font-bold text-lg text-slate-800">Handoff</span>
    </a>
  );
}
