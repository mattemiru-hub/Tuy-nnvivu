import React, { useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { LogIn, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await getSupabase().auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-8 lg:p-12"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-100">
            <LogIn size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase mb-2">
            Lucky Draw
          </h1>
          <p className="text-slate-500 font-medium uppercase tracking-widest text-[10px]">
            Admin Authentication
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 text-sm animate-shake">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p className="font-bold">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-700"
                placeholder="admin@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-700"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-loose">
            Secure access for event organizers only.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
