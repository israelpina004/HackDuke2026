"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, ArrowRight, Activity, Beaker, HeartHandshake } from "lucide-react";

export default function OnboardingPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Caregiver");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, role }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save profile.");
      }

      // Route based on role selection
      if (role === "Coordinator") {
        router.push("/dashboard"); // Later we can route coordinators to their own dashboard
      } else {
        router.push("/link"); // Caregivers should join a care plan next
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="absolute top-8 left-8 flex items-center gap-2">
         <Activity className="h-6 w-6 text-blue-600" />
         <span className="font-bold text-lg text-slate-800">Care Handoff</span>
      </div>

      <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-blue-50 blur-3xl"></div>
        
        <div className="relative">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
              <UserCircle size={28} strokeWidth={2.5} />
            </div>
          </div>
          
          <h1 className="text-3xl font-extrabold text-slate-800 text-center mb-2 tracking-tight">Complete Profile</h1>
          <p className="text-slate-500 text-center mb-8 leading-relaxed">
            Welcome! Please provide your details so your care team can reach you.
          </p>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-800"
                required
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-800"
                required
              />
            </div>
            
            <div className="pt-2">
              <span className="block text-sm font-semibold text-slate-700 mb-2">I am a:</span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("Caregiver")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                    role === "Caregiver" 
                      ? "bg-blue-50 border-blue-600 text-blue-700 shadow-sm" 
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <HeartHandshake size={18} />
                  <span className="font-semibold text-sm">Caregiver</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("Coordinator")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                    role === "Coordinator" 
                      ? "bg-blue-50 border-blue-600 text-blue-700 shadow-sm" 
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Beaker size={18} />
                  <span className="font-semibold text-sm">Coordinator</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm py-3 px-4 rounded-lg flex items-center justify-center border border-red-100 mt-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name || !phone}
              className="group w-full bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 py-4 rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 disabled:opacity-50 disabled:hover:shadow-none disabled:cursor-not-allowed transition-all duration-200 mt-2 active:scale-[0.98]"
            >
              {loading ? (
                <span className="animate-pulse">Saving...</span>
              ) : (
                <>
                  Continue <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
