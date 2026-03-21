import { auth0 } from '@/lib/auth0';

export default async function Home() {
  // v4 uses auth0.getSession() instead of the standalone getSession()
  const session = await auth0.getSession();
  const user = session?.user;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-50">
      <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-slate-800">Care Handoff Copilot</h1>
        
        {!user ? (
          <div>
            <p className="text-slate-600 mb-6">Please log in to view the dashboard.</p>
            {/* Note the updated URL below */}
            <a 
              href="/auth/login" 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Log In
            </a>
          </div>
        ) : (
          <div>
            <p className="text-slate-600 mb-4">Welcome back,</p>
            <h2 className="text-xl font-semibold text-slate-800 mb-6">{user.name || user.email}</h2>
            
            <div className="flex flex-col gap-3">
              <a 
                href="/dashboard" 
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Go to Dashboard
              </a>
              {/* Note the updated URL below */}
              <a 
                href="/auth/logout" 
                className="text-slate-500 hover:text-slate-800 transition-colors mt-4"
              >
                Log Out
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}