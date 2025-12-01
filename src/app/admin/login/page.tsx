'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ChefHat, Mail, ArrowRight, Loader2, AlertCircle, CheckCircle2, Shield, Database } from 'lucide-react';

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
    <div className="min-h-screen flex">
      {/* Dark Brand Panel */}
      <div className="flex-1 bg-slate-900 flex flex-col justify-center px-8 lg:px-12">
        <div className="max-w-lg">
          {/* Brand Header */}
          <div className="flex items-center gap-4 mb-12">
            <div className="p-4 bg-gradient-to-br from-copper-400 to-copper-600 rounded-xl shadow-lg shadow-copper-400/25">
              <ChefHat className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-white tracking-tight">
                TV Chef Map
              </h1>
              <p className="font-ui text-copper-100 text-lg">Data Pipeline</p>
            </div>
          </div>

          {/* Editorial Tagline */}
          <div className="space-y-6 text-slate-300">
            <p className="font-display text-xl leading-relaxed">
              The culinary data newsroom where every restaurant tells a story, 
              and every chef's journey becomes discoverable intelligence.
            </p>
            <div className="flex items-center gap-3 text-sm font-ui">
              <Database className="w-4 h-4 text-copper-400" />
              <span>Bloomberg Terminal meets Culinary Editorial</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mt-12 pt-12 border-t border-slate-700">
            <div className="text-center">
              <div className="font-mono text-2xl font-bold text-copper-400">311</div>
              <div className="font-ui text-xs uppercase tracking-wide text-slate-400">Restaurants</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-2xl font-bold text-copper-400">180</div>
              <div className="font-ui text-xs uppercase tracking-wide text-slate-400">Chefs</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-2xl font-bold text-copper-400">45</div>
              <div className="font-ui text-xs uppercase tracking-wide text-slate-400">States</div>
            </div>
          </div>
        </div>
      </div>

      {/* Light Form Panel */}
      <div className="flex-1 bg-slate-50 flex items-center justify-center px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div>
            <h2 className="font-display text-3xl font-semibold text-slate-900 mb-2">
              Admin Access
            </h2>
            <p className="font-ui text-slate-600">
              Secure authentication for data pipeline operations
            </p>
          </div>

          {/* Error Messages */}
          {error === 'unauthorized' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-ui font-medium text-red-800">Access Denied</p>
                <p className="font-ui text-red-600 text-sm mt-1">Your email is not authorized for admin access.</p>
              </div>
            </div>
          )}

          {message && (
            <div
              className={`p-4 rounded-lg flex items-start gap-3 ${
                message.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              )}
              <p className={`font-ui ${message.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>
                {message.text}
              </p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block font-ui text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-copper-500 focus:border-copper-500 transition-all font-ui"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-copper-500 to-copper-600 hover:from-copper-600 hover:to-copper-700 disabled:from-copper-300 disabled:to-copper-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all shadow-lg shadow-copper-500/25 hover:shadow-copper-500/40 font-ui"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  Send Magic Link
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="pt-6 border-t border-slate-200">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-ui">
              <Shield className="w-4 h-4" />
              <span>Restricted access • Admin authorization required</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex">
        <div className="flex-1 bg-slate-900 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-slate-700 rounded-xl animate-pulse" />
            <div className="h-8 bg-slate-700 rounded w-48 animate-pulse" />
            <div className="h-4 bg-slate-700 rounded w-32 animate-pulse" />
          </div>
        </div>
        <div className="flex-1 bg-slate-50 flex items-center justify-center">
          <div className="space-y-6 w-full max-w-md">
            <div className="h-8 bg-slate-200 rounded-lg w-1/2 animate-pulse" />
            <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse" />
            <div className="h-12 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-12 bg-slate-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}