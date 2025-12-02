'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/admin/auth/callback`,
      },
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Check your email for the login link!' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <div 
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          background: `
            linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)
          `
        }}
      >
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #e67e22 1px, transparent 1px),
              linear-gradient(to bottom, #e67e22 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px'
          }}
        />
        
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <div className="flex items-center gap-3 mb-16">
              <div className="w-10 h-10 bg-gradient-to-br from-copper-400 to-copper-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
                  <line x1="6" y1="17" x2="18" y2="17"/>
                </svg>
              </div>
              <span className="font-display text-2xl text-white font-semibold tracking-tight">
                Cheft
              </span>
            </div>
            
            <h1 className="font-display text-5xl lg:text-6xl text-white font-bold leading-[1.1] tracking-tight mb-6">
              Data Pipeline<br />
              <span className="text-copper-400">Command Center</span>
            </h1>
            
            <p className="font-ui text-slate-400 text-lg max-w-md leading-relaxed">
              Where culinary intelligence meets editorial precision. 
              Manage the definitive database of TV chef restaurants.
            </p>
          </div>
          
          <div className="grid grid-cols-3 gap-8 pt-12 border-t border-slate-700/50">
            <div>
              <div className="font-mono text-3xl font-bold text-copper-400 mb-1">311</div>
              <div className="font-ui text-xs uppercase tracking-widest text-slate-500">Restaurants</div>
            </div>
            <div>
              <div className="font-mono text-3xl font-bold text-copper-400 mb-1">180</div>
              <div className="font-ui text-xs uppercase tracking-widest text-slate-500">Chefs</div>
            </div>
            <div>
              <div className="font-mono text-3xl font-bold text-copper-400 mb-1">45</div>
              <div className="font-ui text-xs uppercase tracking-widest text-slate-500">States</div>
            </div>
          </div>
        </div>
      </div>

      <div 
        className="flex-1 flex items-center justify-center p-6 lg:p-12"
        style={{
          background: '#f8fafc',
          backgroundImage: `
            linear-gradient(to right, rgba(203, 213, 225, 0.5) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(203, 213, 225, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}
      >
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-copper-400 to-copper-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
                  <line x1="6" y1="17" x2="18" y2="17"/>
                </svg>
              </div>
              <span className="font-display text-xl text-slate-900 font-semibold">Cheft</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/60 border border-slate-200/80 p-8">
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl font-semibold text-slate-900 mb-2">Admin Login</h2>
              <p className="font-ui text-sm text-slate-500">Sign in with your email to continue</p>
            </div>

            {error === 'unauthorized' && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-ui font-medium text-red-800 text-sm">Access Denied</p>
                  <p className="font-ui text-red-600 text-sm mt-0.5">Your email is not authorized for admin access.</p>
                </div>
              </div>
            )}

            {message && (
              <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
                message.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-100'
                  : 'bg-red-50 border border-red-100'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                )}
                <p className={`font-ui text-sm ${message.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>
                  {message.text}
                </p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-ui font-medium text-slate-700 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-copper-500 focus:border-transparent transition-all text-sm font-ui"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-ui font-medium rounded-full transition-all text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending magic link...
                  </>
                ) : (
                  'Log In'
                )}
              </button>
            </form>

            <p className="text-center text-xs font-ui text-slate-400 mt-6">
              Admin access only. Unauthorized attempts are logged.
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs font-mono text-slate-400 tracking-wide">
              CHEFT • DATA PIPELINE v0.2
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex">
        <div className="hidden lg:block lg:w-1/2 bg-slate-900" />
        <div className="flex-1 bg-slate-50 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 animate-pulse">
              <div className="flex justify-center gap-2">
                <div className="h-10 w-24 bg-slate-200 rounded-full" />
                <div className="h-10 w-24 bg-slate-100 rounded-full" />
              </div>
              <div className="space-y-4">
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="h-12 bg-slate-100 rounded-xl" />
              </div>
              <div className="space-y-4">
                <div className="h-4 w-20 bg-slate-200 rounded" />
                <div className="h-12 bg-slate-100 rounded-xl" />
              </div>
              <div className="h-12 bg-slate-200 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
