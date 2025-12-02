import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminNav } from './AdminNav';
import { LogOut, User } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-100" style={{
      backgroundImage: `
        linear-gradient(to right, rgba(203, 213, 225, 0.4) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(203, 213, 225, 0.4) 1px, transparent 1px)
      `,
      backgroundSize: '32px 32px'
    }}>
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/admin/review" className="flex items-center gap-3 group">
                <div className="w-9 h-9 bg-gradient-to-br from-copper-400 to-copper-600 rounded-lg flex items-center justify-center shadow-lg shadow-copper-400/20 group-hover:shadow-copper-400/30 transition-shadow">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
                    <line x1="6" y1="17" x2="18" y2="17"/>
                  </svg>
                </div>
                <div>
                  <span className="font-display text-lg font-semibold text-slate-900 tracking-tight">
                    Cheft
                  </span>
                  <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">
                    Admin v0.2
                  </div>
                </div>
              </Link>
              <AdminNav />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200">
                <User className="w-4 h-4 text-slate-400" />
                <span className="font-ui text-slate-600 text-sm">{user.email}</span>
              </div>
              <form action="/admin/auth/signout" method="POST">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-3 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all text-sm font-ui"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}