'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
    <div className="bg-gray-800 rounded-lg shadow-xl p-8">
      <h1 className="text-2xl font-bold text-white mb-2">Admin Login</h1>
      <p className="text-gray-400 mb-6">TV Chef Map Data Pipeline</p>

      {error === 'unauthorized' && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
          Access denied. Your email is not on the allowlist.
        </div>
      )}

      {message && (
        <div
          className={`mb-4 p-3 rounded text-sm ${
            message.type === 'success'
              ? 'bg-green-900/50 border border-green-700 text-green-200'
              : 'bg-red-900/50 border border-red-700 text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
        >
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>
      </form>

      <p className="mt-6 text-xs text-gray-500 text-center">
        Only authorized admin emails can access this area.
      </p>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <Suspense fallback={
          <div className="bg-gray-800 rounded-lg shadow-xl p-8 animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4 mb-6"></div>
            <div className="h-10 bg-gray-700 rounded mb-4"></div>
            <div className="h-10 bg-gray-700 rounded"></div>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
