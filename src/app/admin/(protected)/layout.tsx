import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminNav } from './AdminNav';
import { ChefHat, LogOut, User } from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Clean Header with Copper Accent */}
      <nav className="sticky top-0 z-50 bg-white border-b-4 border-copper-500 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/admin/review" className="flex items-center gap-3 group">
                <div className="p-2 bg-gradient-to-br from-copper-400 to-copper-600 rounded-lg shadow-lg shadow-copper-400/25 group-hover:shadow-copper-400/40 transition-shadow">
                  <ChefHat className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="font-display text-xl font-semibold text-slate-900 tracking-tight">
                    TV Chef Admin
                  </span>
                  <div className="font-ui text-xs text-slate-500 uppercase tracking-wide">
                    Data Pipeline
                  </div>
                </div>
              </Link>
              <AdminNav />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                <User className="w-4 h-4 text-slate-500" />
                <span className="font-ui text-slate-700 text-sm">{user.email}</span>
              </div>
              <form action="/admin/auth/signout" method="POST">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-3 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all text-sm font-ui"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}